"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'
import { 
  Users, 
  TrendingUp,   
  Mail, 
  Briefcase, 
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function AdminDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    const { data, error } = await supabase
      .from('prospectos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setLeads(data);
    setLoading(false);
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header con Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Lead Intelligence Center</h1>
            <p className="text-slate-500">Gestión de prospectos analizados por IA (J&A)</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-xl"><Users className="text-green-600" /></div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total Leads</p>
                <p className="text-xl font-bold text-slate-900">{leads.length}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl"><TrendingUp className="text-blue-600" /></div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Hot Leads</p>
                <p className="text-xl font-bold text-slate-900">
                  {leads.filter(l => l.clasificacion === 'hot').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Leads */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Contacto / Empresa</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Análisis IA</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Brief Comercial</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                          {lead.nombre_contacto[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{lead.nombre_contacto}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Briefcase size={14} /> {lead.empresa || 'Independiente'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          lead.clasificacion === 'hot' 
                            ? 'bg-red-50 border-red-100 text-red-700' 
                            : lead.clasificacion === 'warm' 
                            ? 'bg-orange-50 border-orange-100 text-orange-700' 
                            : 'bg-slate-50 border-slate-100 text-slate-600'
                        }`}>
                          {lead.clasificacion?.toUpperCase()}
                        </span>
                        <p className="text-xs text-slate-400">Score: {(lead.score_ia * 100).toFixed(0)}%</p>
                      </div>
                    </td>
                    <td className="px-6 py-6 max-w-xs">
                      <p className="text-sm text-slate-600 line-clamp-2 italic">
                        "{lead.brief_comercial || 'No generado'}"
                      </p>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <button className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer de Seguridad */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <ShieldCheck size={16} />
          <span>Acceso restringido - Solo personal autorizado</span>
        </div>
      </div>
    </div>
  );
}