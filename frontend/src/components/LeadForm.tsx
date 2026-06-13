"use client";
import { useState } from 'react';
import { Send, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';

export default function LeadForm() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(false);
        setSuccess(false);
        setError(false);
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        const sanitizarTexto = (texto: string) => {
            if (!texto) return '';
            return texto.replace(/<[^>]*>/g, '').trim(); 
        };

        const payload = {
            nombre: sanitizarTexto(formData.get('nombre') as string),
            email: (formData.get('email') as string).trim().toLowerCase(),
            empresa: sanitizarTexto(formData.get('empresa') as string) || null,
            mensaje: sanitizarTexto(formData.get('mensaje') as string),
        };
        
        try {
            const res = await fetch(process.env.NEXT_PUBLIC_API_URL!, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setSuccess(true);
                (e.target as HTMLFormElement).reset();
            } else {
                setError(true);
            }
        } catch (error) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    // Estados de feedback (Éxito / Error) sincronizados con la paleta global
    if (success) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-xl text-center space-y-5 border border-emerald-100 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle className="text-emerald-500" size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-950 tracking-tight">¡Lead Procesado con éxito!</h2>
                <p className="text-slate-600 text-sm leading-relaxed">Nuestra IA está analizando tu perfil. Recibirás una respuesta personalizada en breve.</p>
                <button 
                    onClick={() => setSuccess(false)} 
                    className="inline-block w-full py-3 bg-slate-950 text-white font-semibold text-sm rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all"
                >
                    Enviar otra consulta
                </button>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-xl text-center space-y-5 border border-rose-100 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <AlertTriangle className="text-rose-500" size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-950 tracking-tight">Hubo un error</h2>
                <p className="text-slate-600 text-sm leading-relaxed">No pudimos conectar con el motor de IA. Por favor, inténtalo de nuevo más tarde.</p>
                <button 
                    onClick={() => setError(false)} 
                    className="inline-block w-full py-3 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
                >
                    Volver a intentar
                </button>
            </div>
        </div>
    );

    // Definición de estilos comunes para los inputs estilizados
    const inputStyles = "w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl " +
                        "placeholder:text-slate-400 text-slate-950 text-sm " + 
                        "focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:bg-white " + 
                        "outline-none transition-all duration-250 shadow-inner";

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans antialiased">
            <form onSubmit={handleSubmit} className="max-w-md w-full p-8 md:p-10 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Encabezado del Formulario */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-200">
                        <Sparkles className="text-white" size={26} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-950 tracking-tight bg-gradient-to-r from-slate-950 via-slate-800 to-indigo-950 bg-clip-text text-transparent">
                        J&A Intelligence
                    </h2>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                        Déjanos tus datos y tus requerimientos de proyecto para iniciar el análisis automático.
                    </p>
                </div>

                {/* Campos del Formulario */}
                <div className="space-y-4">
                    <input 
                        name="nombre" 
                        type="text"
                        placeholder="Nombre completo" 
                        required 
                        className={inputStyles} 
                    />
                    <input 
                        name="email" 
                        type="email" 
                        placeholder="Email corporativo" 
                        required 
                        className={inputStyles} 
                    />
                    <input 
                        name="empresa" 
                        type="text"
                        placeholder="Empresa (Opcional)" 
                        className={inputStyles} 
                    />
                    <textarea 
                        name="mensaje" 
                        placeholder="Describe tu proyecto o necesidad con detalles..." 
                        required 
                        className={`${inputStyles} h-36 resize-none`}
                    />
                </div>

                {/* Botón de Acción unificado con el ecosistema Índigo */}
                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold py-4 rounded-2xl hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.99] transition-all flex justify-center items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-indigo-100"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Procesando requerimientos...</span>
                        </>
                    ) : (
                        <><Send size={18} /> <span>Iniciar Proyecto</span></>
                    )}
                </button>

                {/* Pie de página sutil */}
                <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest pt-2">
                    powered by ©Alekey
                </p>
            </form>
        </div>
    );
}