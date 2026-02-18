
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

      // Lógica customizada para campos que dependem de outras tabelas ou transformações
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity">↕</span>;
    return <span className="ml-1 text-emerald-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
           <input 
             className="w-full pl-10 pr-4 py-3 bg-white border rounded-[20px] shadow-sm outline-none focus:border-emerald-500" 
             placeholder="Buscar por nome ou brinco..." 
             value={search} 
             onChange={e => setSearch(e.target.value)} 
           />
        </div>
        <button onClick={onAdd} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-emerald-900/10 active:scale-95 transition-all">Novo Animal</button>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block bg-white rounded-[32px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest no-select">
            <tr>
              <th className="p-5 cursor-pointer group" onClick={() => handleSort('nome')}>
                Animal <SortIcon field="nome" />
              </th>
              <th className="p-5 cursor-pointer group" onClick={() => handleSort('grupo')}>
                Grupo <SortIcon field="grupo" />
              </th>
              <th className="p-5 cursor-pointer group" onClick={() => handleSort('sanidade')}>
                Sanidade <SortIcon field="sanidade" />
              </th>
              <th className="p-5 cursor-pointer group" onClick={() => handleSort('nascimento')}>
                Idade <SortIcon field="nascimento" />
              </th>
              <th className="p-5 cursor-pointer group" onClick={() => handleSort('peso')}>
                Peso <SortIcon field="peso" />
              </th>
              <th className="p-5 cursor-pointer group" onClick={() => handleSort('famacha')}>
                Saúde (Fam/ECC) <SortIcon field="famacha" />
              </th>
              <th className="p-5 cursor-pointer group" onClick={() => handleSort('piquete')}>
                Local <SortIcon field="piquete" />
              </th>
              <th className="p-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filteredAndSorted.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition-all group">
                <td className="p-5">
                  <p className="font-black uppercase text-slate-800">{s.nome}</p>
                  <p className="text-[9px] text-emerald-600 font-bold">#{s.brinco}</p>
                </td>
                <td className="p-5">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">{getGroupName(s.grupoId)}</span>
                </td>
                <td className="p-5">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{s.sanidade}</span>
                </td>
                <td className="p-5 font-bold text-slate-500">{calculateAge(s.nascimento)}</td>
                <td className="p-5 font-black text-slate-800">{s.peso}kg</td>
                <td className="p-5">
                  <div className="flex flex-col gap-1">
                    <div className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase inline-block ${getFamachaColor(s.famacha)}`}>
                      FAM: {getFamachaInfo(s.famacha)?.label.split('-')[0] || s.famacha}
                    </div>
                    <div className="px-2 py-1 rounded-lg border border-slate-100 bg-slate-50 text-[9px] font-black text-slate-500 uppercase inline-block">
                      ECC: {getEccInfo(s.ecc)?.label.split('-')[0] || s.ecc}
                    </div>
                  </div>
                </td>
                <td className="p-5 font-bold text-slate-400">{getPaddockName(s.piqueteId)}</td>
                <td className="p-5 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onAnalyze(s)} className="p-2 text-indigo-500 bg-indigo-50 rounded-lg" title="Análise IA">✨</button>
                    <button onClick={() => onEdit(s)} className="p-2 text-slate-400 bg-slate-50 rounded-lg" title="Editar">✏️</button>
                    <button onClick={() => onDelete(s.id)} className="p-2 text-rose-400 bg-rose-50 rounded-lg" title="Excluir">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAndSorted.length === 0 && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400 uppercase font-black text-[10px] tracking-widest">Nenhum animal encontrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden grid grid-cols-1 gap-4">
        {filteredAndSorted.map(s => (
          <div key={s.id} className="bg-white p-5 rounded-[28px] border shadow-sm relative overflow-hidden">
             <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${s.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-500' : 'bg-rose-500'}`} />
             <div className="flex justify-between items-start mb-4">
               <div>
                  <h4 className="font-black uppercase text-slate-800 text-sm">{s.nome}</h4>
                  <div className="flex gap-2 items-center">
                    <p className="text-[10px] text-emerald-600 font-black">#{s.brinco}</p>
                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">{getGroupName(s.grupoId)}</span>
                  </div>
               </div>
               <button onClick={() => onAnalyze(s)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">✨</button>
             </div>
             
             <div className="grid grid-cols-2 gap-2 mb-4">
                <div className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase text-center ${getFamachaColor(s.famacha)}`}>
                  Fam: {getFamachaInfo(s.famacha)?.label.split('-')[0] || s.famacha}
                </div>
                <div className="px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 text-[9px] font-black text-slate-500 uppercase text-center">
                  ECC: {getEccInfo(s.ecc)?.label.split('-')[0] || s.ecc}
                </div>
             </div>

             <div className="flex gap-2">
                <button onClick={() => onEdit(s)} className="flex-1 py-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-500">Editar</button>
                <button onClick={() => onDelete(s.id)} className="flex-1 py-3 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black uppercase">Excluir</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SheepTable;
