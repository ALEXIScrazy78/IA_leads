import os
import json
import re
import httpx
import threading
import resend
from fastapi import FastAPI, HTTPException, Depends
#from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import re
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configuración de Resend
resend.api_key = os.getenv("RESEND_API_KEY")

app = FastAPI(title="AI Lead Intelligence Engine")

# --- CORS CONFIG ---
#_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
#allowed_origins = [o.strip() for o in _raw_origins.split(",")]

#app.add_middleware(
#    CORSMiddleware,
#    allow_origins=allowed_origins,
#    allow_methods=["*"],
#    allow_headers=["*"],
#)


# --- CORS CONFIG ---
ALLOWED_ORIGIN_PATTERNS = [
    r"https://ia-leads.*\.vercel\.app$",
    r"http://localhost:\d+$",
    r"http://127\.0\.0\.1:\d+$",
    r"http://127\.0\.0\.1:\d+$",
    #LOCAL
    r"http://192\.168\.\d+\.\d+:\d+$",
]

def is_origin_allowed(origin: str) -> bool:
    return any(re.match(pattern, origin) for pattern in ALLOWED_ORIGIN_PATTERNS)

class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        allowed = is_origin_allowed(origin)

        if request.method == "OPTIONS":
            response = Response()
            if allowed:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Methods"] = "*"
                response.headers["Access-Control-Allow-Headers"] = "*"
            return response

        response = await call_next(request)
        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
        return response

app.add_middleware(DynamicCORSMiddleware)

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
            "probabilidad_cierre": 0.1, 
            "valor_estimado_usd": 0.0,
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

