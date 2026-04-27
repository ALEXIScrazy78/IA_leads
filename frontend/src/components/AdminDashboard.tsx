"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid, Cell
} from 'recharts';
import { 
  Users, TrendingUp, ChevronRight, X,
  ShieldCheck, LayoutDashboard, Target, Calendar, LogOut, Mail
} from 'lucide-react';

export default function AdminDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [timeData, setTimeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null); // Estado para el modal
  const router = useRouter();

  const COLORS = ['#ef4444', '#f59e0b', '#64748b'];

  useEffect(() => {
    const checkUserAndFetch = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        await fetchLeads();
      }
    };
    checkUserAndFetch();
  }, [router]);

  async function fetchLeads() {
    const { data, error } = await supabase
      .from('prospectos')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setLeads([...data].reverse());
      
      const groups = data.reduce((acc: any, lead: any) => {
        const date = new Date(lead.created_at).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short'
        });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.keys(groups).map(date => ({
        fecha: date,
        consultas: groups[date]
      }));
      
      setTimeData(chartData);
    }
    setLoading(false);
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getQualityStats = () => {
    const counts = { hot: 0, warm: 0, cold: 0 };
    leads.forEach(l => {
      const cat = l.clasificacion?.toLowerCase();
      if (cat === 'hot') counts.hot++;
      else if (cat === 'warm') counts.warm++;
      else counts.cold++;
    });
    return [
      { name: 'Hot', value: counts.hot },
      { name: 'Warm', value: counts.warm },
      { name: 'Cold', value: counts.cold },
    ];
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <LayoutDashboard className="text-blue-600" size={32} />
              J&A Intelligence
            </h1>
            <p className="text-slate-500 font-medium">Panel de Control de Prospectos</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg"><Users size={20} className="text-blue-600" /></div>
                    <div><p className="text-[10px] text-slate-400 font-black">LEADS</p><p className="text-lg font-bold">{leads.length}</p></div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg"><Target size={20} className="text-red-600" /></div>
                    <div><p className="text-[10px] text-slate-400 font-black">HOT</p><p className="text-lg font-bold">{leads.filter(l => l.clasificacion === 'hot').length}</p></div>
                </div>
            </div>
            <button onClick={handleSignOut} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-red-600 transition-all shadow-sm">
              <LogOut size={24} />
            </button>
          </div>
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-black text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-widest">
              <Calendar size={16} className="text-blue-500" /> Volumen de Consultas
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeData}>
                  <defs>
                    <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="consultas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorConsultas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-black text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-widest">
              <TrendingUp size={16} className="text-orange-500" /> Segmentación por Calidad
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getQualityStats()}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px' }} />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={40}>
                    {getQualityStats().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 tracking-tight">Leads Recientes</h2>
            <div className="flex gap-2">
                <span className="text-[10px] bg-green-50 text-green-600 px-3 py-1 rounded-full font-black border border-green-100 uppercase">Live</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prospecto</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score IA</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Análisis</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 uppercase">
                              {lead.nombre_contacto[0]}
                            </div>
                            <div>
                                <p className="text-slate-900 font-bold text-sm">{lead.nombre_contacto}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{lead.email}</p>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className={`px-2 py-1 inline-block rounded-lg text-[10px] font-black border ${
                        lead.clasificacion === 'hot' ? 'bg-red-50 border-red-100 text-red-600' :
                        lead.clasificacion === 'warm' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                        'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        {lead.clasificacion?.toUpperCase() || 'COLD'}
                      </div>
                    </td>
                    <td className="px-6 py-6 max-w-xs">
                        <p className="text-xs text-slate-500 line-clamp-1 italic">"{lead.brief_comercial || 'Sin análisis'}"</p>
                    </td>
                    <td className="px-6 py-6 text-right">
                       <button 
                        onClick={() => setSelectedLead(lead)}
                        className="p-2 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white rounded-xl transition-all shadow-sm"
                       >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE DETALLE (Fuera de la tabla para evitar bugs) */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-slate-200 flex flex-col scale-in-center">
            {/* Header del Modal */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border ${
                        selectedLead.clasificacion === 'hot' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-200 text-slate-600'
                    }`}>Prioridad {selectedLead.clasificacion}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{new Date(selectedLead.created_at).toLocaleDateString()}</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedLead.nombre_contacto}</h2>
                <p className="text-blue-600 font-bold text-sm">{selectedLead.empresa || 'Empresa Independiente'}</p>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-8 overflow-y-auto space-y-8">
              {/* Resumen de IA */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Industria</p>
                      <p className="text-sm font-bold text-slate-700">{selectedLead.industria || 'No detectada'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Servicio Sugerido</p>
                      <p className="text-sm font-bold text-slate-700">{selectedLead.servicio_sugerido || 'Consultoría General'}</p>
                  </div>
              </div>

              {/* Mensaje Original */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" /> Mensaje del Cliente
                </h4>
                <div className="p-5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-600 leading-relaxed shadow-inner">
                  "{selectedLead.mensaje_original}"
                </div>
              </div>

              {/* Brief Comercial */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Brief Ejecutivo</h4>
                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl text-sm text-slate-800 font-medium leading-relaxed">
                  {selectedLead.brief_comercial}
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">J&A Intelligence Protocol</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}