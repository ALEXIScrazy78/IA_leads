import os
from dotenv import load_dotenv
import httpx
# Forzamos la desactivación de proxies del sistema que podrían estar causando el conflicto
os.environ['NO_PROXY'] = '*' 

try:
    from supabase import create_client
    load_dotenv()
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    print(f"DEBUG: Versión de httpx instalada: {httpx.__version__}")
    
    client = create_client(url, key)
    print("¡ÉXITO! El cliente de Supabase se ha creado sin errores de proxy.")
    
except TypeError as e:
    print(f"Error de compatibilidad detectado: {e}")
except Exception as e:
    print(f"Otro error: {e}")