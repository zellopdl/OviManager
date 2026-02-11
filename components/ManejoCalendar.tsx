
import React, { useMemo, useState } from 'react';
import { Manejo, Recorrencia, RecorrenciaConfig } from '../types';
import { addDaysLocal, parseLocalDate, formatBrazilianDate, getLocalDateString } from '../utils';

interface ManejoCalendarProps {
  manejos: Manejo[];
}

interface ProjectedManejo extends Manejo {
  projectedDate: string; // Formato YYYY-MM-DD
}

const ManejoCalendar: React.FC<ManejoCalendarProps> = ({ manejos }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDayDetail, setSelectedDayDetail] = useState<{ day: number, tasks: ProjectedManejo[] } | null>(null);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const calculateNextDateStr = (currentDateStr: string, recorrencia: Recorrencia, config: RecorrenciaConfig): string | null => {
    if (recorrencia === Recorrencia.DIARIA) {
      return addDaysLocal(currentDateStr, config.intervaloDiario || 1);
    }
    
    const date = parseLocalDate(currentDateStr);
    if (!date) return null;

    if (recorrencia === Recorrencia.SEMANAL && config.diasSemana?.length) {
      for (let i = 1; i <= 7; i++) {
        const nextS = addDaysLocal(currentDateStr, i);
        const test = parseLocalDate(nextS);
        if (test && config.diasSemana.includes(test.getDay())) return nextS;
      }
    } else if (recorrencia === Recorrencia.MENSAL) {
      const dayTarget = config.diasMes?.[0] || date.getDate();
      for (let i = 1; i <= 12; i++) {
        const nextM = new Date(date.getFullYear(), date.getMonth() + i, dayTarget, 12, 0, 0);
        const nextS = getLocalDateString(nextM);
        if (nextS > currentDateStr) return nextS;
      }
    } else if (recorrencia === Recorrencia.ANUAL && config.mesesAnual?.length) {
       for (let i = 1; i <= 24; i++) {
         const nextM = new Date(date.getFullYear(), date.getMonth() + i, 1, 12, 0, 0);
         if (config.mesesAnual.includes(nextM.getMonth())) {
           const nextS = getLocalDateString(nextM);
           if (nextS > currentDateStr) return nextS;
         }
       }
    }
    return null;
  };

  const projections = useMemo(() => {
    const allProjections: ProjectedManejo[] = [];
    const yearStr = selectedYear.toString();

    manejos.forEach(m => {
      let currentStr = m.dataPlanejada.split('T')[0];
      const dataInicio = m.recorrenciaConfig?.dataInicioReferencia || currentStr;
      const duracao = m.recorrenciaConfig?.duracaoValor;
      
      let limiteStr: string | null = null;
      if (duracao && duracao > 0) {
        limiteStr = addDaysLocal(dataInicio, duracao);
      }

      // Adiciona a primeira ocorrência se estiver no ano selecionado e dentro do limite
      if (currentStr.startsWith(yearStr)) {
        if (!limiteStr || currentStr <= limiteStr) {
          allProjections.push({ ...m, projectedDate: currentStr });
        }
      }

      if (m.recorrencia !== Recorrencia.NENHUMA) {
        let iterations = 0;
        let nextStr = calculateNextDateStr(currentStr, m.recorrencia, m.recorrenciaConfig || {});
        
        while (nextStr && nextStr.startsWith(yearStr) && iterations < 366) {
          // Verifica se a próxima ocorrência respeita a duração total
          if (limiteStr && nextStr > limiteStr) {
             break;
          }

          allProjections.push({ ...m, projectedDate: nextStr });
          nextStr = calculateNextDateStr(nextStr, m.recorrencia, m.recorrenciaConfig || {});
          iterations++;
        }
      }
    });
    return allProjections.sort((a, b) => a.projectedDate.localeCompare(b.projectedDate));
  }, [manejos, selectedYear]);

  const monthStats = useMemo(() => {
    return months.map((_, idx) => {
      const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      const monthProj = projections.filter(p => p.projectedDate.startsWith(monthPrefix));
      return { month: idx, totalTasks: monthProj.length };
    });
  }, [projections, selectedYear]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTasks = projections.filter(p => p.projectedDate === dateStr);
      days.push({ day: i, tasks: dayTasks });
    }
    return days;
  }, [selectedMonth, selectedYear, projections]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
             <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Calendário de Manejo {selectedYear}</h2></div>
             <div className="flex gap-2">
               <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-2 bg-slate-100 rounded-lg text-xs">◀</button>
               <span className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-xs">{selectedYear}</span>
               <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-2 bg-slate-100 rounded-lg text-xs">▶</button>
             </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {monthStats.map((s, i) => (
              <button key={i} onClick={() => setSelectedMonth(i)} className={`p-3 rounded-2xl border transition-all text-left ${selectedMonth === i ? 'bg-indigo-600 border-indigo-600 shadow-lg' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}>
                <p className={`text-[9px] font-black uppercase mb-1 ${selectedMonth === i ? 'text-indigo-200' : 'text-slate-400'}`}>{months[i].slice(0, 3)}</p>
                <span className={`text-[10px] font-black ${selectedMonth === i ? 'text-white' : 'text-slate-800'}`}>{s.totalTasks} Eventos</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl flex flex-col justify-center text-center">
             <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Total no Ano</h3>
             <p className="text-5xl font-black">{projections.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayLabels.map(label => (<div key={label} className="text-center text-[10px] font-black text-slate-500 uppercase">{label}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((d, i) => d ? (
              <div key={i} onClick={() => d.tasks.length > 0 && setSelectedDayDetail(d)} className={`min-h-[80px] p-2 rounded-2xl border transition-all ${d.tasks.length > 0 ? 'bg-indigo-50 border-indigo-100 shadow-sm cursor-pointer' : 'bg-slate-50 border-transparent opacity-40'}`}>
                <div className="flex justify-between items-start mb-1"><span className={`text-[11px] font-black ${d.tasks.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{d.day}</span></div>
                <div className="space-y-1">{d.tasks.slice(0, 2).map((t, idx) => (<div key={idx} className="bg-white px-1 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-100 truncate text-[8px] font-black text-slate-600 uppercase">{t.titulo}</div>))}</div>
              </div>
            ) : <div key={i} className="min-h-[80px]"></div>)}
          </div>
        </div>
      </div>

      {selectedDayDetail && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl animate-in zoom-in-95">
            <div className="p-8 bg-indigo-600 text-white rounded-t-[32px] flex justify-between items-center">
              <div><h3 className="text-xl font-black uppercase">{selectedDayDetail.day} {months[selectedMonth]}</h3></div>
              <button onClick={() => setSelectedDayDetail(null)} className="text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {selectedDayDetail.tasks.map((task, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="font-black text-slate-800 uppercase text-sm">{task.titulo}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ref: {formatBrazilianDate(task.projectedDate)}</p>
                </div>
              ))}
            </div>
            <div className="p-6 flex justify-center"><button onClick={() => setSelectedDayDetail(null)} className="px-10 py-3 bg-slate-900 text-white font-black rounded-xl text-xs uppercase tracking-widest">Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManejoCalendar;
