
import React, { useState, useEffect, useMemo } from 'react';
import { BreedingPlan, Sheep, Group, Sexo, Status, BreedingCycleResult } from '../../types';
import { breedingPlanService } from './breedingPlanService.ts';

interface BreedingPlanManagerProps {
  sheep: Sheep[];
  groups: Group[];
  onRefresh: () => void;
  managerPassword?: string;
}

const BreedingPlanManager: React.FC<BreedingPlanManagerProps> = ({ sheep, groups, onRefresh, managerPassword }) => {
  const [plans, setPlans] = useState<BreedingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [unlockedEwes, setUnlockedEwes] = useState<Set<string>>(new Set());
  const [eweToUnlock, setEweToUnlock] = useState<string | null>(null);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [newPlan, setNewPlan] = useState({
    nome: '',
    dataInicio: new Date().toISOString().split('T')[0],
    reprodutorId: ''
  });

  const effectivePassword = managerPassword || localStorage.getItem('ovi_manager_pwd') || '1234';

  const loadPlans = async () => {
    try {
      const data = await breedingPlanService.getAll();
      setPlans(data);
    } catch (e) {
      console.error("Erro ao carregar planos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId), [plans, selectedPlanId]);

  const vaziaGroupId = useMemo(() => {
    const found = (groups || []).find(g => ['VAZIA', 'VAZIAS', 'MATRIZES VAZIAS'].includes(g.nome.toUpperCase().trim()));
    return found?.id || null;
  }, [groups]);

  const reprodutorGroupId = useMemo(() => {
    const found = (groups || []).find(g => g.nome.toUpperCase().trim() === 'REPRODUTOR');
    return found?.id || null;
  }, [groups]);

  const availableMatrizes = useMemo(() => {
    if (!vaziaGroupId) return [];
    const assignedIds = new Set<string>();
    plans.forEach(p => p.ovelhas?.forEach(o => assignedIds.add(o.eweId)));
    return sheep.filter(s => 
      s.sexo === Sexo.FEMEA && 
      s.status === Status.ATIVO && 
      !s.prenha && 
      !assignedIds.has(s.id) &&
      s.grupoId === vaziaGroupId
    );
  }, [sheep, plans, vaziaGroupId]);

  const availableReprodutores = useMemo(() => {
    if (!reprodutorGroupId) return [];
    return sheep.filter(s => 
      s.sexo === Sexo.MACHO && 
      s.status === Status.ATIVO && 
      s.grupoId === reprodutorGroupId
    );
  }, [sheep, reprodutorGroupId]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.nome) return;
    setLoading(true);
    try {
      await breedingPlanService.create({
        nome: newPlan.nome.toUpperCase(),
        dataInicioMonta: newPlan.dataInicio,
        reprodutorId: newPlan.reprodutorId || undefined
      });
      setIsCreating(false);
      setNewPlan({ nome: '', dataInicio: new Date().toISOString().split('T')[0], reprodutorId: '' });
      await loadPlans();
      onRefresh();
    } catch (err) {
      alert("Erro ao criar estação.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEwe = async (eweId: string) => {
    if (!selectedPlanId) return;
    try {
      await breedingPlanService.addEwe(selectedPlanId, eweId);
      await loadPlans();
      onRefresh();
    } catch (err) {
      alert("Erro ao adicionar animal.");
    }
  };

  const handleRemoveEwe = async (loteOvelhaId: string, eweId: string) => {
    if (!selectedPlanId || !loteOvelhaId) return;
    if (confirm("CONFIRMAR REMOÇÃO?\nO animal sairá do lote e voltará para 'VAZIAS'.")) {
      try {
        setLoading(true);
        await breedingPlanService.removeEwe(loteOvelhaId, eweId, selectedPlanId);
        await loadPlans(); 
        onRefresh();
      } catch (err) {
        alert("Erro ao remover animal.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateResult = async (eweId: string, ciclo: 1|2|3, res: BreedingCycleResult) => {
    if (!selectedPlanId) return;
    try {
      await breedingPlanService.updateEweResult(selectedPlanId, eweId, ciclo, res);
      await loadPlans();
      onRefresh();
    } catch (err) {
      alert("Erro ao salvar diagnóstico.");
    }
  };

  const handleVerifyPassword = () => {
    if (passInput.trim() === effectivePassword.trim()) {
      if (eweToUnlock) {
        setUnlockedEwes(prev => new Set(prev).add(eweToUnlock));
        setEweToUnlock(null);
        setPassInput('');
      }
    } else {
      setPassError(true);
      setTimeout(() => setPassError(false), 1000);
    }
  };

  const getCycleResult = (ewe: any, cycle: number): BreedingCycleResult => {
    if (cycle === 1) return ewe.ciclo1;
    if (cycle === 2) return ewe.ciclo2;
    return ewe.ciclo3;
  };

  if (loading && plans.length === 0) return <div className="py-20 text-center text-slate-400 font-black uppercase text-xs">Sincronizando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Estações Ativas</h3>
        <button onClick={() => setIsCreating(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Nova Estação</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-[40px] border shadow-sm flex flex-col justify-between h-52 hover:border-indigo-400 transition-all">
            <div>
              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${p.status === 'em_monta' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {p.status === 'em_monta' ? 'Em Andamento' : 'Finalizada'}
              </span>
              <h4 className="mt-3 text-lg font-black uppercase text-slate-800">{p.nome}</h4>
              <div className="flex justify-between mt-1">
                 <p className="text-[10px] font-bold text-slate-400">Início: {new Date(p.dataInicioMonta).toLocaleDateString()}</p>
                 <p className="text-[10px] font-black text-indigo-600">{p.ovelhas?.length || 0} Matrizes</p>
              </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setSelectedPlanId(p.id)} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Gerenciar Lote</button>
               <button onClick={async () => { if(confirm("Excluir estação?")) { await breedingPlanService.delete(p.id); loadPlans(); onRefresh(); } }} className="p-3 text-rose-300 hover:text-rose-600">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-black uppercase text-slate-800 mb-6">Novo Lote</h3>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                 <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-sm" value={newPlan.nome} onChange={e => setNewPlan({...newPlan, nome: e.target.value})} placeholder="NOME DO LOTE" />
                 <div className="grid grid-cols-2 gap-4">
                    <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" value={newPlan.dataInicio} onChange={e => setNewPlan({...newPlan, dataInicio: e.target.value})} />
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" value={newPlan.reprodutorId} onChange={e => setNewPlan({...newPlan, reprodutorId: e.target.value})}>
                       <option value="">Reprodutor...</option>
                       {availableReprodutores.map(m => <option key={m.id} value={m.id}>{m.nome} (#{m.brinco})</option>)}
                    </select>
                 </div>
                 <div className="flex gap-2 pt-4">
                    <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-3 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
                    <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px]">Criar</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {selectedPlan && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[40px] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center shrink-0">
              <div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{selectedPlan.nome}</h3></div>
              <button onClick={() => setSelectedPlanId(null)} className="w-12 h-12 bg-white border rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all">✕</button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
               <div className="w-72 bg-slate-50 border-r p-6 overflow-y-auto custom-scrollbar flex flex-col">
                  <h4 className="text-[10px] font-black uppercase text-indigo-600 mb-4 tracking-widest">Vazias ({availableMatrizes.length})</h4>
                  <div className="flex-1 space-y-2">
                    {availableMatrizes.map(m => (
                      <button key={m.id} onClick={() => handleAddEwe(m.id)} className="w-full p-4 bg-white border rounded-2xl text-left hover:border-indigo-400 transition-all flex justify-between items-center shadow-sm group">
                         <div><p className="text-xs font-black uppercase text-slate-700">{m.nome}</p><p className="text-[8px] text-slate-400 font-bold tracking-widest">#{m.brinco}</p></div>
                         <span className="text-indigo-400 opacity-0 group-hover:opacity-100">＋</span>
                      </button>
                    ))}
                  </div>
               </div>

               <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-4">
                  {(selectedPlan.ovelhas || []).map(o => {
                    const matriz = sheep.find(s => s.id === o.eweId);
                    const isRowUnlocked = unlockedEwes.has(o.eweId);
                    const currentStatus = o.tentativas === 1 ? o.ciclo1 : o.tentativas === 2 ? o.ciclo2 : o.ciclo3;
                    
                    return (
                      <div key={o.id} className={`p-6 rounded-[32px] border flex flex-col md:flex-row items-center gap-8 shadow-sm transition-all ${
                        o.finalizado && !isRowUnlocked ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:shadow-lg'
                      }`}>
                         <div className="w-48 shrink-0">
                            <p className="text-sm font-black uppercase text-slate-800 truncate">{matriz?.nome || '?'}</p>
                            <p className="text-[9px] font-bold text-slate-400">#{matriz?.brinco || '?'}</p>
                            {o.finalizado && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className={`inline-block text-[7px] font-black uppercase px-2 py-1 rounded-lg ${isRowUnlocked ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                                  {isRowUnlocked ? '🔓 Editável' : 'Finalizado'}
                                </span>
                                {!isRowUnlocked && <button onClick={() => setEweToUnlock(o.eweId)} className="p-1.5 bg-rose-50 text-rose-500 rounded-lg shadow-sm active:scale-90 transition-all">🔒</button>}
                              </div>
                            )}
                         </div>

                         <div className="flex-1 grid grid-cols-3 gap-4 w-full">
                            {[1,2,3].map(c => {
                              const cycleValue = getCycleResult(o, c);
                              const isPrevVazia = c === 1 || getCycleResult(o, c-1) === BreedingCycleResult.VAZIA;
                              const isAccessible = o.tentativas >= c && isPrevVazia;

                              return (
                                <div key={c} className={`p-4 rounded-2xl border transition-all ${isAccessible ? 'bg-white border-slate-200' : 'bg-slate-50 opacity-30 pointer-events-none'}`}>
                                   <p className="text-[8px] font-black text-slate-400 uppercase text-center mb-3">{c}º CICLO</p>
                                   <select 
                                     disabled={(o.finalizado && !isRowUnlocked)}
                                     value={cycleValue} 
                                     onChange={(e) => handleUpdateResult(o.eweId, c as 1|2|3, e.target.value as any)}
                                     className={`w-full p-2.5 rounded-xl text-[9px] font-black uppercase outline-none transition-all cursor-pointer ${
                                        cycleValue === BreedingCycleResult.PRENHA ? 'bg-emerald-500 text-white' :
                                        cycleValue === BreedingCycleResult.VAZIA ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
                                     }`}
                                   >
                                      <option value={BreedingCycleResult.PENDENTE}>PENDENTE</option>
                                      <option value={BreedingCycleResult.PRENHA}>PRENHA ✅</option>
                                      <option value={BreedingCycleResult.VAZIA}>VAZIA ❌</option>
                                   </select>
                                </div>
                              );
                            })}
                         </div>
                         <button onClick={() => handleRemoveEwe(o.id, o.eweId)} className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-400 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">🗑️</button>
                      </div>
                    );
                  })}
               </div>
            </div>
            
            <div className="p-8 border-t bg-slate-50 flex justify-between items-center shrink-0">
               <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-[14px] font-black text-emerald-600">{(selectedPlan.ovelhas || []).filter(o => o.ciclo1 === BreedingCycleResult.PRENHA || o.ciclo2 === BreedingCycleResult.PRENHA || o.ciclo3 === BreedingCycleResult.PRENHA).length}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Confirmadas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-black text-rose-500">{(selectedPlan.ovelhas || []).filter(o => o.finalizado && o.ciclo3 === BreedingCycleResult.VAZIA).length}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Falhas</p>
                  </div>
               </div>
               <button onClick={() => setSelectedPlanId(null)} className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {eweToUnlock && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
           <div className={`bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border-2 ${passError ? 'border-rose-400 animate-shake' : 'border-slate-100'}`}>
              <div className="text-center mb-6">
                 <h4 className="text-xl font-black text-slate-800 uppercase">Acesso Restrito</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Senha do Gerente para editar ciclo finalizado.</p>
              </div>
              <input autoFocus type="password" placeholder="••••••••" className="w-full p-4 bg-slate-50 border rounded-2xl text-center font-black text-lg outline-none mb-4" value={passInput} onChange={e => setPassInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} />
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setEweToUnlock(null)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Sair</button>
                 <button onClick={handleVerifyPassword} className="py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px]">Liberar</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default BreedingPlanManager;
