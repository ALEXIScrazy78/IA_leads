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

  // Auto-scroll 
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;
    
    const userMsg = message;
    setChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setChat(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch (error) {
      setChat(prev => [...prev, { role: 'assistant', text: 'Error de conexión.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 p-4 rounded-full shadow-2xl text-white hover:scale-110 active:scale-95 transition-all"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[350px] h-[450px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-blue-600 p-4 text-white font-bold flex items-center gap-2">
            <Bot size={20} /> Asistente Inteligente J&A
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-slate-400 animate-pulse">Escribiendo...</div>}
          </div>

          <div className="p-4 border-t bg-slate-50 flex gap-2">
            <input 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
              placeholder="Haz una pregunta..."
            />
            <button 
              onClick={sendMessage} 
              disabled={loading}
              className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:bg-slate-300"
            >
              <Send size={18}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}