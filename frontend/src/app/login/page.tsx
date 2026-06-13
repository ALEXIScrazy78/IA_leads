"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true); // Evita el parpadeo y bucles
  const router = useRouter();

  useEffect(() => {
    // Verificar si ya hay una sesión activa de forma inmediata al cargar
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/admin');
      } else {
        setIsChecking(false); // Si no hay sesión, libera la pantalla para mostrar el login
      }
    };
    
    checkSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/admin');
      } else {
        setIsChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError("Credenciales incorrectas o acceso denegado.");
        setLoading(false);
      } else if (data?.session) {
        router.push('/admin'); 
      }
    } catch (err) {
      setError("Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  // Si está verificando la sesión, muestra un spinner limpio en lugar de pantalla en blanco
  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-200">
              <Lock size={32} />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Acceso Admin</h2>
          <p className="text-slate-500 text-center text-sm mb-8">Lead Intelligence Center - J&A</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-1">Email Corporativo</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                  placeholder="admin@ja-inteligencia.com"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-1">Contraseña</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs font-bold border border-red-100 animate-in fade-in duration-200">
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-slate-300"
            >
              {loading ? "Verificando..." : "Entrar al Panel"}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protocolo de Seguridad J&A v2.0</p>
        </div>
      </div>
    </div>
  );
}