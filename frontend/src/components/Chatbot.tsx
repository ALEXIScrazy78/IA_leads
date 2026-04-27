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
    
    const userMsg = message;
    setChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessage("");
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL_CHAT;
      
      const res = await fetch(`${apiUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!res.ok) throw new Error("Error en servidor");

      const data = await res.json();
      
      // Ajusta 'data.response' según lo que devuelva tu FastAPI
      setChat(prev => [...prev, { role: 'assistant', text: data.response || data.reply || "No entendi la respuesta" }]);
    } catch (error) {
      setChat(prev => [...prev, { role: 'assistant', text: 'Lo siento, tengo problemas de conexión. Inténtalo más tarde.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] font-sans">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`${isOpen ? 'bg-slate-800' : 'bg-blue-600'} p-4 rounded-full shadow-2xl text-white hover:scale-110 active:scale-95 transition-all duration-300`}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 p-5 text-white font-bold flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <Bot size={20} />
                </div>
                <div>
                    <p className="text-sm">Asistente J&A</p>
                    <p className="text-[10px] text-blue-100 font-normal">En línea ahora</p>
                </div>
            </div>
          </div>
          
          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-200/50 px-4 py-2 rounded-full text-[10px] text-slate-500 animate-pulse font-bold uppercase tracking-widest">
                  IA Analizando...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
            <input 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400"
              placeholder="Escribe tu mensaje..."
            />
            <button 
              onClick={sendMessage} 
              disabled={loading || !message.trim()}
              className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-lg shadow-blue-200 disabled:shadow-none"
            >
              <Send size={18}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}