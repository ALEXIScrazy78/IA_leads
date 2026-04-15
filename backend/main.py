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

# --- IA: ANÁLISIS + PROPUESTA SÓLIDA ---
async def analizar_lead_con_ia(nombre: str, mensaje: str, empresa: str = None):
    api_key = os.getenv("OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    prompt_sistema = (
        "Eres un consultor senior de Estrategia en IA en J&A Inteligencia. "
        "Tu objetivo es generar un análisis técnico y una propuesta comercial sólida."
    )

    prompt_usuario = f"""
    Prospecto: {nombre} | Empresa: {empresa if empresa else 'No especificada'}
    Mensaje: {mensaje}

    Devuelve un JSON exacto con:
    {{
        "industria": "string",
        "tamano_empresa": "string",
        "intencion_detectada": "string",
        "score_ia": float,
        "clasificacion": "hot, warm, cold",
        "brief_comercial": "Resumen técnico de 2 líneas para dashboard.",
        "propuesta_email": "Cuerpo de correo profesional con: 1. Saludo, 2. Diagnóstico del problema, 3. Solución técnica (IA), 4. Pasos a seguir (3 pasos), 5. CTA para reunión."
    }}
    """

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json={
                    "model": "nvidia/nemotron-3-super-120b-a12b:free",
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
        return {"score_ia": 0.1, "clasificacion": "error", "brief_comercial": "Error", "propuesta_email": "Error"}

# --- ENDPOINT ---
@app.post("/api/v1/leads")
async def registrar_y_clasificar(lead: LeadCreate, db: Client = Depends(get_supabase)):
    try:
        # 1. Ejecutar IA
        analisis = await analizar_lead_con_ia(lead.nombre, lead.mensaje, lead.empresa)

        # 2. Guardar en Supabase (Solo datos esenciales + brief corto)
        data_para_supabase = {
            "nombre_contacto": lead.nombre,
            "email": lead.email,
            "empresa": lead.empresa,
            "mensaje_original": lead.mensaje,
            "industria": analisis.get("industria"),
            "tamano_empresa": analisis.get("tamano_empresa"),
            "intencion_detectada": analisis.get("intencion_detectada"),
            "score_ia": analisis.get("score_ia"),
            "clasificacion": analisis.get("clasificacion"),
            "brief_comercial": analisis.get("brief_comercial")
        }

        # Insertamos y verificamos éxito
        response = db.table("prospectos").insert(data_para_supabase).execute()
        
        # 3. Envío de Email (ENVUELTO EN TRY PARA EVITAR ERROR 500)
        try:
            if analisis.get("score_ia", 0) > 0.3 and analisis.get("propuesta_email") != "Error":
                resend.Emails.send({
                    "from": "J&A Inteligencia <onboarding@resend.dev>",
                    "to": lead.email,
                    "subject": f"Propuesta IA: {lead.empresa or lead.nombre}",
                    "html": f"""
                        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                            {analisis['propuesta_email'].replace(chr(10), '<br>')}
                        </div>
                    """
                })
        except Exception as email_err:
            # Si el email falla (por ejemplo, dominio no verificado), el backend NO devuelve 500
            print(f"DEBUG: El correo no se envió pero el registro fue exitoso: {email_err}")

        return {
            "status": "success",
            "message": "Lead registrado correctamente",
            "data": response.data[0] if response.data else {}
        }

    except Exception as e:
        # Solo devolvemos 500 si falla algo realmente crítico (como la conexión a DB)
        print(f"ERROR CRÍTICO: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar el lead")


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