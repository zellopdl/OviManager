
import React, { useState } from 'react';
import { entityService } from './entityService';
import { Paddock, Sheep, Status } from '../../types';

interface PaddockManagerProps {
  initialData: Paddock[];
  onRefresh: () => void;
  sheep: Sheep[];
}

const PaddockManager: React.FC<PaddockManagerProps> = ({ initialData, onRefresh, sheep }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPaddock, setEditingPaddock] = useState<Paddock | null>(null);
  const [formData, setFormData] = useState({ piquete: '', tamanho: '', lotacao: '0', grama: '' });

  const handleEdit = (p: Paddock) => {
    setEditingPaddock(p);
    setFormData({ piquete: p.piquete, tamanho: p.tamanho?.toString() || '', lotacao: p.lotacao.toString(), grama: p.grama || '' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
      piquete: formData.piquete.toUpperCase(), 
      tamanho: formData.tamanho ? parseFloat(formData.tamanho) : null,
      lotacao: parseInt(formData.lotacao),
      grama: formData.grama.toUpperCase()
    };
    if (editingPaddock) await entityService.update('piquetes', editingPaddock.id, payload);
    else await entityService.create('piquetes', payload);
    setIsFormOpen(false);
    onRefresh();
    setFormData({ piquete: '', tamanho: '', lotacao: '0', grama: '' });
  };

  const handleDelete = async (id: string) => {
    const hasSheep = sheep.some(s => s.piqueteId === id && s.status === Status.ATIVO);
    if (hasSheep) {
      alert("BLOQUEIO: Existem animais ativos alocados neste piquete. Mova-os primeiro.");
      return;
    }
    if (confirm("Deseja excluir este piquete permanentemente?")) {
      await entityService.delete('piquetes', id);
      onRefresh();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center px-4">
        <h2 className="text-xl font-black uppercase tracking-tight">🌾 Gestão de Piquetes</h2>
        <button onClick={() => setIsFormOpen(true)} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">Novo Piquete</button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl animate-in zoom-in-95">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Identificação</label>
              <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase" value={formData.piquete} onChange={e => setFormData({...formData, piquete: e.target.value})} />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Tamanho (ha)</label>
              <input type="number" step="0.1" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.tamanho} onChange={e => setFormData({...formData, tamanho: e.target.value})} />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Lotação (Cap.)</label>
              <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.lotacao} onChange={e => setFormData({...formData, lotacao: e.target.value})} />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Grama</label>
              <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase" value={formData.grama} onChange={e => setFormData({...formData, grama: e.target.value})} />
            </div>
            <div className="md:col-span-4 flex justify-end gap-2 mt-4">
               <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
               <button type="submit" className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px]">Confirmar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase">
            <tr><th className="p-5">Piquete</th><th className="p-5">Área</th><th className="p-5">Lotação</th><th className="p-5">Pastagem</th><th className="p-5 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y text-xs">
            {initialData.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="p-5 font-black uppercase text-slate-800">{p.piquete}</td>
                <td className="p-5 font-bold text-slate-500">{p.tamanho} ha</td>
                <td className="p-5"><span className="px-3 py-1 bg-slate-100 rounded-full font-black text-[10px]">{p.lotacao} CAB.</span></td>
                <td className="p-5 uppercase font-bold text-emerald-600">{p.grama || '-'}</td>
                <td className="p-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(p)} className="p-2 bg-slate-50 rounded-lg">✏️</button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 bg-rose-50 text-rose-400 rounded-lg">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaddockManager;
