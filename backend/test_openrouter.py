import os
from dotenv import load_dotenv
import json
import httpx

async def analizar_lead_con_ia(nombre: str, mensaje: str, empresa: str = None):
    api_key = os.getenv("OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
 
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000", # Requerido por OpenRouter
        "X-Title": "Lead Engine"
    }
 
    prompt_usuario = f"Analiza este lead: {nombre}, {empresa}, {mensaje}. Responde en JSON."

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json={
                    # Cambiamos a un modelo más confiable para pruebas
                    "model": "google/gemini-2.0-flash-lite-preview-02-05:free",
                    "messages": [
                        {"role": "system", "content": "Eres un analista de ventas. Responde solo en JSON puro."},
                        {"role": "user", "content": prompt_usuario}
                    ],
                    "response_format": {"type": "json_object"}
                },
                timeout=20.0 # Aumentamos un poco el timeout
            )
            
            # --- SECCIÓN DE DIAGNÓSTICO ---
            if response.status_code != 200:
                print(f"❌ Error de Conexión: Status {response.status_code}")
                print(f"Cuerpo del error: {response.text}")
                return obtener_respuesta_error(f"Status {response.status_code}")

            result = response.json()
            
            if 'choices' not in result:
                print(f"❌ Respuesta sin 'choices'. JSON recibido: {result}")
                return obtener_respuesta_error("Sin choices")

            ai_content = result['choices'][0]['message']['content']
            return json.loads(ai_content)
 
    except httpx.ConnectError:
        print("❌ ERROR: No se pudo conectar a OpenRouter. ¿Tienes internet o un firewall bloqueando?")
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")
    
    return obtener_respuesta_error("Excepción")

def obtener_respuesta_error(motivo):
    """Retorna un dict por defecto para no romper el flujo de Supabase."""
    return {
        "industria": "Error",
        "tamano_empresa": motivo,
        "intencion_detectada": "Error",
        "score_ia": 0.0,
        "clasificacion": "error"
    }