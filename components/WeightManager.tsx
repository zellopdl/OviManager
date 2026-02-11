
import React, { useState, useMemo } from 'react';
import { Sheep, Group, WeightHistory } from '../types';
import { sheepService } from '../services/sheepService';

interface WeightManagerProps {
  sheep: Sheep[];
  groups: Group[];
  onRefresh: () => void;
}

const WeightManager: React.FC<WeightManagerProps> = ({ sheep, groups, onRefresh }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [weighingDate, setWeighingDate] = useState(new Date().toISOString().split('T')[0]);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Filtra apenas grupos que possuem animais ativos para evitar pesar animais inativos
  const activeGroups = useMemo(() => {
    return groups.filter(g => 
      sheep.some(s => s.grupoId === g.id && s.status === 'ativo')
    );
  }, [groups, sheep]);

  const groupSheep = useMemo(() => {
    if (!selectedGroupId) return [];
    return sheep.filter(s => s.grupoId === selectedGroupId && s.status === 'ativo');
  }, [sheep, selectedGroupId]);

  const handleWeightChange = (sheepId: string, value: string) => {
    setWeights(prev => ({ ...prev, [sheepId]: value }));
  };

  const getStats = (s: Sheep, currentWeightStr: string) => {
    if (!currentWeightStr || isNaN(parseFloat(currentWeightStr))) return null;
    
    const currentWeight = parseFloat(currentWeightStr);
    const history = [...(s.historicoPeso || [])].sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );
    
    const lastRecord = history[0];
    
    // O peso anterior é o do último registro histórico OU o peso do cadastro se for a 1ª pesagem
    const lastWeight = lastRecord ? lastRecord.peso : s.peso;
    const lastDate = lastRecord ? new Date(lastRecord.data) : null; 
    const currentDate = new Date(weighingDate);
    
    if (lastWeight <= 0) return null;

    const weightDiff = currentWeight - lastWeight;
    const percentDiff = (weightDiff / lastWeight) * 100;
    
    // Só calculamos GMD (diário) se tivermos uma DATA anterior confiável (do histórico)
    let adg = null;
    let daysDiff = 0;

    if (lastDate) {
      const timeDiff = currentDate.getTime() - lastDate.getTime();
      daysDiff = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
      adg = daysDiff > 0 ? (weightDiff / daysDiff) : null;
    }

    return { weightDiff, percentDiff, daysDiff, adg, isInitial: !lastRecord };
  };

  const handleSaveAll = async () => {
    // Fixed: Added type casting to avoid "unknown" to "string" errors during filter
    const entries = Object.entries(weights).filter(([_, w]) => w && !isNaN(parseFloat(w as string)));
    if (entries.length === 0) {
      alert("Insira ao menos um peso válido.");
      return;
    }

    setIsSaving(true);
    try {
      // Passamos a weighingDate para que o histórico seja gravado com a data correta
      // Fixed: Added type casting for id and w to ensure they are treated as strings
      await Promise.all(entries.map(([id, w]) => 
        sheepService.update(id as string, { peso: parseFloat(w as string) }, weighingDate)
      ));
      
      alert(`Pesagem de ${entries.length} animais registrada com sucesso!`);
      setWeights({});
      onRefresh();
    } catch (error) {
      alert("Erro ao salvar pesagens.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Módulo de Pesagem</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Controle de Ganho Diário (GMD) por Lote Ativo</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lote Ativo</label>
            <select 
              className="w-full md:w-48 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">Selecionar Grupo...</option>
              {activeGroups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Pesagem</label>
            <input 
              type="date" 
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
              value={weighingDate}
              onChange={(e) => setWeighingDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {!selectedGroupId ? (
        <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-[32px] p-16 text-center">
          <div className="text-4xl mb-4 opacity-30">⚖️</div>
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Selecione um grupo para iniciar a pesagem dos ativos</p>
        </div>
      ) : groupSheep.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <p className="text-slate-400 font-bold uppercase text-[10px]">Nenhum animal ativo neste grupo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <div className="col-span-3">Animal</div>
            <div className="col-span-2 text-center">Peso Anterior</div>
            <div className="col-span-2 text-center">Peso Atual (kg)</div>
            <div className="col-span-5">Desempenho no Período</div>
          </div>

          <div className="space-y-2">
            {groupSheep.map(s => {
              const stats = getStats(s, weights[s.id] || '');
              const history = [...(s.historicoPeso || [])].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
              const lastRecord = history[0];
              const displayLastWeight = lastRecord ? lastRecord.peso : s.peso;

              return (
                <div key={s.id} className="bg-white p-4 lg:px-6 lg:py-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 items-center gap-4 transition-all hover:border-emerald-200">
                  <div className="col-span-3">
                    <h4 className="font-black text-slate-800 text-xs uppercase">{s.nome}</h4>
                    <p className="text-[10px] text-emerald-600 font-bold">#{s.brinco}</p>
                  </div>

                  <div className="col-span-2 text-center bg-slate-50 py-2 rounded-xl lg:bg-transparent">
                    <p className="text-[8px] lg:hidden font-black text-slate-400 uppercase mb-1">Anterior</p>
                    <p className="text-xs font-black text-slate-500">{displayLastWeight}kg</p>
                    <p className="text-[7px] font-black text-slate-300 uppercase mt-0.5">
                      {lastRecord ? new Date(lastRecord.data).toLocaleDateString() : 'Base Cadastro'}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-[8px] lg:hidden font-black text-slate-400 uppercase mb-1">Peso Hoje</p>
                    <input 
                      type="number" 
                      step="0.1"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-center text-sm focus:border-emerald-500 focus:bg-white transition-all"
                      placeholder="0.0"
                      value={weights[s.id] || ''}
                      onChange={(e) => handleWeightChange(s.id, e.target.value)}
                    />
                  </div>

                  <div className="col-span-5">
                    {stats ? (
                      <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-left-2">
                        <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${stats.weightDiff >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                          <span className="text-xs font-black">{stats.weightDiff >= 0 ? '+' : ''}{stats.weightDiff.toFixed(1)}kg</span>
                          <span className="text-[9px] font-bold opacity-80">({stats.percentDiff.toFixed(1)}%)</span>
                        </div>
                        
                        {stats.adg !== null ? (
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">GMD (Médio Diário)</span>
                            <span className={`text-[11px] font-black ${stats.adg >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {stats.adg >= 0 ? '📈' : '📉'} {(stats.adg * 1000).toFixed(0)}g / dia
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Primeira Medição</span>
                            <span className="text-[9px] font-bold text-slate-300 italic">GMD na próxima pesagem</span>
                          </div>
                        )}
                        
                        <div className="ml-auto text-right text-[8px] font-black text-slate-300 uppercase">
                          {stats.daysDiff > 0 ? `${stats.daysDiff} dias` : 'Hoje'}
                        </div>
                      </div>
                    ) : (
                      <div className="h-10 flex items-center text-slate-300 italic text-[10px]">
                        Informe o peso para ver o desempenho...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-4 md:static pt-6">
            <button 
              onClick={handleSaveAll}
              disabled={isSaving || Object.keys(weights).length === 0}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                isSaving || Object.keys(weights).length === 0 
                  ? 'bg-slate-300 text-white cursor-not-allowed' 
                  : 'bg-slate-900 text-white hover:bg-black'
              }`}
            >
              {isSaving ? 'Gravando...' : '💾 Salvar Lote de Pesagem'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightManager;
