import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client
from dotenv import load_dotenv
import json
import httpx
import threading

load_dotenv()

app = FastAPI(title="AI Lead Intelligence Engine")
 
#CORS con orígenes desde variable de entorno
_raw_origins = os.getenv("ALLOWED_ORIGINS")
allowed_origins = [o.strip() for o in _raw_origins.split(",")]
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Singleton thread-safe para Supabase, sola instancia compartida
class SupabaseClient:
    _instance: Client | None = None
    _lock = threading.Lock()
 
    @classmethod
    def get_instance(cls) -> Client:
        if cls._instance is None:
            with cls._lock:                     # Solo un hilo entra a la vez
                if cls._instance is None:       # Double-checked locking
                    url = os.getenv("SUPABASE_URL")
                    key = os.getenv("SUPABASE_KEY")
                    if not url or not key:
                        raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_KEY en el .env")
                    cls._instance = create_client(url, key)
        return cls._instance
 
 
def get_supabase() -> Client:
    """Dependency de FastAPI — retorna siempre la misma instancia Singleton."""
    return SupabaseClient.get_instance()
 


async def analizar_lead_con_ia(nombre: str, mensaje: str, empresa: str = None):
    api_key = os.getenv("OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
 
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
 
    prompt_sistema = (
        "Eres un experto en análisis de ventas y marketing. Tu tarea es analizar los mensajes "
        "de leads entrantes y extraer información estructurada."
    )
 
    prompt_usuario = f"""
    Analiza este prospecto:
    Nombre: {nombre}
    Empresa: {empresa if empresa else 'No especificada'}
    Mensaje: {mensaje}
 
    Devuelve ÚNICAMENTE un objeto JSON con esta estructura:
    {{
        "industria": "string (ej. Tecnología, Salud, Construcción)",
        "tamano_empresa": "string (Pequeña, Mediana, Grande)",
        "intencion_detectada": "string (Consulta, Presupuesto, Queja, Alianza)",
        "score_ia": float (entre 0.0 y 1.0, donde 1 es alta probabilidad de cierre),
        "clasificacion": "string (hot, warm, cold)"
    }}
    """
 
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json={
                    "model": "stepfun/step-3.5-flash:free",
                    "messages": [
                        {"role": "system", "content": prompt_sistema},
                        {"role": "user", "content": prompt_usuario}
                    ],
                    "response_format": {"type": "json_object"}
                },
                timeout=15.0
            )
            result = response.json()
            ai_content = result['choices'][0]['message']['content']
            return json.loads(ai_content)
 
    except Exception as e:
        print(f"Error en OpenRouter: {e}")
        return {
            "industria": "Desconocida",
            "tamano_empresa": "Desconocido",
            "intencion_detectada": "No procesada",
            "score_ia": 0.0,
            "clasificacion": "error_ia"
        }
 
class LeadCreate(BaseModel):
    nombre: str
    email: EmailStr
    empresa: str | None = None
    mensaje: str


@app.get("/")
def root():
    return {"status": "AI Lead Intelligence Engine corriendo"}

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
            "tamano_empresa": analisis.get("tamano_empresa"),
            "intencion_detectada": analisis.get("intencion_detectada"),
            "score_ia": analisis.get("score_ia"),
            "clasificacion": analisis.get("clasificacion")
        }
 
        response = db.table("prospectos").insert(data_para_supabase).execute()
 
        return {
            "status": "success",
            "message": "Lead procesado con inteligencia artificial",
            "lead_id": response.data[0]['id'],
            "analisis": analisis
        }
 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 

#CREACIÓN DE UN CRON PARA MANTENER ACTIVO SUPABASE
#@app.get("ehttps://tudominio.com/api/v1/health")
#def health_check(db: Client = Depends(get_supabase)):
#    """Endpoint Supabase activo."""
#    db.table("prospectos").select("id").limit(1).execute()
#    return {"status": "ok"}