# --- ENDPOINT CORREGIDO ---
@app.post("/api/v1/leads")
async def registrar_y_clasificar(lead: LeadCreate, db: Client = Depends(get_supabase)):
    try:
        analisis = await analizar_lead_con_ia(lead.nombre, lead.mensaje, lead.empresa)

        # Armando el diccionario SIN la clave 'score_ia' hacia Supabase
        data_para_supabase = {
            "nombre_contacto": lead.nombre,
            "email": lead.email,
            "empresa": lead.empresa,
            "mensaje_original": lead.mensaje,
            "industria": analisis.get("industria"),
            "probabilidad_cierre": analisis.get("probabilidad_cierre"),
            "valor_estimado_usd": analisis.get("valor_estimado_usd"),
            "clasificacion": analisis.get("clasificacion"),
            "brief_comercial": analisis.get("brief_comercial"),
            "intencion_detectada": analisis.get("intencion_detectada"),
            "servicio_sugerido": analisis.get("servicio_sugerido")
        }

        response = db.table("prospectos").insert(data_para_supabase).execute()
        
        # El envío de correo ahora depende de la clasificación (hot/warm), que es más segura
        try:
            if analisis.get("clasificacion") in ["hot", "warm"] and analisis.get("propuesta_email") != "Error":
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
async def chat_asistente(payload: dict, db: Client = Depends(get_supabase)):
    api_key = os.getenv("OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    historial = payload.get("history", [])
    mensaje_usuario = payload.get("message", "")
    
    # Reconstruimos la conversación acumulada para que la IA la procese
    conversacion_txt = ""
    for msg in historial:
        rol = "Usuario" if msg["role"] == "user" else "Asistente"
        conversacion_txt += f"{rol}: {msg['text']}\n"
    conversacion_txt += f"Usuario: {mensaje_usuario}\n"

    # PROMPT ÚNICO: Le pedimos al modelo que responda al cliente Y extraiga los datos al mismo tiempo
    prompt_sistema = (
        "Eres el asistente experto de J&A Inteligencia, especialistas en automatización con IA, chatbots y análisis de datos. "
        "Reglas de comunicación con el cliente:\n"
        "1. Sé breve (máx 3 líneas), usa un tono corporativo pero cercano.\n"
        "2. Si el usuario muestra interés, pregúntale amablemente su nombre, correo, empresa y número de celular (opcional).\n"
        "3. Dile que un asesor se comunicará con él en las próximas horas.\n\n"
        "Regla técnica obligatoria (EXTRACCIÓN DE DATOS):\n"
        "Analiza el historial acumulado. Al final de tu respuesta para el usuario, debes agregar OBLIGATORIAMENTE la etiqueta [DATA] "
        "seguida de un objeto JSON con los datos que el usuario haya proporcionado hasta el momento (nombre, email, empresa, telefono). "
        "Si no ha proporcionado alguno de ellos, pon null.\n"
        "Ejemplo de formato de salida:\n"
        "Hola Pedro, claro que sí... [DATA]{\"nombre\": \"Pedro\", \"email\": \"pedro@mail.com\", \"empresa\": null, \"telefono\": null}"
    )

    try:
        async with httpx.AsyncClient() as client:
            # Una única petición a OpenRouter
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "nvidia/nemotron-3-super-120b-a12b:free",
                    "messages": [
                        {"role": "system", "content": prompt_sistema},
                        {"role": "user", "content": conversacion_txt} # Le pasamos el contexto completo aquí
                    ],
                    "temperature": 0.3 # Temperatura baja para mayor precisión en el JSON
                },
                timeout=15.0
            )
            
            res_json = response.json()
            
            # Verificación de seguridad para evitar el error 'choices' si la API falla
            if 'choices' not in res_json:
                print(f"Error de OpenRouter API: {res_json}")
                return {"response": "Estoy procesando la información. ¿Podrías repetirme tu mensaje?"}
                
            contenido_completo = res_json['choices'][0]['message']['content']

            # Separamos la respuesta que va al cliente de los datos ocultos [DATA]
            respuesta_web = contenido_completo
            datos_json_str = None
            
            if "[DATA]" in contenido_completo:
                partes = contenido_completo.split("[DATA]")
                respuesta_web = partes[0].strip()
                datos_json_str = partes[1].strip()

            # Procesamiento e inserción en Supabase si se detectaron los datos
            if datos_json_str:
                try:
                    datos_extraidos = json.loads(datos_json_str)
                    
                    def limpiar_valor(val):
                        if not val or str(val).strip().lower() in ["null", "none", "", "no especificada"]:
                            return None
                        return str(val).strip()

                    nombre = limpiar_valor(datos_extraidos.get("nombre"))
                    email = limpiar_valor(datos_extraidos.get("email"))
                    empresa = limpiar_valor(datos_extraidos.get("empresa"))
                    telefono = limpiar_valor(datos_extraidos.get("telefono"))

                    # Validación estricta: Nombre y Email son campos obligatorios
                    if nombre and email:
                        db.table("contactos_chatbot").insert({
                            "nombre": nombre,
                            "email": email,
                            "empresa": empresa if empresa else "No especificada",
                            "telefono": telefono,
                            "mensaje_original": f"[Conversación] {mensaje_usuario}"
                        }).execute()
                        print("¡ÉXITO: Lead completo guardado correctamente en Supabase!")
                    else:
                        print(f"INFO: Datos insuficientes para guardar en DB todavía (Nombre: {nombre}, Email: {email})")
                        
                except Exception as parse_err:
                    print(f"Error parseando el JSON interno de la respuesta: {parse_err}. Texto: {datos_json_str}")

            return {"response": respuesta_web}
            
    except Exception as e:
        print(f"Error general en el endpoint de chat: {e}")
        return {"response": "Tuve un pequeño inconveniente técnico. ¿Me podrías repetir tu consulta?"}


#CREACIÓN DE UN CRON PARA MANTENER ACTIVO SUPABASE
#@app.get("ehttps://tudominio.com/api/v1/health")
#def health_check(db: Client = Depends(get_supabase)):
#    """Endpoint Supabase activo."""
#    db.table("prospectos").select("id").limit(1).execute()
#    return {"status": "ok"}

#CHATBOT
#indexedDB.deleteDatabase('supabase.auth.token')