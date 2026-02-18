
import React, { useMemo, useState } from 'react';
import { Manejo, StatusManejo, Recorrencia, RecorrenciaConfig } from '../../types';
import { getLocalDateString, addDaysLocal, parseLocalDate } from '../../utils';

interface ManejoCalendarProps {
  manejos: Manejo[];
}

const ManejoCalendar: React.FC<ManejoCalendarProps> = ({ manejos }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const today = getLocalDateString();

  const projections = useMemo(() => {
    const list: any[] = [];
    
    manejos.forEach(m => {
      // 1. A tarefa original sempre entra
      list.push({ ...m, date: m.dataPlanejada.split('T')[0], isProj: false });
      
      // 2. Se for recorrente e não estiver concluída, geramos as projeções virtuais
      if (m.recorrencia !== Recorrencia.NENHUMA && m.status !== StatusManejo.CONCLUIDO) {
        const config: RecorrenciaConfig = m.recorrenciaConfig || {};
        let current = m.dataPlanejada.split('T')[0];
        const limite = config.limiteRepeticoes || 50; // Projeta até 50 ocorrências se for "infinito" para não travar o browser
        
        for (let i = 1; i <= limite; i++) {
          let next = '';
          
          if (m.recorrencia === Recorrencia.DIARIA) {
            const step = config.intervalo || 1;
            next = addDaysLocal(current, step);
          } 
          else if (m.recorrencia === Recorrencia.SEMANAL) {
            const diasSelecionados = config.diasSemana || [];
            if (diasSelecionados.length === 0) {
              next = addDaysLocal(current, 7);
            } else {
              // Encontra o próximo dia da semana disponível
              let tempDate = parseLocalDate(current);
              if (tempDate) {
                let found = false;
                for (let d = 1; d <= 7; d++) {
                  let check = new Date(tempDate);
                  check.setDate(check.getDate() + d);
                  if (diasSelecionados.includes(check.getDay())) {
                    next = getLocalDateString(check);
                    found = true;
                    break;
                  }
                }
              }
            }
          } 
          else if (m.recorrencia === Recorrencia.MENSAL) {
            let tempDate = parseLocalDate(current);
            if (tempDate) {
              tempDate.setMonth(tempDate.getMonth() + 1);
              if (config.diaMes) tempDate.setDate(config.diaMes);
              next = getLocalDateString(tempDate);
            }
          }
          else if (m.recorrencia === Recorrencia.ANUAL) {
            let tempDate = parseLocalDate(current);
            if (tempDate) {
              tempDate.setFullYear(tempDate.getFullYear() + 1);
              if (config.mesAnual !== undefined) tempDate.setMonth(config.mesAnual);
              if (config.diaMes) tempDate.setDate(config.diaMes);
              next = getLocalDateString(tempDate);
            }
          }
          
          if (next) {
             list.push({ ...m, date: next, isProj: true });
             current = next;
          } else break;
        }
      }
    });
    return list;
  }, [manejos]);

  const days = useMemo(() => {
    const first = new Date(selectedYear, selectedMonth, 1).getDay();
    const last = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < first; i++) grid.push(null);
    for (let i = 1; i <= last; i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      grid.push({ day: i, tasks: projections.filter(p => p.date === dateStr) });
    }
    return grid;
  }, [selectedMonth, selectedYear, projections]);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center">
        <div className="flex gap-4">
          <button onClick={() => setSelectedMonth(m => m === 0 ? 11 : m - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all shadow-sm active:scale-90">◀</button>
          <h3 className="text-xs font-black uppercase text-slate-800 min-w-[140px] text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            {months[selectedMonth]} {selectedYear}
          </h3>
          <button onClick={() => setSelectedMonth(m => m === 11 ? 0 : m + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all shadow-sm active:scale-90">▶</button>
        </div>
        <div className="hidden sm:flex gap-4">
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-[7px] font-black uppercase text-slate-400 tracking-tighter">Realizado</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div><span className="text-[7px] font-black uppercase text-slate-400 tracking-tighter">Atrasado</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-indigo-400 rounded-full"></div><span className="text-[7px] font-black uppercase text-slate-400 tracking-tighter">Projeção</span></div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 flex-1 overflow-hidden flex flex-col shadow-inner">
        <div className="grid grid-cols-7 border-b bg-slate-50/50">
          {dayLabels.map(l => <div key={l} className="p-3 text-center text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{l}</div>)}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <div className="grid grid-cols-7 gap-2">
            {days.map((d, i) => d ? (
              <div 
                key={i} 
                className={`
                  relative min-h-[120px] p-2 rounded-2xl border transition-all duration-300 ease-out
                  ${d.tasks.length > 0 
                    ? 'bg-white border-slate-200 shadow-sm cursor-help hover:scale-[1.4] hover:z-[50] hover:shadow-2xl hover:border-indigo-300 hover:bg-white' 
                    : 'bg-slate-50/30 border-transparent opacity-30'
                  }
                  ${d.day === parseInt(today.split('-')[2]) && selectedMonth === new Date().getMonth() ? 'ring-2 ring-indigo-500/20 bg-indigo-50/10' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-black ${d.day === parseInt(today.split('-')[2]) && selectedMonth === new Date().getMonth() ? 'text-indigo-600' : 'text-slate-800'}`}>
                    {d.day}
                  </span>
                  {d.tasks.length > 0 && (
                    <span className="w-4 h-4 bg-indigo-50 text-indigo-600 text-[8px] flex items-center justify-center rounded-full font-black">
                      {d.tasks.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {d.tasks.map((t, idx) => {
                    const isOverdue = t.date < today && t.status === StatusManejo.PENDENTE;
                    const isToday = t.date === today && t.status === StatusManejo.PENDENTE;
                    const isDone = t.status === StatusManejo.CONCLUIDO;
                    const isProj = t.isProj;

                    return (
                      <div key={idx} className={`
                        px-2 py-1 rounded-lg border text-[7px] font-black uppercase leading-tight shadow-sm
                        ${isDone ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 
                          isOverdue ? 'bg-rose-500 text-white border-rose-600' :
                          isProj ? 'bg-indigo-50 text-indigo-600 border-indigo-100 border-dashed' :
                          isToday ? 'bg-amber-400 text-slate-900 border-amber-500' :
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }
                      `}>
                        <div className="truncate">{t.titulo}</div>
                        {isProj && <div className="text-[5px] opacity-60 mt-0.5">Automático</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : <div key={i} className="min-h-[120px] opacity-0" />)}
          </div>
        </div>
      </div>
      <style>{`
        .cursor-help { cursor: zoom-in; }
      `}</style>
    </div>
  );
};

export default ManejoCalendar;
