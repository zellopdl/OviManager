
import React, { useState, useMemo } from 'react';
import { Sheep, Breed, Supplier, Group, Paddock, Sanidade } from '../../types';
import { calculateAge } from '../../utils';
import { FAMACHA_OPTIONS, ECC_OPTIONS } from '../../constants';

interface SheepTableProps {
  sheep: Sheep[];
  breeds: Breed[];
  suppliers: Supplier[];
  groups: Group[];
  paddocks: Paddock[];
  onEdit: (sheep: Sheep) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onAnalyze: (sheep: Sheep) => void;
}

type SortField = keyof Sheep | 'grupo' | 'piquete';
type SortDirection = 'asc' | 'desc';

const SheepTable: React.FC<SheepTableProps> = ({ sheep, breeds, groups, paddocks, onEdit, onDelete, onAdd, onAnalyze }) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const getFamachaInfo = (val: number) => FAMACHA_OPTIONS.find(o => o.value === val);
  const getEccInfo = (val: number) => ECC_OPTIONS.find(o => o.value === val);
  const getGroupName = (id: string) => groups.find(g => g.id === id)?.nome || 'SEM LOTE';
  const getPaddockName = (id: string) => paddocks.find(p => p.id === id)?.piquete || '-';

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const filtered = sheep.filter(s => 
      s.nome.toLowerCase().includes(search.toLowerCase()) || 
      s.brinco.includes(search)
    );

    return filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'grupo') {
        valA = getGroupName(a.grupoId);
        valB = getGroupName(b.grupoId);
      } else if (sortField === 'piquete') {
        valA = getPaddockName(a.piqueteId);
        valB = getPaddockName(b.piqueteId);
      } else {
        valA = a[sortField as keyof Sheep];
        valB = b[sortField as keyof Sheep];
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sheep, search, sortField, sortDirection, groups, paddocks]);

  const getFamachaColor = (val: number) => {
    if (val <= 2) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (val === 3) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
           <input className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:border-emerald-500 text-sm font-medium" placeholder="Buscar por nome ou brinco..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={onAdd} className="bg-emerald-600 text-white w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-emerald-900/10 active:scale-95 transition-all">Novo Animal</button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-[32px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="p-5 cursor-pointer" onClick={() => handleSort('nome')}>Animal {sortField==='nome'&& (sortDirection==='asc'?'↑':'↓')}</th>
              <th className="p-5">Grupo</th>
              <th className="p-5">Sanidade</th>
              <th className="p-5">Idade</th>
              <th className="p-5">Peso</th>
              <th className="p-5">Saúde</th>
              <th className="p-5">Local</th>
              <th className="p-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filteredAndSorted.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition-all group">
                <td className="p-5"><p className="font-black uppercase text-slate-800">{s.nome}</p><p className="text-[9px] text-emerald-600 font-bold">#{s.brinco}</p></td>
                <td className="p-5"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">{getGroupName(s.grupoId)}</span></td>
                <td className="p-5"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{s.sanidade}</span></td>
                <td className="p-5 font-bold text-slate-500">{calculateAge(s.nascimento)}</td>
                <td className="p-5 font-black text-slate-800">{s.peso}kg</td>
                <td className="p-5">
                   <div className="flex flex-col gap-1">
                      <div className={`px-2 py-0.5 rounded border text-[8px] font-black ${getFamachaColor(s.famacha)}`}>FAM: {s.famacha}</div>
                      <div className="px-2 py-0.5 rounded border border-slate-100 bg-slate-50 text-[8px] font-black text-slate-500 uppercase">ECC: {s.ecc}</div>
                   </div>
                </td>
                <td className="p-5 font-bold text-slate-400">{getPaddockName(s.piqueteId)}</td>
                <td className="p-5 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onAnalyze(s)} className="p-2 text-indigo-500 bg-indigo-50 rounded-lg">✨</button>
                    <button onClick={() => onEdit(s)} className="p-2 text-slate-400 bg-slate-50 rounded-lg">✏️</button>
                    <button onClick={() => onDelete(s.id)} className="p-2 text-rose-400 bg-rose-50 rounded-lg">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - EXTREMAMENTE OTIMIZADA */}
      <div className="lg:hidden grid grid-cols-1 gap-3">
        {filteredAndSorted.map(s => (
          <div key={s.id} className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all">
             <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-500' : 'bg-rose-500'}`} />
             <div className="flex justify-between items-start mb-3">
               <div>
                  <h4 className="font-black uppercase text-slate-800 text-sm leading-none mb-1">{s.nome}</h4>
                  <div className="flex gap-2 items-center">
                    <p className="text-[10px] text-emerald-600 font-black tracking-widest">#{s.brinco}</p>
                    <span className="text-[7px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{getGroupName(s.grupoId)}</span>
                  </div>
               </div>
               <div className="flex gap-1.5">
                  <button onClick={() => onAnalyze(s)} className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-sm">✨</button>
                  <button onClick={() => onEdit(s)} className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center text-sm">✏️</button>
               </div>
             </div>
             
             <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 mb-3">
                <div className="text-center">
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Peso</p>
                   <p className="text-[11px] font-black text-slate-700">{s.peso}kg</p>
                </div>
                <div className="text-center border-x border-slate-200">
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Saúde</p>
                   <p className={`text-[9px] font-black uppercase ${s.famacha > 3 ? 'text-rose-500' : 'text-emerald-600'}`}>F{s.famacha} / E{s.ecc}</p>
                </div>
                <div className="text-center">
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Local</p>
                   <p className="text-[10px] font-bold text-slate-500 truncate px-1">{getPaddockName(s.piqueteId)}</p>
                </div>
             </div>

             <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold text-slate-400 italic">{calculateAge(s.nascimento)} de vida</span>
                <button onClick={() => onDelete(s.id)} className="text-[8px] font-black text-rose-300 uppercase hover:text-rose-500">Excluir Registro</button>
             </div>
          </div>
        ))}
        {filteredAndSorted.length === 0 && (
          <div className="py-20 text-center opacity-40"><p className="text-sm font-black uppercase tracking-widest">Nenhum animal na lista</p></div>
        )}
      </div>
    </div>
  );
};

export default SheepTable;
