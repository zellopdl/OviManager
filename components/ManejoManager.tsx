
import React, { useState, useEffect, useMemo } from 'react';
import { Manejo, Sheep, TipoManejo, StatusManejo, Paddock, Group, Recorrencia, RecorrenciaConfig } from '../types';
import { manejoService } from '../services/manejoService';
import { sheepService } from '../services/sheepService';
import { TIPO_MANEJO_OPTIONS, RECORRENCIA_OPTIONS } from '../constants';
import { getLocalDateString, parseLocalDate, formatBrazilianDate, addDaysLocal } from '../utils';
import ManejoCalendar from './ManejoCalendar';

interface ManejoDistribution {
  paddocks: [string, number][];
  groups: [string, number][];
}

interface ManejoManagerProps {
  sheep: Sheep[];
  paddocks: Paddock[];
  groups: Group[];
  onRefreshSheep: () => void;
  managerPassword: string;
}

const ManejoManager: React.FC<ManejoManagerProps> = ({ sheep, paddocks, groups, onRefreshSheep, managerPassword }) => {
  const [manejos, setManejos] = useState<Manejo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentManejo, setCurrentManejo] = useState<Manejo | null>(null);
  const [selectionMode, setSelectionMode] = useState<'individual' | 'group' | 'none'>('none');

  const [isExecModalOpen, setIsExecModalOpen] = useState(false);
  const [execData, setExecData] = useState({
    dataExecucao: getLocalDateString(),
    obsExecucao: '',
    updateHealth: false,
    peso: '',
    famacha: 1,
    ecc: 3,
    prenha: false,
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authAction, setAuthAction] = useState<{ type: 'edit' | 'delete', manejo: Manejo } | null>(null);
  const [pwdInput, setPwdInput] = useState('');
  
  const [filter, setFilter] = useState<StatusManejo | 'todos' | 'futuros'>(StatusManejo.PENDENTE);

  const [formData, setFormData] = useState({
    titulo: '',
    tipo: TipoManejo.RECORRENTE,
    recorrencia: Recorrencia.NENHUMA,
    recorrenciaConfig: {
      diasSemana: [] as number[],
      diasMes: [] as number[],
      mesesAnual: [] as number[],
      intervaloDiario: 1,
      duracaoValor: null as number | null,
      dataInicioReferencia: '',
      contagem: 0
    },
    dataPlanejada: getLocalDateString(),
    horaPlanejada: '08:00',
    colaborador: '',
    procedimento: '',
    observacoes: '',
    selectedSheep: [] as string[],
    grupoId: '' as string
  });

  const loadManejos = async () => {
    try {
      setLoading(true);
      const data = await manejoService.getAll();
      setManejos(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadManejos(); }, []);

  const activeSheep = useMemo(() => sheep.filter(s => s.status === 'ativo'), [sheep]);

  const handleSelectionModeChange = (mode: 'individual' | 'group' | 'none') => {
    setSelectionMode(mode);
    setFormData(prev => ({
      ...prev,
      grupoId: mode === 'group' ? prev.grupoId : '',
      selectedSheep: mode === 'individual' ? prev.selectedSheep : []
    }));
  };

  const toggleDay = (day: number) => {
    setFormData(prev => {
      const currentDays = prev.recorrenciaConfig.diasSemana || [];
      const newDays = currentDays.includes(day) ? currentDays.filter(d => d !== day) : [...currentDays, day];
      return { ...prev, recorrenciaConfig: { ...prev.recorrenciaConfig, diasSemana: newDays } };
    });
  };

  const calculateNextDate = (currentDateStr: string, recorrencia: Recorrencia, config: RecorrenciaConfig): string | null => {
    if (recorrencia === Recorrencia.DIARIA) { 
      return addDaysLocal(currentDateStr, config.intervaloDiario || 1);
    }
    
    const date = parseLocalDate(currentDateStr);
    if (!date) return null;

    if (recorrencia === Recorrencia.SEMANAL && config.diasSemana && config.diasSemana.length > 0) {
      for (let i = 1; i <= 7; i++) {
        const test = parseLocalDate(addDaysLocal(currentDateStr, i));
        if (test && config.diasSemana.includes(test.getDay())) return getLocalDateString(test);
      }
    }
    
    if (recorrencia === Recorrencia.MENSAL && config.diasMes && config.diasMes.length > 0) {
      const dayTarget = config.diasMes[0];
      for (let i = 0; i <= 12; i++) {
        const nextM = new Date(date.getFullYear(), date.getMonth() + i, dayTarget, 12, 0, 0);
        const nextS = getLocalDateString(nextM);
        if (nextS > currentDateStr.split('T')[0]) return nextS;
      }
    }

    if (recorrencia === Recorrencia.ANUAL && config.mesesAnual && config.mesesAnual.length > 0) {
       const sortedMonths = [...config.mesesAnual].sort((a, b) => a - b);
       for (let i = 0; i <= 24; i++) {
         const nextM = new Date(date.getFullYear(), date.getMonth() + i, 1, 12, 0, 0);
         if (sortedMonths.includes(nextM.getMonth())) {
           const nextS = getLocalDateString(nextM);
           if (nextS > currentDateStr.split('T')[0]) return nextS;
         }
       }
    }

    return null;
  };

  const dateValidation = useMemo(() => {
    if (formData.recorrencia === Recorrencia.NENHUMA) return { isValid: true };
    const date = parseLocalDate(formData.dataPlanejada);
    if (!date) return { isValid: false, message: "Data inválida." };
    const config = formData.recorrenciaConfig;

    if (formData.recorrencia === Recorrencia.SEMANAL && config.diasSemana?.length) {
      if (!config.diasSemana.includes(date.getDay())) {
        return { isValid: false, message: "A data escolhida não cai em um dos dias da semana selecionados." };
      }
    }
    if (formData.recorrencia === Recorrencia.MENSAL && config.diasMes?.length) {
      if (date.getDate() !== config.diasMes[0]) {
        return { isValid: false, message: `A data escolhida não coincide com o dia ${config.diasMes[0]} do mês.` };
      }
    }
    if (formData.recorrencia === Recorrencia.ANUAL && config.mesesAnual?.length) {
      if (!config.mesesAnual.includes(date.getMonth())) {
        return { isValid: false, message: "O mês escolhido não faz parte dos meses programados para esta tarefa." };
      }
    }
    return { isValid: true };
  }, [formData.dataPlanejada, formData.recorrencia, formData.recorrenciaConfig]);

  const autoAdjustDate = () => {
    const nextValid = calculateNextDate(formData.dataPlanejada, formData.recorrencia, formData.recorrenciaConfig);
    if (nextValid) setFormData({ ...formData, dataPlanejada: nextValid });
  };

  const handleSelectAllActive = () => {
    setFormData({ ...formData, selectedSheep: activeSheep.map(s => s.id) });
  };

  const handleClearSelection = () => {
    setFormData({ ...formData, selectedSheep: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateValidation.isValid) return;

    try {
      const config = { ...formData.recorrenciaConfig };
      if (!isEditing) {
        config.dataInicioReferencia = formData.dataPlanejada;
        config.contagem = 0;
      }
      const base = {
        titulo: formData.titulo.toUpperCase(), 
        tipo: formData.tipo,
        recorrencia: formData.recorrencia,
        recorrenciaConfig: config,
        dataPlanejada: formData.dataPlanejada,
        horaPlanejada: formData.horaPlanejada,
        colaborador: formData.colaborador.toUpperCase(),
        status: StatusManejo.PENDENTE, 
        procedimento: formData.procedimento,
        observacoes: formData.observacoes.toUpperCase(),
        grupoId: selectionMode === 'group' ? formData.grupoId : undefined
      };
      const targetSheepIds = selectionMode === 'individual' ? formData.selectedSheep : [];
      if (isEditing && currentManejo) await manejoService.update(currentManejo.id, base, targetSheepIds);
      else await manejoService.create(base, targetSheepIds);
      setIsFormOpen(false); resetForm(); loadManejos();
    } catch (e: any) { alert("Erro ao salvar: " + (e.message || "Erro de conexão")); }
  };

  const resetForm = () => {
    setFormData({ 
      titulo: '', tipo: TipoManejo.RECORRENTE, recorrencia: Recorrencia.NENHUMA,
      recorrenciaConfig: { diasSemana: [], diasMes: [], mesesAnual: [], intervaloDiario: 1, duracaoValor: null, dataInicioReferencia: '', contagem: 0 },
      dataPlanejada: getLocalDateString(), horaPlanejada: '08:00', colaborador: '', procedimento: '', observacoes: '', selectedSheep: [], grupoId: ''
    });
    setSelectionMode('none'); setIsEditing(false); setCurrentManejo(null);
  };

  const handleFinishManejo = async () => {
    if (!currentManejo) return;
    try {
      let nextData: string | undefined = undefined;
      let nextContagem: number | undefined = undefined;
      const { recorrencia, recorrenciaConfig, dataPlanejada } = currentManejo;

      if (recorrencia !== Recorrencia.NENHUMA) {
        const calculated = calculateNextDate(dataPlanejada, recorrencia, recorrenciaConfig || {});
        if (calculated) {
          const dataInicio = recorrenciaConfig?.dataInicioReferencia || currentManejo.dataPlanejada;
          const duracao = recorrenciaConfig?.duracaoValor;
          
          let canCreateNext = true;
          if (duracao && duracao > 0) {
            const limite = addDaysLocal(dataInicio, duracao);
            if (calculated > limite) {
              canCreateNext = false;
            }
          }

          if (canCreateNext) {
            nextData = calculated;
            nextContagem = (recorrenciaConfig?.contagem || 0) + 1;
          }
        }
      }
      await manejoService.updateStatus(currentManejo.id, StatusManejo.CONCLUIDO, execData.dataExecucao, nextData, nextContagem);
      
      if (execData.updateHealth) {
        let targets: string[] = currentManejo.grupoId ? sheep.filter(s => s.grupoId === currentManejo.grupoId && s.status === 'ativo').map(s => s.id) : (currentManejo.ovelhasIds || []);
        if (targets.length > 0) {
          const updatePayload: any = {};
          if (execData.peso) updatePayload.peso = parseFloat(execData.peso);
          if (execData.famacha) updatePayload.famacha = execData.famacha;
          if (execData.ecc) updatePayload.ecc = execData.ecc;
          await sheepService.updateBulkHealth(targets, updatePayload, execData.dataExecucao);
          onRefreshSheep();
        }
      }
      setIsExecModalOpen(false); resetExecForm(); loadManejos();
    } catch (e) { alert("Erro ao finalizar manejo."); }
  };

  const resetExecForm = () => {
    setExecData({ dataExecucao: getLocalDateString(), obsExecucao: '', updateHealth: false, peso: '', famacha: 1, ecc: 3, prenha: false });
  };

  const requestAuth = (type: 'edit' | 'delete', manejo: Manejo) => { 
    setAuthAction({ type, manejo }); setPwdInput(''); setIsAuthModalOpen(true); 
  };

  const handleAuthConfirm = async () => {
    if (pwdInput !== managerPassword) { alert("Senha incorreta!"); return; }
    const action = authAction; setIsAuthModalOpen(false); setAuthAction(null);
    if (action?.type === 'delete') { 
       try { await manejoService.delete(action.manejo.id); await loadManejos(); } catch (err) { alert("Erro ao excluir."); }
    } else if (action?.type === 'edit') {
      setCurrentManejo(action.manejo); setIsEditing(true);
      if (action.manejo.grupoId) setSelectionMode('group');
      else if (action.manejo.ovelhasIds && action.manejo.ovelhasIds.length > 0) setSelectionMode('individual');
      else setSelectionMode('none');

      setFormData({ 
        titulo: action.manejo.titulo, tipo: action.manejo.tipo, recorrencia: action.manejo.recorrencia,
        recorrenciaConfig: {
          diasSemana: action.manejo.recorrenciaConfig?.diasSemana || [],
          diasMes: action.manejo.recorrenciaConfig?.diasMes || [],
          mesesAnual: action.manejo.recorrenciaConfig?.mesesAnual || [],
          intervaloDiario: action.manejo.recorrenciaConfig?.intervaloDiario || 1,
          duracaoValor: action.manejo.recorrenciaConfig?.duracaoValor || null,
          dataInicioReferencia: action.manejo.recorrenciaConfig?.dataInicioReferencia || '',
          contagem: action.manejo.recorrenciaConfig?.contagem || 0
        },
        dataPlanejada: action.manejo.dataPlanejada.split('T')[0], 
        horaPlanejada: action.manejo.horaPlanejada || '08:00',
        colaborador: action.manejo.colaborador || '', procedimento: action.manejo.procedimento || '',
        observacoes: action.manejo.observacoes || '', selectedSheep: action.manejo.ovelhasIds || [], grupoId: action.manejo.grupoId || ''
      });
      setIsFormOpen(true);
    }
  };

  const filteredManejos = useMemo(() => {
    const todayStr = getLocalDateString();
    
    const sortCronologico = (a: Manejo, b: Manejo) => {
      const stringA = `${a.dataPlanejada.split('T')[0]} ${a.horaPlanejada || '00:00'}`;
      const stringB = `${b.dataPlanejada.split('T')[0]} ${b.horaPlanejada || '00:00'}`;
      return stringA.localeCompare(stringB);
    };

    if (filter === StatusManejo.PENDENTE) {
      return manejos.filter(m => {
        const isPendingTodayOrLate = m.status === StatusManejo.PENDENTE && m.dataPlanejada.split('T')[0] <= todayStr;
        const isConcludedToday = m.status === StatusManejo.CONCLUIDO && m.dataExecucao === todayStr;
        return isPendingTodayOrLate || isConcludedToday;
      }).sort((a, b) => {
        if (a.status !== b.status) return a.status === StatusManejo.PENDENTE ? -1 : 1;
        return sortCronologico(a, b);
      });
    }
    
    if (filter === 'futuros') {
      return manejos.filter(m => m.status === StatusManejo.PENDENTE && m.dataPlanejada.split('T')[0] > todayStr)
                    .sort(sortCronologico);
    }
    
    if (filter === StatusManejo.CONCLUIDO) {
      return manejos.filter(m => m.status === StatusManejo.CONCLUIDO)
                    .sort((a, b) => {
                      const dA = `${a.dataExecucao || ''} ${a.horaPlanejada || '00:00'}`;
                      const dB = `${b.dataExecucao || ''} ${b.horaPlanejada || '00:00'}`;
                      return dB.localeCompare(dA);
                    });
    }
    return manejos;
  }, [manejos, filter]);

  const groupedManejos = useMemo(() => {
    const groups: Record<string, Manejo[]> = {};
    filteredManejos.forEach(m => {
      let k = '';
      if (m.status === StatusManejo.CONCLUIDO && m.dataExecucao) {
        k = `Executado em: ${formatBrazilianDate(m.dataExecucao)}`;
      } else {
        const dateObj = parseLocalDate(m.dataPlanejada);
        k = dateObj ? dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) : 'Data Inválida';
      }
      if (!groups[k]) groups[k] = [];
      groups[k].push(m);
    });
    return groups;
  }, [filteredManejos]);

  const getManejoDistribution = (m: Manejo): ManejoDistribution => {
    const targetSheep = m.grupoId ? sheep.filter(s => s.grupoId === m.grupoId && s.status === 'ativo') : sheep.filter(s => (m.ovelhasIds || []).includes(s.id));
    const paddocksMap: Record<string, number> = {};
    const groupsMap: Record<string, number> = {};
    targetSheep.forEach(s => {
      const p = paddocks.find(pi => pi.id === s.piqueteId)?.piquete || 'S.P.';
      const g = groups.find(gr => gr.id === s.grupoId)?.nome || 'S.G.';
      paddocksMap[p] = (paddocksMap[p] || 0) + 1;
      groupsMap[g] = (groupsMap[g] || 0) + 1;
    });
    return { paddocks: Object.entries(paddocksMap) as any, groups: Object.entries(groupsMap) as any };
  };

  const diasSemana = [
    { label: 'Dom', value: 0 }, { label: 'Seg', value: 1 }, { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 }, { label: 'Qui', value: 4 }, { label: 'Sex', value: 5 }, { label: 'Sáb', value: 6 }
  ];

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500 pb-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm shrink-0">
        <div>
           <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Agenda de Manejo</h2>
           <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Cronograma operacional técnico.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="bg-slate-100 p-1 rounded-xl flex">
             <button onClick={() => setViewMode('lista')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'lista' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Lista</button>
             <button onClick={() => setViewMode('calendario')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'calendario' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Calendário</button>
          </div>
          <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black shadow-md text-xs uppercase tracking-widest">NOVO MANEJO</button>
        </div>
      </div>

      {viewMode === 'calendario' ? (
        <div className="flex-1 overflow-hidden">
          <ManejoCalendar manejos={manejos} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-200/50 w-fit rounded-xl shrink-0">
            {[{ id: StatusManejo.PENDENTE, label: 'Hoje' }, { id: 'futuros', label: 'Próximos' }, { id: StatusManejo.CONCLUIDO, label: 'Concluídos' }].map(btn => (
              <button key={btn.id} onClick={() => setFilter(btn.id as any)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === btn.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>{btn.label}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
            {loading ? (
              <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div></div>
            ) : Object.keys(groupedManejos).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200"><p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Sem tarefas ativas.</p></div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedManejos).map(([date, items]) => (
                  <div key={date} className="space-y-2">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{date}</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {(items as Manejo[]).map(m => (
                        <ManejoCompactCard key={m.id} m={m} distribution={getManejoDistribution(m)} requestAuth={requestAuth} handleOpenExec={() => { setCurrentManejo(m); setIsExecModalOpen(true); }} isFuture={filter === 'futuros'} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{isEditing ? 'Editar Protocolo' : 'Novo Protocolo'}</h3><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuração Operacional</p></div>
              <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="md:col-span-2">
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Título da Tarefa *</label>
                <input required placeholder="EX: VACINAÇÃO LOTE 01" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm uppercase transition-all" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Frequência</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={formData.recorrencia} onChange={e => setFormData({...formData, recorrencia: e.target.value as Recorrencia})}>
                    {RECORRENCIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Tipo de Manejo</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as TipoManejo})}>
                    {TIPO_MANEJO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Data Planejada</label>
                  <input type="date" className={`w-full p-3 bg-slate-50 border transition-all ${!dateValidation.isValid ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'} rounded-xl outline-none font-bold text-sm`} value={formData.dataPlanejada} onChange={e => setFormData({...formData, dataPlanejada: e.target.value})} />
                  {!dateValidation.isValid && <button type="button" onClick={autoAdjustDate} className="mt-2 text-[10px] font-black text-rose-600 uppercase">Ajustar Data Automaticamente</button>}
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Horário</label>
                  <input type="time" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={formData.horaPlanejada} onChange={e => setFormData({...formData, horaPlanejada: e.target.value})} />
                </div>
              </div>

              {formData.recorrencia !== Recorrencia.NENHUMA && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Configuração de Repetição</h4>
                  {formData.recorrencia === Recorrencia.DIARIA && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold">A cada</span>
                      <input type="number" min="1" className="w-16 p-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl font-black text-center outline-none transition-all" value={formData.recorrenciaConfig.intervaloDiario} onChange={e => setFormData({...formData, recorrenciaConfig: {...formData.recorrenciaConfig, intervaloDiario: parseInt(e.target.value) || 1}})} />
                      <span className="text-[10px] text-slate-400 font-bold">dia(s)</span>
                    </div>
                  )}
                  {formData.recorrencia === Recorrencia.SEMANAL && (
                    <div className="flex flex-wrap gap-2">
                      {diasSemana.map(d => (
                        <button key={d.value} type="button" onClick={() => toggleDay(d.value)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.recorrenciaConfig.diasSemana?.includes(d.value) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-300'}`}> {d.label} </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center"><h4 className="font-black text-slate-800 uppercase tracking-widest text-[9px]">Alvos</h4><div className="flex p-1 bg-slate-200 rounded-xl"><button type="button" onClick={() => handleSelectionModeChange('none')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${selectionMode === 'none' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Geral</button><button type="button" onClick={() => handleSelectionModeChange('individual')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${selectionMode === 'individual' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Animal</button><button type="button" onClick={() => handleSelectionModeChange('group')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${selectionMode === 'group' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Lote</button></div></div>
                {selectionMode === 'group' && <select className="w-full p-3 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={formData.grupoId} onChange={e => setFormData({...formData, grupoId: e.target.value})}><option value="">Selecione o Lote...</option>{groups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}</select>}
                {selectionMode === 'individual' && (
                  <div className="space-y-4">
                    <div className="bg-white border rounded-xl h-48 overflow-y-auto p-3 grid grid-cols-2 gap-2 custom-scrollbar">
                      {activeSheep.map(s => (
                        <label key={s.id} className={`flex items-center gap-2 p-2.5 rounded-lg border text-[10px] font-black transition-all cursor-pointer ${formData.selectedSheep.includes(s.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                          <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 focus:ring-emerald-500" checked={formData.selectedSheep.includes(s.id)} onChange={e => setFormData({...formData, selectedSheep: e.target.checked ? [...formData.selectedSheep, s.id] : formData.selectedSheep.filter(id => id !== s.id)})}/>
                          <span className="truncate">#{s.brinco} - {s.nome}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Procedimento / POP</label>
                <textarea 
                  rows={4} 
                  placeholder="Instruções passo-a-passo para esta tarefa..." 
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-medium text-sm transition-all focus:bg-white" 
                  value={formData.procedimento} 
                  onChange={e => setFormData({...formData, procedimento: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Colaborador / Responsável</label>
                <input placeholder="NOME" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm uppercase transition-all" value={formData.colaborador} onChange={e => setFormData({...formData, colaborador: e.target.value})} />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Observações Adicionais</label>
                <textarea 
                  rows={2} 
                  placeholder="Alertas ou notas extras..." 
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-medium text-sm uppercase transition-all focus:bg-white" 
                  value={formData.observacoes} 
                  onChange={e => setFormData({...formData, observacoes: e.target.value})} 
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t shrink-0">
                <button type="button" onClick={() => { setIsFormOpen(false); resetForm(); }} className="px-6 py-3 font-black text-slate-400 uppercase text-[10px]">Cancelar</button>
                <button type="submit" disabled={!dateValidation.isValid || !formData.titulo.trim()} className={`px-10 py-3 font-black rounded-2xl shadow-xl uppercase text-[10px] transition-all ${!dateValidation.isValid ? 'bg-slate-200' : 'bg-slate-900 text-white'}`} > Salvar </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isExecModalOpen && currentManejo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between bg-emerald-50/50 rounded-t-[32px]">
              <div><h3 className="text-xl font-black text-emerald-900 uppercase">Concluir Manejo</h3><p className="text-[10px] font-black text-emerald-600 uppercase">Finalização da tarefa</p></div>
              <button onClick={() => setIsExecModalOpen(false)} className="w-10 h-10 bg-white border border-emerald-100 rounded-full flex items-center justify-center">✕</button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Data Real da Tarefa</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-sm transition-all" value={execData.dataExecucao} onChange={e => setExecData({...execData, dataExecucao: e.target.value})} /></div>
              {(currentManejo.grupoId || (currentManejo.ovelhasIds && currentManejo.ovelhasIds.length > 0)) && (
                <label className="flex items-center gap-3 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 cursor-pointer hover:bg-emerald-50 transition-all"><input type="checkbox" className="w-5 h-5 text-emerald-600 focus:ring-emerald-500" checked={execData.updateHealth} onChange={e => setExecData({...execData, updateHealth: e.target.checked})} /><div><span className="font-black text-[11px] text-emerald-700 uppercase block">Gravar Saúde em Massa</span></div></label>
              )}
              <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Relatório Final</label><textarea rows={3} className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-sm transition-all focus:bg-white" placeholder="Resumo do que foi feito..." value={execData.obsExecucao} onChange={e => setExecData({...execData, obsExecucao: e.target.value})} /></div>
              <div className="flex flex-col gap-2 pt-4"><button onClick={handleFinishManejo} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase text-[11px] active:scale-95 transition-all">Finalizar Manejo</button></div>
            </div>
          </div>
        </div>
      )}

      {isAuthModalOpen && authAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl w-full max-sm p-6 text-center animate-in zoom-in-95">
          <h3 className="text-lg font-black text-slate-800 uppercase mb-2">Segurança</h3>
          <input type="password" autoFocus className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-center tracking-widest mb-4 transition-all" value={pwdInput} onChange={(e) => setPwdInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAuthConfirm()} />
          <div className="flex gap-2"><button onClick={() => setIsAuthModalOpen(false)} className="flex-1 py-2 text-slate-400 font-black text-[9px] uppercase">Cancelar</button><button onClick={handleAuthConfirm} className="flex-1 py-2 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase">Confirmar</button></div>
        </div></div>
      )}
    </div>
  );
};

const ManejoCompactCard = ({ m, distribution, requestAuth, handleOpenExec, isFuture }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const accentColor = m.status === StatusManejo.CONCLUIDO ? 'bg-emerald-500' : (m.dataPlanejada.split('T')[0] < getLocalDateString() ? 'bg-rose-500' : 'bg-blue-500');

  const displayDate = useMemo(() => {
    const raw = (m.status === StatusManejo.CONCLUIDO && m.dataExecucao) ? m.dataExecucao : m.dataPlanejada;
    return formatBrazilianDate(raw);
  }, [m.dataPlanejada, m.dataExecucao, m.status]);

  return (
    <div className={`rounded-[24px] border transition-all shadow-sm ${m.status === StatusManejo.CONCLUIDO ? 'bg-emerald-50/40 border-emerald-100' : 'bg-white border-slate-200'}`}>
      <div onClick={() => setIsExpanded(!isExpanded)} className="flex items-center justify-between p-4 cursor-pointer">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className={`w-12 h-12 ${accentColor} text-white rounded-xl flex flex-col items-center justify-center shadow-md shrink-0`}>
            <span className="text-xs font-black leading-none">{m.horaPlanejada || '--:--'}</span>
            <span className="text-[8px] font-bold uppercase mt-1 opacity-80">{m.status === StatusManejo.CONCLUIDO ? 'OK' : 'H'}</span>
          </div>
          <div className="truncate">
            <h4 className={`font-black text-xs uppercase truncate leading-tight mb-1 ${m.status === StatusManejo.CONCLUIDO ? 'text-emerald-900 line-through opacity-60' : 'text-slate-800'}`}>
              {m.titulo}
            </h4>
            <div className="flex items-center gap-2">
               <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${m.status === StatusManejo.CONCLUIDO ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-600'}`}>
                 {m.status === StatusManejo.CONCLUIDO ? `FEITO EM: ${displayDate}` : displayDate}
               </span>
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{m.grupoId ? 'LOTE' : m.ovelhasIds?.length ? `${m.ovelhasIds.length} OVINOS` : 'GERAL'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {m.status === StatusManejo.PENDENTE && !isFuture && <button onClick={(e) => { e.stopPropagation(); handleOpenExec(); }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">Concluir</button>}
          <div className="text-slate-300 text-[10px]" style={{ transform: isExpanded ? 'rotate(180deg)' : '' }}>▼</div>
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-50 animate-in slide-in-from-top-1 space-y-4">
          <div className="bg-slate-50/80 rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div><h5 className="text-[8px] font-black text-slate-400 uppercase mb-1">Responsável</h5><p className="text-[10px] font-bold text-slate-700 uppercase">{m.colaborador || '-'}</p></div>
               <div><h5 className="text-[8px] font-black text-slate-400 uppercase mb-1">Horário Planejado</h5><p className="text-[10px] font-bold text-slate-700 uppercase">{m.horaPlanejada || '--:--'}</p></div>
            </div>
            {m.procedimento && (
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <h5 className="text-[8px] font-black text-slate-400 uppercase mb-1">Procedimento POP</h5>
                <p className="text-[10px] text-slate-600 leading-relaxed italic">{m.procedimento}</p>
              </div>
            )}
            {m.observacoes && (
              <div className="bg-white/50 p-3 rounded-xl border border-slate-100">
                <h5 className="text-[8px] font-black text-slate-400 uppercase mb-1">Observações</h5>
                <p className="text-[10px] text-slate-500 leading-relaxed uppercase">{m.observacoes}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button onClick={() => requestAuth('edit', m)} className="text-[9px] font-black text-slate-400 uppercase px-3 py-2 hover:text-emerald-600 transition-colors">Editar</button>
              <button onClick={() => requestAuth('delete', m)} className="text-[9px] font-black text-rose-400 uppercase px-3 py-2 hover:text-rose-600 transition-colors">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManejoManager;
