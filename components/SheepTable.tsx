
import React, { useState, useMemo } from 'react';
import { Sheep, Breed, Supplier, Group, Paddock, Sanidade, Status, Sexo } from '../types';
import { calculateAge } from '../utils';
import { FAMACHA_OPTIONS, ECC_OPTIONS } from '../constants';

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

type SortField = 'nome' | 'sexo' | 'piqueteId' | 'peso' | 'famacha' | 'nascimento' | 'sanidade';
type SortDirection = 'asc' | 'desc';

const SheepTable: React.FC<SheepTableProps> = ({ sheep, breeds, suppliers, groups, paddocks, onEdit, onDelete, onAdd, onAnalyze }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const getBreedName = (id: string) => breeds.find(b => b.id === id)?.nome || 'SRD';
  const getPaddockName = (id: string) => paddocks.find(p => p.id === id)?.piquete || '-';
  
  const getFamachaLabel = (val: number) => FAMACHA_OPTIONS.find(o => o.value === val)?.label || `${val}`;
  const getEccLabel = (val: number) => ECC_OPTIONS.find(o => o.value === val)?.label || `${val}`;

  const calculateGMD = (s: Sheep) => {
    if (!s.historicoPeso || s.historicoPeso.length < 2) return null;
    const history = [...s.historicoPeso].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    const latest = history[0];
    const previous = history[1];
    
    const weightDiff = latest.peso - previous.peso;
    const daysDiff = Math.ceil((new Date(latest.data).getTime() - new Date(previous.data).getTime()) / (1000 * 3600 * 24));
    
    return daysDiff > 0 ? weightDiff / daysDiff : null;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDeleteClick = (s: Sheep) => {
    if (window.confirm(`Deseja realmente EXCLUIR o animal ${s.nome} (Brinco: ${s.brinco})? Esta ação não pode ser desfeita.`)) {
      onDelete(s.id);
    }
  };

  const sortedSheep = useMemo(() => {
    const filtered = sheep.filter(s => 
      s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.brinco.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.origem?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField as keyof Sheep];
      let valB: any = b[sortField as keyof Sheep];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (sortField === 'nascimento') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sheep, searchTerm, sortField, sortDirection]);

  const SortIndicator = ({ field }: { field: SortField }) => {
    const isActive = sortField === field;
    return (
      <div className="inline-flex flex-col ml-1.5 align-middle leading-none">
        <span className={`text-[7px] ${isActive && sortDirection === 'asc' ? 'text-emerald-600' : 'text-slate-300'}`}>▲</span>
        <span className={`text-[7px] ${isActive && sortDirection === 'desc' ? 'text-emerald-600' : 'text-slate-300'}`}>▼</span>
      </div>
    );
  };

  const TableHeader = ({ field, label }: { field: SortField, label: string }) => (
    <th 
      className={`px-6 py-5 cursor-pointer transition-colors no-select group hover:bg-slate-100 ${sortField === field ? 'bg-slate-50/50' : ''}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        <span className={`${sortField === field ? 'text-slate-900 font-black' : 'text-slate-400 font-black'} transition-colors`}>
          {label}
        </span>
        <SortIndicator field={field} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por nome, brinco ou origem..." 
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={onAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-2"
        >
          <span className="text-sm">➕</span> <span className="uppercase text-[10px] tracking-widest">Novo Registro</span>
        </button>
      </div>

      <div className="block lg:hidden space-y-3">
        {sortedSheep.map(s => {
          const gmd = calculateGMD(s);
          return (
            <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                s.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-500' : s.sanidade === Sanidade.ENFERMARIA ? 'bg-amber-500' : 'bg-rose-500'
              }`}></div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-black text-sm text-slate-800 uppercase">{s.nome}</h4>
                  <p className="text-[9px] font-black text-emerald-600 tracking-widest">#{s.brinco} • {getBreedName(s.racaId)}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{calculateAge(s.nascimento)} • ORIGEM: {s.origem || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onAnalyze(s)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs" title="Análise IA">✨</button>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    s.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-100 text-emerald-700' : s.sanidade === Sanidade.ENFERMARIA ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {s.sanidade}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Piquete</p>
                  <p className="text-[11px] font-bold text-slate-700">{getPaddockName(s.piqueteId)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Peso / GMD</p>
                  <p className="text-[11px] font-bold text-slate-700">
                    {s.peso}kg {gmd !== null && <span className={gmd >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{gmd >= 0 ? '↑' : '↓'}{(gmd * 1000).toFixed(0)}g</span>}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg mb-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">FAM</span>
                  <span className="text-[10px] font-bold text-slate-700 uppercase">{getFamachaLabel(s.famacha)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">ECC</span>
                  <span className="text-[10px] font-bold text-slate-700 uppercase">{getEccLabel(s.ecc)}</span>
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-50 pt-2">
                <button onClick={() => onEdit(s)} className="flex-1 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-xs hover:text-emerald-600 transition-colors font-black uppercase tracking-tighter">✏️ Editar</button>
                <button onClick={() => handleDeleteClick(s)} className="flex-1 py-1.5 bg-rose-50 text-rose-400 rounded-lg text-xs hover:bg-rose-100 transition-colors font-black uppercase tracking-tighter">🗑️ Excluir</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[9px] uppercase tracking-widest font-black">
              <tr>
                <TableHeader field="nome" label="Animal" />
                <TableHeader field="sanidade" label="Sanidade" />
                <TableHeader field="sexo" label="Sexo" />
                <TableHeader field="piqueteId" label="Piquete" />
                <TableHeader field="peso" label="Desempenho" />
                <TableHeader field="famacha" label="Saúde (FAM/ECC)" />
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSheep.map((s) => {
                const gmd = calculateGMD(s);
                return (
                  <tr key={s.id} className={`hover:bg-slate-50/80 transition-colors group ${sortField === 'nome' ? 'bg-slate-50/20' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-xs uppercase">{s.nome}</span>
                        <span className="text-[9px] text-emerald-600 font-bold tracking-widest">#{s.brinco} • {getBreedName(s.racaId)}</span>
                        <div className="flex flex-col mt-0.5">
                           <span className="text-[9px] text-slate-400 font-bold uppercase">{calculateAge(s.nascimento)}</span>
                           <span className="text-[8px] text-slate-300 font-black uppercase tracking-tighter mt-0.5">ORIGEM: {s.origem || 'FAZENDA'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        s.sanidade === Sanidade.SAUDAVEL ? 'bg-emerald-100 text-emerald-700' :
                        s.sanidade === Sanidade.ENFERMARIA ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {s.sanidade}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        s.sexo === Sexo.MACHO ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {s.sexo === Sexo.MACHO ? 'Macho' : 'Fêmea'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-bold text-slate-700">{getPaddockName(s.piqueteId)}</td>
                    <td className="px-6 py-3">
                      <div className="text-xs font-bold text-slate-800">{s.peso}kg</div>
                      {gmd !== null ? (
                        <div className={`text-[9px] font-black uppercase flex items-center gap-1 ${gmd >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {gmd >= 0 ? '📈' : '📉'} {(gmd * 1000).toFixed(0)}g/dia
                        </div>
                      ) : (
                        <div className="text-[8px] text-slate-300 font-bold uppercase">Sem histórico</div>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1 rounded">FAM</span>
                          <span className="text-[9px] font-bold text-slate-600 uppercase leading-none">{getFamachaLabel(s.famacha)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1 rounded">ECC</span>
                          <span className="text-[9px] font-bold text-slate-600 uppercase leading-none">{getEccLabel(s.ecc)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <button onClick={() => onAnalyze(s)} className="p-2 text-indigo-400 hover:text-indigo-600 transition-all" title="Análise IA">✨</button>
                        <button onClick={() => onEdit(s)} className="p-2 text-slate-300 hover:text-emerald-600 transition-all">✏️</button>
                        <button onClick={() => handleDeleteClick(s)} className="p-2 text-slate-300 hover:text-rose-400 transition-all">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SheepTable;
