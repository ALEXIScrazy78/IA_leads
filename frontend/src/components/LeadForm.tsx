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
        
        const payload = {
            nombre: formData.get('nombre'),
            email: formData.get('email'),
            empresa: formData.get('empresa') || null,
            mensaje: formData.get('mensaje'),
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

    // Estados de feedback (Éxito / Error)
    if (success) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl text-center space-y-4 border border-green-100">
                <CheckCircle className="mx-auto text-green-500" size={48} />
                <h2 className="text-2xl font-bold text-slate-900">¡Lead Procesado con éxito!</h2>
                <p className="text-slate-600">Nuestra IA está analizando tu perfil. Recibirás una respuesta personalizada en breve.</p>
                <button onClick={() => setSuccess(false)} className="text-blue-600 font-medium hover:underline hover:text-blue-700 transition-colors">Enviar otra consulta</button>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl text-center space-y-4 border border-red-100">
                <AlertTriangle className="mx-auto text-red-500" size={48} />
                <h2 className="text-2xl font-bold text-slate-900">Hubo un error</h2>
                <p className="text-slate-600">No pudimos conectar con el motor de IA. Por favor, inténtalo de nuevo más tarde.</p>
                <button onClick={() => setError(false)} className="text-blue-600 font-medium hover:underline hover:text-blue-700 transition-colors">Volver a intentar</button>
            </div>
        </div>
    );

    // Definición de estilos comunes para los inputs (Corregido según tu feedback)
    const inputStyles = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl " +
                        "placeholder:text-slate-500 text-slate-950 " + // Placeholder legible, Texto escrito negro intenso
                        "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white " + // Feedback visual al hacer foco
                        "outline-none transition-all duration-200";

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <form onSubmit={handleSubmit} className="max-w-md w-full p-10 bg-white rounded-3xl shadow-2xl border border-slate-100 space-y-8">
                
                {/* Encabezado del Formulario */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 border border-blue-100 shadow-inner">
                        <Sparkles className="text-blue-600" size={32} />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">
                        J&A
                    </h2>
                    <p className="text-slate-600 max-w-sm mx-auto">
                        Déjanos tus datos y tus requerimientos de proyecto.
                    </p>
                </div>

                {/* Campos del Formulario */}
                <div className="space-y-5">
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

                {/* Botón de Acción */}
                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-slate-950 text-white font-semibold py-4 rounded-2xl hover:bg-slate-800 active:scale-[0.98] transition-all flex justify-center items-center gap-3 disabled:opacity-60 disabled:cursor-not_allowed shadow-md hover:shadow-lg"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Analizando con IA...
                        </>
                    ) : (
                        <><Send size={20} /> Iniciar</>
                    )}
                </button>

                {/* Pie de página sutil */}
                <p className="text-center text-xs text-slate-400 pt-2">
                    ©Alekey
                </p>
            </form>
        </div>
    );
}