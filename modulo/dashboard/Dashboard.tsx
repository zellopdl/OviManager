
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sheep, Breed, Group, Status, BreedingPlan } from '../../types';
import { getHerdDailyInsights } from './geminiService';
import { entityService } from '../cadastros/entityService';

interface DashboardProps {
  sheep: Sheep[];
  breeds: Breed[];
  groups: Group[];
  plans?: BreedingPlan[];
  onRefresh?: () => void;
}

interface AIInsight {
  prioridade: 'alta' | 'media' | 'baixa';
  raca: string;
  categoria: string;
  titulo: string;
  descricao: string;
  fundamentacao: string;
  alvos: string[];
  fonte: string;
}

const Dashboard: React.FC<DashboardProps> = ({ sheep, breeds, groups, plans = [], onRefresh }) => {
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [dbStats, setDbStats] = useState({ piquetes: 0, fornecedores: 0, grupos: 0 });

  const loadDbStats = useCallback(async () => {
    const [p, f, g] = await Promise.all([
      entityService.getAll('piquetes').catch(() => []),
      entityService.getAll('fornecedores').catch(() => []),
      entityService.getAll('grupos').catch(() => [])
    ]);
    setDbStats({ piquetes: p.length, fornecedores: f.length, grupos: g.length });
    setIsReady(true);
  }, []);

  useEffect(() => {
    loadDbStats();
  }, [loadDbStats]);

  const fetchInsights = useCallback(async () => {
    if (sheep.length === 0) return;
    setLoadingInsights(true);
    try {
      const data = await getHerdDailyInsights(sheep);
      setAiInsights(data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingInsights(false); }
  }, [sheep]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  // Lógica de Alertas de Ciclo de 17 Dias (Macho fica 3 dias)
  const breedingAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);

    // Filtramos planos que não foram concluídos
    const activePlans = plans.filter(p => p.status !== 'concluido');

    return activePlans.map(plan => {
      // Usamos a data mais antiga da estação de monta (data de início)
      const start = new Date(plan.dataInicioMonta);
      start.setHours(0,0,0,0);
      
      const diffMs = today.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let currentCycle = 1;
      let status: 'macho_dentro' | 'macho_fora' = 'macho_fora';
      let message = "";
      let countdown = 0;

      // Definição das janelas biológicas (3 dias de monta a cada 17 dias)
      const cycleIntervals = [
        { start: 0, end: 3, label: '1ª Monta (Início)' },
        { start: 17, end: 20, label: '2ª Monta (Retorno de Cio)' },
        { start: 34, end: 37, label: '3ª Monta (Repasse Final)' }
      ];

      const activeCycleIdx = cycleIntervals.findIndex(c => diffDays >= c.start && diffDays < c.end);
      
      if (activeCycleIdx !== -1) {
        status = 'macho_dentro';
        currentCycle = activeCycleIdx + 1;
        countdown = cycleIntervals[activeCycleIdx].end - diffDays;
        message = `${cycleIntervals[activeCycleIdx].label}: O reprodutor deve estar no lote para cobertura.`;
      } else {
        status = 'macho_fora';
        const nextCycle = cycleIntervals.find(c => c.start > diffDays);
        if (nextCycle) {
          currentCycle = cycleIntervals.indexOf(nextCycle) + 1;
          countdown = nextCycle.start - diffDays;
          message = `Intervalo de Descanso: Aguardando 17 dias para retorno natural de cio (Ciclo ${currentCycle}).`;
        } else {
          message = "Estação finalizada no calendário biológico. Realize diagnóstico de toque/ultrassom.";
          countdown = 0;
        }
      }

      return { id: plan.id, nome: plan.nome, status, currentCycle, countdown, message, diffDays };
    });
  }, [plans]);

  const stats = {
    total: sheep.length,
    ativos: sheep.filter(s => s.status === Status.ATIVO).length,
    machos: sheep.filter(s => s.sexo === 'macho').length,
    femeas: sheep.filter(s => s.sexo === 'femea').length,
    mediaPeso: sheep.length > 0 ? sheep.reduce((acc, curr) => acc + curr.peso, 0) / sheep.length : 0,
  };

  const chartData = useMemo(() => {
    const distribution: Record<string, number> = {};
    sheep.filter(s => s.status === Status.ATIVO).forEach(s => {
      const name = groups.find(g => g.id === s.grupoId)?.nome || 'SEM LOTE';
      distribution[name] = (distribution[name] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [sheep, groups]);

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#ef4444'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. MONITORAMENTO REPRODUTIVO (DESTAQUE MÁXIMO) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Painel de Manejo Biológico</h3>
          </div>
          {onRefresh && (
            <button onClick={() => onRefresh()} className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-all">Sincronizar Lotes</button>
          )}
        </div>
        
        {breedingAlerts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {breedingAlerts.map(alert => (
              <div key={alert.id} className="bg-white rounded-[40px] border-2 border-slate-100 shadow-xl overflow-hidden group hover:border-indigo-200 transition-all">
                <div className="flex flex-col md:flex-row">
                  {/* Status Visual Lateral */}
                  <div className={`md:w-64 p-8 flex flex-col items-center justify-center text-center gap-3 transition-colors ${
                    alert.status === 'macho_dentro' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
                  }`}>
                    <span className="text-5xl drop-shadow-lg">{alert.status === 'macho_dentro' ? '🐏' : '⏳'}</span>
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">REPRODUTOR:</p>
                      <p className="text-xl font-black uppercase tracking-tight leading-none mt-1">{alert.status === 'macho_dentro' ? 'NO LOTE' : 'EM DESCANSO'}</p>
                    </div>
                  </div>

                  {/* Informações Centrais */}
                  <div className="flex-1 p-8 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-xl font-black uppercase text-slate-800 tracking-tight">{alert.nome}</h4>
                        <p className="text-[11px] font-bold text-slate-400 italic mt-0.5">Estação iniciada há {alert.diffDays} dias</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={`w-10 h-2 rounded-full transition-all ${
                            alert.currentCycle >= i ? (alert.status === 'macho_dentro' && alert.currentCycle === i ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-200') : 'bg-slate-200'
                          }`} title={`Ciclo ${i}`} />
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Diagnóstico Atual:</p>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase">
                          {alert.message}
                        </p>
                      </div>
                      <div className="shrink-0 bg-white px-8 py-5 rounded-[28px] border border-slate-100 shadow-sm text-center min-w-[140px]">
                        <p className="text-4xl font-black text-slate-800 leading-none">{alert.countdown}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Dias Restantes</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Memorial de Cálculo (Exigência do Operador) */}
                <div className="px-8 py-4 bg-indigo-50/30 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-600 uppercase flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-indigo-600 font-black">📖 MEMORIAL DE MANEJO:</span>
                    <span>O ciclo estral ovino médio é de 17 dias. Reapresentamos o macho no 17º dia após o início para cobrir fêmeas que não emprenharam na primeira monta. O macho deve permanecer 3 dias com o grupo para garantir a cobertura durante o cio.</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-[40px] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mb-4 grayscale opacity-40">🧬</div>
             <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Aguardando Estação de Monta</h4>
             <p className="text-[10px] text-slate-300 font-bold uppercase mt-2 max-w-xs leading-relaxed">Inicie um lote no "Hub de Reprodução" para que o sistema comece a calcular os ciclos biológicos e o repasse dos reprodutores.</p>
          </div>
        )}
      </section>

      {/* 2. Radar IA */}
      <section className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <span className="bg-indigo-600 text-white p-2 rounded-xl text-sm">🌍</span> Radar de Manejo IA
            </h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Sincronização biológica global</p>
          </div>
          <button onClick={fetchInsights} disabled={loadingInsights} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all">
            {loadingInsights ? 'Sincronizando...' : '🔄 Atualizar Radar'}
          </button>
        </div>

        {loadingInsights ? (
          <div className="flex flex-col items-center py-10 gap-3">
             <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Cruzando Linhagens...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiInsights.map((insight, idx) => (
              <div key={idx} onClick={() => setSelectedInsight(insight)} className={`p-5 rounded-[28px] border-2 cursor-pointer hover:shadow-xl transition-all group ${
                insight.prioridade === 'alta' ? 'bg-rose-50 border-rose-100' : insight.prioridade === 'media' ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'
              }`}>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase text-white mb-3 inline-block ${
                  insight.prioridade === 'alta' ? 'bg-rose-500' : insight.prioridade === 'media' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}>{insight.categoria}</span>
                <h4 className="font-black text-slate-800 text-xs uppercase mb-2 group-hover:text-indigo-600">{insight.titulo}</h4>
                <p className="text-slate-500 text-[10px] font-medium line-clamp-2 italic">{insight.descricao}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Stats Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {l:'Rebanho Ativo', v:stats.ativos, i:'✅', c:'text-emerald-600', bg:'bg-emerald-50'},
          {l:'Peso Médio', v:`${stats.mediaPeso.toFixed(1)}kg`, i:'⚖️', c:'text-blue-600', bg:'bg-blue-50'},
          {l:'Machos', v:stats.machos, i:'🧬', c:'text-indigo-600', bg:'bg-indigo-50'},
          {l:'Fêmeas', v:stats.femeas, i:'🎀', c:'text-pink-600', bg:'bg-pink-50'}
        ].map(s => (
          <div key={s.l} className={`p-5 rounded-3xl border shadow-sm ${s.bg} border-white/50`}>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-tighter">{s.l}</p>
            <div className="flex justify-between items-end">
              <h3 className={`text-2xl font-black ${s.c}`}>{s.v}</h3>
              <span className="text-xl opacity-30">{s.i}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Gráficos de Ocupação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm h-[380px]">
          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-[0.2em]">Ocupação de Pastagem por Lote</h4>
          {isReady && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'20px', border:'none', boxShadow:'0 10px 20px rgba(0,0,0,0.1)', fontSize:'10px'}} />
                <Bar dataKey="value" radius={[10,10,0,0]} barSize={50}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white">
          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-8">Integridade Sistêmica</h4>
          <div className="space-y-4">
            {[
              {l:'Piquetes', v:dbStats.piquetes, i:'🌾'},
              {l:'Raças', v:breeds.length, i:'🏷️'},
              {l:'Fornecedores', v:dbStats.fornecedores, i:'🚚'},
              {l:'Grupos', v:dbStats.grupos, i:'👥'}
            ].map(d => (
              <div key={d.l} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{d.i}</span>
                  <span className="text-[11px] font-black uppercase text-slate-400">{d.l}</span>
                </div>
                <span className="text-lg font-black text-emerald-400">{d.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Insight */}
      {selectedInsight && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className={`p-8 border-b ${selectedInsight.prioridade === 'alta' ? 'bg-rose-50' : 'bg-indigo-50'} flex justify-between items-start`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">{selectedInsight.categoria} • PRIORIDADE {selectedInsight.prioridade}</span>
                <h2 className="text-2xl font-black uppercase text-slate-800 leading-tight">{selectedInsight.titulo}</h2>
              </div>
              <button onClick={() => setSelectedInsight(null)} className="w-12 h-12 bg-white border rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all">✕</button>
            </div>
            <div className="p-8 max-h-[50vh] overflow-y-auto custom-scrollbar italic text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
              {selectedInsight.fundamentacao}
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase italic">Fonte: Inteligência Veterinária {selectedInsight.fonte}</span>
              <button onClick={() => setSelectedInsight(null)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-lg">Confirmar Leitura</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
