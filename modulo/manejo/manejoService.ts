
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Manejo, TipoManejo, StatusManejo, Recorrencia } from '../../types';
import { getLocalDateString } from '../../utils';

const LOCAL_STORAGE_KEY = 'ovimanager_manejo_data';

const getLocalManejos = (): Manejo[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalManejos = (data: Manejo[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

export const manejoService = {
  async getAll(): Promise<Manejo[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('manejos')
          .select('*, manejo_ovelhas(ovelha_id)')
          .order('data_planejada', { ascending: true });

        if (error) throw error;

        return (data || []).map(m => ({
          id: m.id,
          titulo: m.titulo,
          tipo: m.tipo as TipoManejo,
          recorrencia: (m.recorrencia as Recorrencia) || Recorrencia.NENHUMA,
          recorrenciaConfig: m.recorrencia_config || {},
          dataPlanejada: m.data_planejada,
          horaPlanejada: m.hora_planejada ? m.hora_planejada.substring(0, 5) : '08:00',
          dataExecucao: m.data_execucao,
          colaborador: m.colaborador,
          status: m.status as StatusManejo,
          procedimento: m.procedimento,
          observacoes: m.observacoes,
          ovelhasIds: m.manejo_ovelhas?.map((mo: any) => mo.ovelha_id) || [],
          grupoId: m.grupo_id,
          created_at: m.created_at,
          editadoPorGerente: m.editado_por_gerente,
          dataUltimaEdicao: m.data_ultima_edicao
        }));
      } catch (err) {
        console.error("Erro ao buscar manejos:", err);
        return getLocalManejos();
      }
    }
    return getLocalManejos();
  },

  async create(manejo: Partial<Manejo>, ovelhasIds: string[]) {
    if (isSupabaseConfigured) {
      const { data: mData, error: mError } = await supabase
        .from('manejos')
        .insert([{
          titulo: manejo.titulo,
          procedimento: manejo.procedimento,
          tipo: manejo.tipo,
          recorrencia: manejo.recorrencia || Recorrencia.NENHUMA,
          recorrencia_config: manejo.recorrenciaConfig || {},
          grupo_id: manejo.grupoId || null,
          data_planejada: manejo.dataPlanejada,
          hora_planejada: manejo.horaPlanejada || '08:00',
          status: StatusManejo.PENDENTE
        }])
        .select()
        .single();

      if (mError) throw mError;

      if (!manejo.grupoId && ovelhasIds && ovelhasIds.length > 0) {
        const links = ovelhasIds.map(oid => ({
          manejo_id: mData.id,
          ovelha_id: oid
        }));
        await supabase.from('manejo_ovelhas').insert(links);
      }
      return mData;
    }

    const local = getLocalManejos();
    const newManejo = {
      ...manejo,
      id: crypto.randomUUID(),
      ovelhasIds: ovelhasIds || [],
      status: StatusManejo.PENDENTE,
      created_at: new Date().toISOString()
    } as Manejo;
    local.push(newManejo);
    saveLocalManejos(local);
    return newManejo;
  },

  async update(id: string, updateData: Partial<Manejo>) {
    const editTimestamp = new Date().toISOString();
    
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('manejos')
        .update({
          titulo: updateData.titulo,
          procedimento: updateData.procedimento,
          tipo: updateData.tipo,
          recorrencia: updateData.recorrencia,
          recorrencia_config: updateData.recorrenciaConfig,
          data_planejada: updateData.dataPlanejada,
          hora_planejada: updateData.horaPlanejada,
          grupo_id: updateData.grupoId || null,
          editado_por_gerente: true,
          data_ultima_edicao: editTimestamp,
          // Mantemos as observações originais a menos que explicitamente alteradas
          observacoes: updateData.observacoes
        })
        .eq('id', id);
      
      if (error) throw error;
    } else {
      const local = getLocalManejos();
      const idx = local.findIndex(m => m.id === id);
      if (idx !== -1) {
        local[idx] = { 
          ...local[idx], 
          ...updateData, 
          editadoPorGerente: true, 
          dataUltimaEdicao: editTimestamp 
        };
        saveLocalManejos(local);
      }
    }
  },

  async completeTask(id: string, colaborador: string, observacoes: string) {
    const timestamp = new Date().toISOString();
    
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('manejos')
        .update({
          status: StatusManejo.CONCLUIDO,
          data_execucao: timestamp,
          colaborador: colaborador.toUpperCase(),
          observacoes: observacoes
        })
        .eq('id', id);
      
      if (error) throw error;
    } else {
      const local = getLocalManejos();
      const index = local.findIndex(m => m.id === id);
      if (index !== -1) {
        local[index].status = StatusManejo.CONCLUIDO;
        local[index].dataExecucao = timestamp;
        local[index].colaborador = colaborador.toUpperCase();
        local[index].observacoes = observacoes;
        saveLocalManejos(local);
      }
    }
  },

  async delete(id: string) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('manejos').delete().eq('id', id);
      if (error) throw error;
    } else {
      const local = getLocalManejos().filter(m => m.id !== id);
      saveLocalManejos(local);
    }
  }
};
