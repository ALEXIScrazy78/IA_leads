"use client";
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: '¡Hola! Soy el asistente de J&A. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll optimizado
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chat, loading]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;
    
    const userMsg = message.trim(); // Sanitización básica quitando espacios inútiles
    
    // Capturamos el historial exacto que existe justo ANTES de añadir el nuevo mensaje
    const currentHistory = [...chat];

    // Actualizamos la UI inmediatamente añadiendo el mensaje del usuario
    setChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessage("");
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL_CHAT;
      
      // Enviamos el mensaje actual Y el historial previo al backend de FastAPI
      const res = await fetch(`${apiUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg,
          history: currentHistory 
        }),
      });

      if (!res.ok) throw new Error("Error en servidor");

      const data = await res.json();
      
      // Control de respuestas vacías del modelo por seguridad
      const botReply = data.response?.strip || data.response || data.reply || "Disculpa, no logré procesar tu solicitud. ¿Podrías repetirla?";
      setChat(prev => [...prev, { role: 'assistant', text: botReply }]);
    } catch (error) {
      setChat(prev => [...prev, { role: 'assistant', text: 'Lo siento, tengo problemas de conexión. Inténtalo más tarde.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] font-sans antialiased">
      {/* Botón Flotante con micro-interacción y paleta índigo */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`${isOpen ? 'bg-slate-900' : 'bg-indigo-600'} p-4 rounded-full shadow-2xl text-white hover:scale-110 active:scale-95 hover:rotate-12 transition-all duration-300 shadow-indigo-200`}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[530px] bg-white rounded-[2rem] shadow-2xl border border-slate-200/80 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
          
          {/* Header con Gradiente Premium Índigo */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-5 text-white font-bold flex items-center justify-between border-b border-indigo-900/20">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                <Bot size={20} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight">Asistente J&A</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <p className="text-[10px] text-slate-300 font-medium">IA en línea</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contenedor de Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'user' 
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none' 
                  : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            
            {/* NUEVO INDICADOR ANIMADO DE CARGA (Estilo ChatGPT) */}
            {loading && (
              <div className="flex justify-start items-center gap-1.5 bg-white border border-slate-100 px-4 py-3.5 rounded-2xl rounded-tl-none shadow-sm max-w-[70px]">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
              </div>
            )}
          </div>

          {/* Área de Entrada (Input integrado) */}
          <div className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
            <input 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading} // Evita la doble escritura durante la carga
              className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:bg-white text-slate-950 placeholder:text-slate-400 outline-none transition-all disabled:opacity-60"
              placeholder={loading ? "Esperando respuesta..." : "Escribe tu mensaje..."}
            />
            <button 
              onClick={sendMessage} 
              disabled={loading || !message.trim()}
              className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-lg shadow-indigo-100 disabled:shadow-none"
            >
              <Send size={18}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}