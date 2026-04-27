import os
import json
import httpx
import threading
import resend
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configuración de Resend
resend.api_key = os.getenv("RESEND_API_KEY")

app = FastAPI(title="AI Lead Intelligence Engine")

# --- CORS CONFIG ---
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SUPABASE SINGLETON ---
class SupabaseClient:
    _instance: Client | None = None
    _lock = threading.Lock()
    @classmethod
    def get_instance(cls) -> Client:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    url = os.getenv("SUPABASE_URL")
                    key = os.getenv("SUPABASE_KEY")
                    cls._instance = create_client(url, key)
        return cls._instance

def get_supabase() -> Client:
    return SupabaseClient.get_instance()

# --- MODELOS ---
class LeadCreate(BaseModel):
    nombre: str
    email: EmailStr
    empresa: str | None = None
    mensaje: str

# --- IA: ANÁLISIS MEJORADO CON RÚBRICA ---
async def analizar_lead_con_ia(nombre: str, mensaje: str, empresa: str = None):
    api_key = os.getenv("OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    prompt_sistema = (
        "Eres un Analista Senior de Ventas y Revenue en J&A Inteligencia. "
        "Tu tarea es calificar leads, predecir su valor comercial y probabilidad de éxito."
    )

    prompt_usuario = f"""
    Analiza este prospecto:
    Nombre: {nombre} | Empresa: {empresa if empresa else 'No especificada'}
    Mensaje: {mensaje}

    SERVICIOS Y PRECIOS ESTIMADOS:(si el mensaje es irrelevante asigna $0)
    1. Automatización (RPA/IA): $200 - $500
    2. Chatbots Inteligentes: $150 - $350
    3. Análisis de Datos/Dashboards: $300 - $600
    4. Consultoría: $300+


    Calcula la 'probabilidad_cierre' (0.0 a 1.0) basado en la urgencia y claridad del mensaje.
    Estima el 'valor_estimado_usd' según el servicio que mejor encaje.
    
    Devuelve un JSON exacto:
    {{
        "industria": "string",
        "intencion_detectada": "string",
        "servicio_sugerido": "string",
        "score_ia": float,
        "probabilidad_cierre": float,
        "valor_estimado_usd": float,
        "clasificacion": "hot" | "warm" | "cold",
        "brief_comercial": "string",
        "propuesta_email": "string"
    }}
    """
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json={
                    "model": "nvidia/nemotron-3-nano-30b-a3b:free",
                    "messages": [
                        {"role": "system", "content": prompt_sistema},
                        {"role": "user", "content": prompt_usuario}
                    ],
                    "response_format": {"type": "json_object"}
                },
                timeout=25.0
            )
            result = response.json()
            content = result['choices'][0]['message']['content']
            return json.loads(content)
    except Exception as e:
        print(f"Error IA: {e}")
        return {
            "score_ia": 0.1, 
            "clasificacion": "cold", 
            "brief_comercial": "Error", 
            "propuesta_email": "Error"
        }

@app.get("/")
async def root():
    return {"message": "Bienvenido a la API de J&A Inteligencia. Visita /docs para la documentación."}

@app.get("/api/v1/status")
async def get_status():
    return {
        "status": "online",
        "message": "J&A Intelligence Engine is running",
        "version": "1.0.0"
    }

# ENDPOINT REGISTRAR 
@app.post("/api/v1/leads")
async def registrar_y_clasificar(lead: LeadCreate, db: Client = Depends(get_supabase)):
    try:
        analisis = await analizar_lead_con_ia(lead.nombre, lead.mensaje, lead.empresa)

        data_para_supabase = {
            "nombre_contacto": lead.nombre,
            "email": lead.email,
            "empresa": lead.empresa,
            "mensaje_original": lead.mensaje,
            "industria": analisis.get("industria"),
            "score_ia": analisis.get("score_ia"),
            "probabilidad_cierre": analisis.get("probabilidad_cierre"),
            "valor_estimado_usd": analisis.get("valor_estimado_usd"),
            "clasificacion": analisis.get("clasificacion"),
            "brief_comercial": analisis.get("brief_comercial"),
            "intencion_detectada": analisis.get("intencion_detectada"),
            "servicio_sugerido": analisis.get("servicio_sugerido")
        }

        response = db.table("prospectos").insert(data_para_supabase).execute()
        
        
        try:
            if analisis.get("score_ia", 0) > 0.4 and analisis.get("propuesta_email") != "Error":
                resend.Emails.send({
                    "from": "J&A Inteligencia <onboarding@resend.dev>",
                    "to": lead.email,
                    "subject": f"Análisis de Optimización para {lead.empresa or lead.nombre}",
                    "html": f"<div style='font-family:sans-serif;'>{analisis['propuesta_email'].replace(chr(10), '<br>')}</div>"
                })
        except Exception as email_err:
            print(f"Error Email: {email_err}")

        return {"status": "success", "data": response.data[0] if response.data else {}}

    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail="Error interno")

#----CHATBOT
@app.post("/api/v1/chat")
async def chat_asistente(payload: dict):
    api_key = os.getenv("OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    mensaje_usuario = payload.get("message", "")
    
    # Prompt de sistema optimizado para J&A Inteligencia
    prompt_sistema = (
        "Eres el asistente experto de J&A Inteligencia. Tu misión es asesorar sobre: "
        "1. Automatización de procesos con IA. 2. Desarrollo de Chatbots. 3. Análisis de datos. "
        "Reglas: Sé breve (máx 3 líneas), usa un tono corporativo pero cercano. "
        "Si preguntan precios, di que dependen del proyecto y que dejen sus datos en el formulario. "
        "IMPORTANTE: No inventes servicios que no sean de tecnología/IA."
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "nvidia/nemotron-3-super-120b-a12b:free",
                    "messages": [
                        {"role": "system", "content": prompt_sistema},
                        {"role": "user", "content": mensaje_usuario}
                    ],
                    "temperature": 0.7
                },
                timeout=15.0
            )
            result = response.json()
            return {"response": result['choices'][0]['message']['content']}
    except Exception as e:
        print(f"Error Chat: {e}")
        return {"response": "Estoy procesando mucha información. ¿Podrías repetirme tu duda?"}
    


#CREACIÓN DE UN CRON PARA MANTENER ACTIVO SUPABASE
#@app.get("ehttps://tudominio.com/api/v1/health")
#def health_check(db: Client = Depends(get_supabase)):
#    """Endpoint Supabase activo."""
#    db.table("prospectos").select("id").limit(1).execute()
#    return {"status": "ok"}