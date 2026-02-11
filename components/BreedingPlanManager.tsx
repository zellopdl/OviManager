
import React, { useState, useEffect, useMemo } from 'react';
import { BreedingPlan, Sheep, Sexo, BreedingCycleResult, BreedingPlanEwe, Status } from '../types';
import { breedingPlanService } from '../services/breedingPlanService';
import { sheepService } from '../services/sheepService';

interface BreedingPlanManagerProps {
  sheep: Sheep[];
  onRefresh: () => void;
}

const BreedingPlanManager: React.FC<BreedingPlanManagerProps> = ({ sheep, onRefresh }) => {
  const [plans, setPlans] = useState<BreedingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [nameWarning, setNameWarning] = useState<string | null>(null);
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  
  const [assignRamData, setAssignRamData] = useState<{planId: string, eweId: string, reprodutorId: string, date: string} | null>(null);
  const [moveEweData, setMoveEweData] = useState<{planId: string, eweId: string} | null>(null);

  const [newPlan, setNewPlan] = useState({
    nome: '',
    dataSincronizacao: new Date().toISOString().split('T')[0],
    dataInicioMonta: new Date().toISOString().split('T')[0],
    selectedEwes: [] as string[]
  });

  const loadPlans = async () => {
    try {
      const data = await breedingPlanService.getAll();
      setPlans(data || []);
    } catch (e) { 
      console.error("Erro ao carregar planos:", e); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const assignedEweIds = useMemo(() => {
    const ids = new Set<string>();
    plans.forEach(plan => {
      if (plan.ovelhas) {
        plan.ovelhas.forEach(ewe => {
          ids.add(ewe.eweId);
        });
      }
    });
    return ids;
  }, [plans]);

  const availableMatrizes = useMemo(() => 
    sheep.filter(s => 
      s.sexo === Sexo.FEMEA && 
      s.status === Status.ATIVO && 
      !s.prenha &&
      !assignedEweIds.has(s.id)
    ), 
  [sheep, assignedEweIds]);
  
  const reprodutores = useMemo(() => 
    sheep.filter(s => s.sexo === Sexo.MACHO && s.status === Status.ATIVO), 
  [sheep]);

  const handleNameChange = (val: string) => {
    const name = val.toUpperCase();
    setNewPlan({ ...newPlan, nome: name });
    const isDuplicate = plans.some(p => p.nome.trim().toUpperCase() === name.trim());
    if (isDuplicate && name.trim() !== '') {
      setNameWarning("⚠️ Já existe um lote com este nome!");
    } else {
      setNameWarning(null);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameWarning) return;
    if (newPlan.selectedEwes.length === 0) {
      alert("Selecione ao menos uma matriz para o lote.");
      return;
    }
    const ovelhasPayload: BreedingPlanEwe[] = newPlan.selectedEwes.map(id => ({
      eweId: id,
      cioDetectado: false,
      tentativas: 1,
      resultados: { 1: BreedingCycleResult.PENDENTE, 2: BreedingCycleResult.PENDENTE, 3: BreedingCycleResult.PENDENTE },
      finalizado: false
    }));
    try {
      setLoading(true);
      await breedingPlanService.create({
        nome: newPlan.nome,
        dataSincronizacao: newPlan.dataSincronizacao,
        dataInicioMonta: newPlan.dataInicioMonta,
        ovelhas: ovelhasPayload
      });
      setIsFormOpen(false);
      resetNewPlanForm();
      await loadPlans();
      onRefresh();
    } catch (e: any) { 
      alert("Erro ao criar plano: " + (e.message || "Erro desconhecido")); 
    } finally {
      setLoading(false);
    }
  };

  const resetNewPlanForm = () => {
    setNewPlan({ nome: '', dataSincronizacao: new Date().toISOString().split('T')[0], dataInicioMonta: new Date().toISOString().split('T')[0], selectedEwes: [] });
    setNameWarning(null);
  };

  const togglePlanExpansion = (id: string) => {
    const newSet = new Set(expandedPlanIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedPlanIds(newSet);
  };

  const handleDeletePlan = async (plan: BreedingPlan) => {
    if (plan.ovelhas && plan.ovelhas.length > 0) {
      alert("Este lote não pode ser excluído pois ainda contém animais. Remova todos os animais individualmente primeiro.");
      return;
    }
    if (!window.confirm(`Deseja realmente EXCLUIR o lote vazio "${plan.nome}"? Esta ação não pode ser desfeita.`)) return;
    setIsProcessingId(plan.id);
    try {
      await breedingPlanService.delete(plan.id);
      setPlans(prev => prev.filter(p => p.id !== plan.id));
      const newExp = new Set(expandedPlanIds);
      newExp.delete(plan.id);
      setExpandedPlanIds(newExp);
      onRefresh();
    } catch (e: any) {
      alert("Erro ao excluir lote do servidor.");
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleRemoveEweFromPlan = async (planId: string, eweId: string) => {
    const ewe = sheep.find(s => s.id === eweId);
    if (!window.confirm(`Deseja remover "${ewe?.nome}" deste lote? Ela voltará a ficar disponível para novos agrupamentos.`)) return;
    setIsProcessingId(planId);
    try {
      await breedingPlanService.removeEwe(planId, eweId);
      await loadPlans();
      onRefresh();
    } catch (e: any) {
      alert("Erro ao remover animal: " + e.message);
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleMoveEwe = async (targetPlanId: string) => {
    if (!moveEweData) return;
    try {
      await breedingPlanService.moveEwe(moveEweData.planId, targetPlanId, moveEweData.eweId);
      setMoveEweData(null);
      await loadPlans();
      onRefresh();
    } catch (e: any) {
      alert("Erro ao mover animal: " + e.message);
    }
  };

  const handleToggleCio = async (planId: string, eweId: string, detected: boolean) => {
    try {
      await breedingPlanService.confirmHeat(planId, eweId, detected);
      if (detected) {
        setAssignRamData({ planId, eweId, reprodutorId: '', date: new Date().toISOString().split('T')[0] });
      } else {
        setAssignRamData(null);
      }
      loadPlans();
    } catch (e: any) { 
      alert("Erro ao atualizar cio: " + e.message); 
    }
  };

  const handleSaveRam = async () => {
    if (!assignRamData || !assignRamData.reprodutorId || !assignRamData.date) {
      alert("Selecione o reprodutor e a data da monta.");
      return;
    }
    try {
      await breedingPlanService.assignRam(assignRamData.planId, assignRamData.eweId, assignRamData.reprodutorId, assignRamData.date);
      setAssignRamData(null);
      loadPlans();
    } catch (e: any) { 
      alert("Erro ao salvar reprodutor: " + e.message); 
    }
  };

  const handleUpdateCycle = async (planId: string, eweId: string, cycle: 1 | 2 | 3, result: BreedingCycleResult) => {
    try {
      await breedingPlanService.updateEweResult(planId, eweId, cycle, result);
      loadPlans();
      onRefresh();
    } catch (e: any) { 
      alert("Erro ao atualizar ciclo: " + e.message); 
    }
  };

  const handleDiscard = async (planId: string, eweId: string) => {
    if (window.confirm("Confirmar descarte definitivo desta matriz?")) {
      try {
        await breedingPlanService.discardEwe(planId, eweId);
        loadPlans();
        onRefresh();
      } catch (e: any) { 
        alert("Erro ao descartar: " + e.message); 
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Lotes de Monta e Observação</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Organização de Lotes e Registro de Cio Individual</p>
        </div>
        {availableMatrizes.length > 0 ? (
          <button onClick={() => { resetNewPlanForm(); setIsFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-900/10 transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest">
            ➕ Criar Novo Lote
          </button>
        ) : (
          <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="text-[14px]">🚫</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sem matrizes livres para novos lotes</span>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-xl animate-in zoom-in-95 duration-300">
          <form onSubmit={handleCreatePlan} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Nome do Lote *</label>
                <input required type="text" className={`w-full p-2.5 bg-slate-50 border ${nameWarning ? 'border-amber-400 focus:ring-amber-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-xl font-bold text-sm outline-none transition-all`} value={newPlan.nome} onChange={e => handleNameChange(e.target.value)} placeholder="Ex: LOTE PIQUETE 04 - VERÃO" />
                {nameWarning && <p className="text-[9px] text-amber-600 font-black uppercase mt-1 tracking-widest animate-pulse">{nameWarning}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Sincronização (Opcional)</label><input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" value={newPlan.dataSincronizacao} onChange={e => setNewPlan({...newPlan, dataSincronizacao: e.target.value})} /></div>
                <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Data Formação *</label><input required type="date" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" value={newPlan.dataInicioMonta} onChange={e => setNewPlan({...newPlan, dataInicioMonta: e.target.value})} /></div>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-[9px] font-black text-slate-500 uppercase mb-3 tracking-widest flex justify-between items-center">Disponíveis para Agrupamento ({availableMatrizes.length}) <button type="button" onClick={() => setNewPlan({...newPlan, selectedEwes: availableMatrizes.map(m => m.id)})} className="text-indigo-600 hover:underline">Selecionar Todas</button></h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-64 overflow-y-auto custom-scrollbar p-1">
                {availableMatrizes.length === 0 ? (
                  <div className="col-span-full py-8 text-center bg-white rounded-xl border border-dashed border-slate-200"><p className="text-[10px] font-black text-slate-300 uppercase">Todas as matrizes já estão em lotes.</p></div>
                ) : (
                  availableMatrizes.map(m => (
                    <label key={m.id} className={`flex flex-col items-center justify-center text-center p-3 rounded-xl border cursor-pointer transition-all ${newPlan.selectedEwes.includes(m.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                      <input type="checkbox" className="hidden" checked={newPlan.selectedEwes.includes(m.id)} onChange={e => { const selected = e.target.checked ? [...newPlan.selectedEwes, m.id] : newPlan.selectedEwes.filter(id => id !== m.id); setNewPlan({...newPlan, selectedEwes: selected}); }} />
                      <span className="text-[9px] font-black uppercase truncate w-full mb-0.5">{m.nome}</span>
                      <span className={`text-[8px] font-bold tracking-widest ${newPlan.selectedEwes.includes(m.id) ? 'text-indigo-200' : 'text-slate-400'}`}>#{m.brinco}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
              <button type="button" onClick={() => { setIsFormOpen(false); resetNewPlanForm(); }} className="px-5 py-2.5 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
              <button type="submit" disabled={!!nameWarning || !newPlan.nome.trim()} className={`px-8 py-2.5 text-white font-black rounded-xl shadow-lg uppercase text-[10px] tracking-widest active:scale-95 transition-all ${!!nameWarning || !newPlan.nome.trim() ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-slate-900'}`} >Salvar Lote</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Carregando lotes...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-[32px] p-16 text-center">
          <div className="text-4xl mb-4 opacity-30">📋</div>
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhum lote de observação ativo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => {
            const isExpanded = expandedPlanIds.has(plan.id);
            const isProcessing = isProcessingId === plan.id;
            const isEmpty = !plan.ovelhas || plan.ovelhas.length === 0;
            return (
              <div key={plan.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                <div onClick={() => togglePlanExpansion(plan.id)} className={`cursor-pointer p-4 flex justify-between items-center transition-colors ${isExpanded ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 hover:bg-slate-50'}`} >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}> {isProcessing ? '⏳' : '📋'} </div>
                    <div>
                      <h3 className={`font-black text-sm uppercase tracking-tight ${isExpanded ? 'text-white' : 'text-slate-800'}`}> {plan.nome} </h3>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${isExpanded ? 'text-indigo-300' : 'text-slate-400'}`}> {(plan.ovelhas || []).length} Matrizes • Criado em {plan.created_at ? new Date(plan.created_at).toLocaleDateString() : '-'} </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isEmpty && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan); }} className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-rose-900/30 text-rose-400 hover:bg-rose-900/50' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`} title="Excluir Lote Vazio"> 🗑️ </button>
                    )}
                    <span className={`text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}> {isExpanded ? '▲' : '▼'} </span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                            <th className="pb-3 pl-2">Matriz</th>
                            <th className="pb-3 text-center">Detecção de Cio</th>
                            <th className="pb-3 text-center">Macho & Data</th>
                            <th className="pb-3 text-center">Ciclos</th>
                            <th className="pb-3 text-center">Status</th>
                            <th className="pb-3 text-right pr-2">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(plan.ovelhas || []).map(item => {
                            const matriz = sheep.find(s => s.id === item.eweId);
                            const reprodutor = sheep.find(s => s.id === item.reprodutorId);
                            const isAssigning = assignRamData?.eweId === item.eweId && assignRamData?.planId === plan.id;
                            const isMoving = moveEweData?.eweId === item.eweId && moveEweData?.planId === plan.id;
                            return (
                              <tr key={item.eweId} className={`group ${item.finalizado ? 'opacity-60 grayscale bg-slate-50/50' : ''}`}>
                                <td className="py-4 pl-2"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${item.finalizado ? 'bg-emerald-500' : item.reprodutorId ? 'bg-indigo-500' : item.cioDetectado ? 'bg-purple-500' : 'bg-amber-400'}`}></span><div><p className="font-black text-slate-800 text-[11px] uppercase">{matriz?.nome || 'Matriz'}</p><p className="text-[9px] font-bold text-slate-400">#{matriz?.brinco || '-'}</p></div></div></td>
                                <td className="py-4 text-center"> {!item.finalizado && !item.reprodutorId ? ( <button onClick={() => handleToggleCio(plan.id, item.eweId, !item.cioDetectado)} className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all ${item.cioDetectado ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-inner' : 'bg-slate-100 text-slate-400 hover:bg-purple-50 hover:text-purple-400 border border-transparent'}`}> {item.cioDetectado ? '✅ Cio Detectado' : '⌛ Confirmar Cio'} </button> ) : ( <span className="text-[9px] font-black text-slate-300 uppercase italic">Fase Superada</span> )} </td>
                                <td className="py-4 text-center"> {isAssigning ? ( <div className="flex flex-col gap-1 max-w-[150px] mx-auto animate-in fade-in zoom-in-95 p-2 bg-indigo-50 rounded-xl border border-indigo-100"><select className="text-[10px] p-1.5 border rounded-lg bg-white font-bold" value={assignRamData.reprodutorId} onChange={e => setAssignRamData({...assignRamData, reprodutorId: e.target.value})}><option value="">Reprodutor...</option>{reprodutores.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select><input type="date" className="text-[10px] p-1.5 border rounded-lg bg-white" value={assignRamData.date} onChange={e => setAssignRamData({...assignRamData, date: e.target.value})} /><button onClick={handleSaveRam} className="bg-slate-900 text-white text-[8px] font-black py-1.5 rounded-lg uppercase tracking-widest mt-1">Salvar</button></div> ) : item.reprodutorId ? ( <div className="flex flex-col items-center"><span className="text-[10px] font-black text-slate-700 uppercase">{reprodutor?.nome || 'Macho'}</span><span className="text-[8px] font-bold text-slate-400 italic">{item.dataPrimeiraMonta ? new Date(item.dataPrimeiraMonta).toLocaleDateString() : '-'}</span></div> ) : item.cioDetectado ? ( <button onClick={() => setAssignRamData({ planId: plan.id, eweId: item.eweId, reprodutorId: '', date: new Date().toISOString().split('T')[0] })} className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 uppercase"> Escolher Macho </button> ) : ( <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest">Aguardando Cio</span> )} </td>
                                <td className="py-4 text-center"> {!item.reprodutorId ? ( <span className="text-[8px] font-black text-slate-100 uppercase tracking-widest">Bloqueado</span> ) : ( <div className="flex flex-col gap-2 items-center"><div className="flex justify-center gap-1"> {[1, 2, 3].map((cycle) => { const c = cycle as 1 | 2 | 3; const result = item.resultados[c]; const prevResult = c > 1 ? item.resultados[c-1 as 1|2] : null; const canClick = !item.finalizado && (c === 1 || prevResult === BreedingCycleResult.VAZIA); if (result !== BreedingCycleResult.PENDENTE) { return ( <div key={cycle} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${result === BreedingCycleResult.PRENHA ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600 shadow-inner'}`}> {result === BreedingCycleResult.PRENHA ? 'P' : 'V'} </div> ); } return ( <div key={cycle} className="flex gap-0.5"><button disabled={!canClick} onClick={() => handleUpdateCycle(plan.id, item.eweId, c, BreedingCycleResult.PRENHA)} className={`w-10 h-6 rounded text-[7px] font-black uppercase transition-all ${!canClick ? 'bg-slate-50 text-slate-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'}`}> Prenha </button><button disabled={!canClick} onClick={() => handleUpdateCycle(plan.id, item.eweId, c, BreedingCycleResult.VAZIA)} className={`w-10 h-6 rounded text-[7px] font-black uppercase transition-all ${!canClick ? 'bg-slate-50 text-slate-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100'}`}> Vazia </button></div> ); })} </div> </div> )} </td>
                                <td className="py-4 text-center"> {item.finalizado && item.resultados[3] === BreedingCycleResult.VAZIA ? ( <button onClick={() => handleDiscard(plan.id, item.eweId)} className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase shadow-lg shadow-rose-900/20 active:scale-95 transition-all"> ⚠️ Descartar </button> ) : item.finalizado ? ( <span className="text-[10px] font-black text-emerald-600 uppercase">Gestando 🚜</span> ) : item.reprodutorId ? ( <span className="text-[10px] font-black text-indigo-600 uppercase animate-pulse">Em Monta</span> ) : ( <span className="text-[10px] font-black text-slate-300 uppercase">Observação</span> )} </td>
                                <td className="py-4 pr-2 text-right"> <div className="flex justify-end gap-1.5"> {isMoving ? ( <div className="flex flex-col gap-1 p-2 bg-slate-100 rounded-xl animate-in zoom-in-95"><p className="text-[7px] font-black uppercase text-slate-500 mb-1">Mover para:</p><div className="flex flex-wrap gap-1 max-w-[150px]"> {plans.filter(p => p.id !== plan.id).map(p => ( <button key={p.id} onClick={() => handleMoveEwe(p.id)} className="px-2 py-1 bg-white border border-slate-200 rounded text-[7px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-colors"> {p.nome} </button> ))} </div><button onClick={() => setMoveEweData(null)} className="text-[7px] font-black text-rose-500 uppercase mt-1">Cancelar</button></div> ) : ( <> <button onClick={() => setMoveEweData({ planId: plan.id, eweId: item.eweId })} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Mover para outro lote"> 🚚 </button> <button onClick={() => handleRemoveEweFromPlan(plan.id, item.eweId)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors" title="Remover do lote e tornar disponível" > ❌ </button> </> )} </div> </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {isEmpty && <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-4"><p className="text-[10px] font-black text-slate-300 uppercase">Este lote está vazio. Use o botão da lixeira acima para removê-lo.</p></div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BreedingPlanManager;
