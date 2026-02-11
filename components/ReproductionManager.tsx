
import React, { useState, useEffect, useMemo } from 'react';
import { BreedingRecord, Sheep, BreedingStatus, Sexo } from '../types';
import { reproService } from '../services/reproService';

interface ReproductionManagerProps {
  sheep: Sheep[];
  onRefresh: () => void;
}

const ReproductionManager: React.FC<ReproductionManagerProps> = ({ sheep, onRefresh }) => {
  const [records, setRecords] = useState<BreedingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formData, setFormData] = useState({
    matrizId: '',
    reprodutorId: '',
    dataCobertura: new Date().toISOString().split('T')[0],
    observacoes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await reproService.getAll();
      setRecords(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const matrizes = useMemo(() => sheep.filter(s => s.sexo === Sexo.FEMEA && s.status === 'ativo'), [sheep]);
  const reprodutores = useMemo(() => sheep.filter(s => s.sexo === Sexo.MACHO && s.status === 'ativo'), [sheep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.matrizId || !formData.reprodutorId) return;
    try {
      await reproService.create(formData);
      setIsFormOpen(false);
      setFormData({ matrizId: '', reprodutorId: '', dataCobertura: new Date().toISOString().split('T')[0], observacoes: '' });
      await loadData();
      onRefresh();
    } catch (e) { alert("Erro ao registrar monta. Verifique a conexão."); }
  };

  const handleUpdateStatus = async (id: string, status: BreedingStatus) => {
    try {
      let dataParto = undefined;
      if (status === BreedingStatus.PARTO) {
        dataParto = new Date().toISOString().split('T')[0];
      }
      await reproService.updateStatus(id, status, dataParto);
      await loadData();
      onRefresh();
    } catch (e) { alert("Erro ao atualizar status."); }
  };

  const handleDelete = async (record: BreedingRecord) => {
    const matriz = sheep.find(s => s.id === record.matrizId);
    if(window.confirm(`Deseja realmente EXCLUIR o registro de monta da matriz ${matriz?.nome || 'desconhecida'}?`)) { 
      try {
        await reproService.delete(record.id); 
        await loadData(); 
      } catch (e: any) {
        alert("Erro ao excluir registro: " + (e.message || "Falha de rede"));
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Plano de Monta e Reprodução</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Gestão de Matrizes, Reprodutores e Previsão de Partos</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-pink-900/10 transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"
        >
          ➕ Registrar Monta
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xl animate-in zoom-in-95 duration-300">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Matriz (Fêmea)</label>
              <select 
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
                value={formData.matrizId}
                onChange={e => setFormData({...formData, matrizId: e.target.value})}
              >
                <option value="">Selecionar...</option>
                {matrizes.map(s => <option key={s.id} value={s.id}>{s.nome} (#{s.brinco})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Reprodutor (Macho)</label>
              <select 
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
                value={formData.reprodutorId}
                onChange={e => setFormData({...formData, reprodutorId: e.target.value})}
              >
                <option value="">Selecionar...</option>
                {reprodutores.map(s => <option key={s.id} value={s.id}>{s.nome} (#{s.brinco})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Data da Monta</label>
              <input 
                type="date"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
                value={formData.dataCobertura}
                onChange={e => setFormData({...formData, dataCobertura: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-slate-900 text-white p-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest">Salvar</button>
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2.5 text-slate-400 font-bold text-[10px] uppercase">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Carregando ciclos...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-[32px] p-16 text-center">
          <div className="text-4xl mb-4 opacity-30">🧬</div>
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhum plano de monta registrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {records.map(record => {
            const matriz = sheep.find(s => s.id === record.matrizId);
            const reprodutor = sheep.find(s => s.id === record.reprodutorId);
            
            return (
              <div key={record.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-pink-200 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center text-sm font-bold">♀️</div>
                    <div>
                      <h4 className="font-black text-slate-800 text-xs uppercase">{matriz?.nome || 'Matriz Excluída'}</h4>
                      <p className="text-[10px] font-black text-slate-400">Reprodutor: {reprodutor?.nome || '-'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    record.status === BreedingStatus.COBERTA ? 'bg-slate-100 text-slate-600' :
                    record.status === BreedingStatus.CONFIRMADA ? 'bg-emerald-100 text-emerald-700' :
                    record.status === BreedingStatus.PARTO ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {record.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl mb-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Monta em</p>
                    <p className="text-[11px] font-bold text-slate-700">{new Date(record.dataCobertura).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Previsão Parto</p>
                    <p className="text-[11px] font-black text-pink-600">{new Date(record.dataPrevisaoParto).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {record.status === BreedingStatus.COBERTA && (
                    <button onClick={() => handleUpdateStatus(record.id, BreedingStatus.CONFIRMADA)} className="flex-1 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-widest">Confirmar Prenhez</button>
                  )}
                  {record.status === BreedingStatus.CONFIRMADA && (
                    <button onClick={() => handleUpdateStatus(record.id, BreedingStatus.PARTO)} className="flex-1 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[9px] font-black uppercase tracking-widest">Registrar Parto</button>
                  )}
                  {record.status !== BreedingStatus.PARTO && record.status !== BreedingStatus.FALHA && (
                    <button onClick={() => handleUpdateStatus(record.id, BreedingStatus.FALHA)} className="py-2 px-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[9px]" title="Falha/Aborto">✕</button>
                  )}
                  <button onClick={() => handleDelete(record)} className="py-2 px-3 bg-slate-50 text-slate-400 rounded-lg text-[9px]" title="Excluir Registro">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReproductionManager;
