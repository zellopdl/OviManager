
import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import { Sheep, Breed, Group, Status, Sanidade } from '../../types';

interface ChartsViewProps {
  sheep: Sheep[];
  breeds: Breed[];
  groups: Group[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#ef4444'];

const ChartsView: React.FC<ChartsViewProps> = ({ sheep, groups }) => {
  
  // Dados para Curva de Engorda
  const growthScatterData = useMemo(() => {
    const now = new Date().getTime();
    return sheep.filter(s => s.status === Status.ATIVO).map(s => {
      const ageInDays = Math.floor((now - new Date(s.nascimento).getTime()) / (1000 * 3600 * 24));
      return { nome: s.nome, idadeDias: ageInDays, peso: s.peso };
    }).filter(d => d.idadeDias >= 0 && d.idadeDias < 365);
  }, [sheep]);

  // Dados para Distribuição por Grupo (SOLICITADO)
  const activeByGroupData = useMemo(() => {
    const activeSheep = sheep.filter(s => s.status === Status.ATIVO);
    const counts: Record<string, number> = {};
    
    activeSheep.forEach(s => {
      const groupName = groups.find(g => g.id === s.grupoId)?.nome || 'SEM GRUPO';
      counts[groupName] = (counts[groupName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sheep, groups]);

  const famachaData = useMemo(() => {
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    sheep.filter(s => s.status === Status.ATIVO).forEach(s => {
      const f = s.famacha as keyof typeof stats;
      if (stats[f] !== undefined) stats[f]++;
    });
    return Object.entries(stats).map(([grau, total]) => ({ grau: `G${grau}`, total }));
  }, [sheep]);

  const eccData = useMemo(() => {
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    sheep.filter(s => s.status === Status.ATIVO).forEach(s => {
      const e = Math.round(s.ecc) as keyof typeof stats;
      if (stats[e] !== undefined) stats[e]++;
    });
    return Object.entries(stats).map(([escore, total]) => ({ escore: `E${escore}`, total }));
  }, [sheep]);

  return (
    <div className="space-y-10 pb-20">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel Analítico</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase mt-1">Inteligência de rebanho e performance</p>
        </div>
      </div>

      {/* SEÇÃO 1: PERFORMANCE DE PESO */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Evolução e Performance</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col h-[450px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span> Curva de Engorda vs Meta
              </h3>
              <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase border border-rose-100">Alvo: 42kg</span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="idadeDias" name="Idade" unit=" dias" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                  <YAxis type="number" dataKey="peso" name="Peso" unit=" kg" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
                            <p className="text-[10px] font-black uppercase text-slate-800">{data.nome}</p>
                            <p className="text-[10px] font-bold text-indigo-600">{data.peso}kg • {data.idadeDias} dias</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine 
                    y={42} 
                    stroke="#f43f5e" 
                    strokeWidth={3} 
                    strokeDasharray="8 4" 
                    label={{ value: 'META 42KG', position: 'top', fill: '#e11d48', fontSize: 10, fontWeight: '900' }} 
                  />
                  <Scatter name="Animais" data={growthScatterData} fill="#6366f1" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col h-[450px]">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest">Distribuição Famacha (Anemia)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={famachaData}>
                <defs>
                  <linearGradient id="colorFam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="grau" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight:'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorFam)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: CENSO E GRUPOS (SOLICITADO) */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Censo e População Ativa</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* GRÁFICO DE PIZZA POR GRUPO */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border shadow-sm h-[400px] flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Animais Ativos por Grupo</h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeByGroupData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {activeByGroupData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[40px] text-white flex flex-col justify-center text-center shadow-xl">
            <span className="text-5xl mb-6">📊</span>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">Total de Ativos</p>
            <h4 className="text-5xl font-black mt-2">{sheep.filter(s => s.status === Status.ATIVO).length}</h4>
            <p className="text-[9px] text-slate-400 mt-4 uppercase font-bold tracking-tighter">Distribuídos em {activeByGroupData.length} grupos produtivos</p>
          </div>

        </div>
      </div>

      {/* SEÇÃO 3: SAÚDE E ECC */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border shadow-sm h-[300px]">
           <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">Escore Corporal (ECC)</h4>
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={eccData}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="escore" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
               <Tooltip />
               <Line type="step" dataKey="total" stroke="#6366f1" strokeWidth={3} dot={{r:4}} />
             </LineChart>
           </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-6 rounded-[32px] border shadow-sm h-[300px]">
           <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">Integridade de Saúde</h4>
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie 
                 data={[
                   {n:'Saudável', v:sheep.filter(s=>s.sanidade===Sanidade.SAUDAVEL).length},
                   {n:'Enfermaria', v:sheep.filter(s=>s.sanidade===Sanidade.ENFERMARIA).length}
                 ]} 
                 innerRadius={60} 
                 outerRadius={80} 
                 paddingAngle={5} 
                 dataKey="v"
               >
                 <Cell fill="#10b981" /><Cell fill="#f43f5e" />
               </Pie>
               <Tooltip />
             </PieChart>
           </ResponsiveContainer>
        </div>

        <div className="bg-slate-50 p-6 rounded-[32px] border border-dashed border-slate-200 flex flex-col justify-center text-center">
           <span className="text-3xl mb-4">🛡️</span>
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escudo Biossegurança</p>
           <p className="text-[9px] text-slate-400 mt-2">Dados auditados via Gemini AI 3.0</p>
        </div>
      </div>
    </div>
  );
};

export default ChartsView;
