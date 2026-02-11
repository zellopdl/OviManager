
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { BreedingPlan, BreedingPlanEwe, BreedingCycleResult, Status } from '../types';
import { sheepService } from './sheepService';

const STORAGE_KEY = 'ovimanager_breeding_plans';

export const breedingPlanService = {
  async getAll(): Promise<BreedingPlan[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('lotes_monta')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return (data || []).map(d => ({
          id: d.id,
          nome: d.nome,
          reprodutorId: d.reprodutor_id,
          dataSincronizacao: d.data_sincronizacao,
          dataInicioMonta: d.data_inicio_monta,
          status: d.status,
          ovelhas: d.ovelhas_json || [],
          created_at: d.created_at
        }));
      } catch (err) {
        console.error("Erro ao buscar lotes:", err);
        return [];
      }
    }
    const local = localStorage.getItem(STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  },

  async create(plan: Partial<BreedingPlan>) {
    const newPlan: BreedingPlan = {
      id: crypto.randomUUID(),
      nome: plan.nome || 'Lote de Monta',
      dataSincronizacao: plan.dataSincronizacao || undefined,
      dataInicioMonta: plan.dataInicioMonta || new Date().toISOString().split('T')[0],
      status: 'sincronizacao',
      ovelhas: plan.ovelhas || [],
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('lotes_monta').insert([{
        nome: newPlan.nome,
        data_sincronizacao: newPlan.dataSincronizacao || null,
        data_inicio_monta: newPlan.dataInicioMonta,
        status: newPlan.status,
        ovelhas_json: newPlan.ovelhas
      }]).select();
      
      if (error) {
        console.error("Erro Supabase create lote:", error);
        throw new Error(error.message);
      }
      return data?.[0];
    }

    const plans = await breedingPlanService.getAll();
    plans.push(newPlan);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return newPlan;
  },

  async removeEwe(planId: string, eweId: string) {
    // 1. Primeiro limpa o status de prenha no cadastro da ovelha (independente do lote)
    await sheepService.update(eweId, { prenha: false, pai: null });

    // 2. Busca todos os lotes para encontrar o alvo
    const plans = await breedingPlanService.getAll();
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
      throw new Error("Lote não encontrado.");
    }

    // 3. Filtra a ovelha removendo-a do array
    const updatedOvelhas = (plan.ovelhas || []).filter(e => e.eweId !== eweId);

    // 4. Persiste a alteração
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('lotes_monta')
        .update({ ovelhas_json: updatedOvelhas })
        .eq('id', planId);
      
      if (error) {
        console.error("Erro ao remover ovelha no Supabase:", error);
        throw error;
      }
    } else {
      const allPlans = plans.map(p => p.id === planId ? { ...p, ovelhas: updatedOvelhas } : p);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allPlans));
    }
  },

  async moveEwe(sourcePlanId: string, targetPlanId: string, eweId: string) {
    const plans = await breedingPlanService.getAll();
    const sourcePlan = plans.find(p => p.id === sourcePlanId);
    const targetPlan = plans.find(p => p.id === targetPlanId);

    if (!sourcePlan || !targetPlan) return;

    const eweData = (sourcePlan.ovelhas || []).find(e => e.eweId === eweId);
    if (!eweData) return;

    // Remover da origem
    sourcePlan.ovelhas = sourcePlan.ovelhas.filter(e => e.eweId !== eweId);
    
    // Adicionar ao destino (resetando progresso para o novo lote)
    const newEweEntry: BreedingPlanEwe = {
      eweId: eweId,
      cioDetectado: false,
      tentativas: 1,
      resultados: { 1: BreedingCycleResult.PENDENTE, 2: BreedingCycleResult.PENDENTE, 3: BreedingCycleResult.PENDENTE },
      finalizado: false
    };
    targetPlan.ovelhas.push(newEweEntry);

    if (isSupabaseConfigured) {
      await supabase.from('lotes_monta').update({ ovelhas_json: sourcePlan.ovelhas }).eq('id', sourcePlanId);
      await supabase.from('lotes_monta').update({ ovelhas_json: targetPlan.ovelhas }).eq('id', targetPlanId);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    }
  },

  async confirmHeat(planId: string, eweId: string, detected: boolean) {
    const plans = await breedingPlanService.getAll();
    const planIndex = plans.findIndex(p => p.id === planId);
    if (planIndex === -1) return;

    const plan = plans[planIndex];
    const eweIndex = plan.ovelhas.findIndex(e => e.eweId === eweId);
    if (eweIndex === -1) return;

    plan.ovelhas[eweIndex].cioDetectado = detected;
    plan.ovelhas[eweIndex].dataCio = detected ? new Date().toISOString() : undefined;
    
    if (!detected) {
      plan.ovelhas[eweIndex].reprodutorId = undefined;
      plan.ovelhas[eweIndex].dataPrimeiraMonta = undefined;
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('lotes_monta').update({ ovelhas_json: plan.ovelhas }).eq('id', planId);
      if (error) throw error;
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    }
  },

  async assignRam(planId: string, eweId: string, reprodutorId: string, date: string) {
    const plans = await breedingPlanService.getAll();
    const planIndex = plans.findIndex(p => p.id === planId);
    if (planIndex === -1) return;

    const plan = plans[planIndex];
    const eweIndex = plan.ovelhas.findIndex(e => e.eweId === eweId);
    if (eweIndex === -1) return;

    plan.ovelhas[eweIndex].reprodutorId = reprodutorId;
    plan.ovelhas[eweIndex].dataPrimeiraMonta = date || new Date().toISOString().split('T')[0];

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('lotes_monta').update({ ovelhas_json: plan.ovelhas }).eq('id', planId);
      if (error) throw error;
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    }
  },

  async updateEweResult(planId: string, eweId: string, cycle: 1 | 2 | 3, result: BreedingCycleResult) {
    const plans = await breedingPlanService.getAll();
    const planIndex = plans.findIndex(p => p.id === planId);
    if (planIndex === -1) return;

    const plan = plans[planIndex];
    const eweIndex = plan.ovelhas.findIndex(e => e.eweId === eweId);
    if (eweIndex === -1) return;

    const ewe = plan.ovelhas[eweIndex];
    ewe.resultados[cycle] = result;
    
    if (result === BreedingCycleResult.PRENHA) {
      ewe.finalizado = true;
      await sheepService.update(eweId, { 
        prenha: true, 
        pai: ewe.reprodutorId 
      });
    } else if (cycle === 3 && result === BreedingCycleResult.VAZIA) {
      ewe.finalizado = true;
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('lotes_monta').update({ ovelhas_json: plan.ovelhas }).eq('id', planId);
      if (error) throw error;
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    }
  },

  async discardEwe(planId: string, eweId: string) {
    await sheepService.update(eweId, { status: Status.DESCARTE });
  },

  async delete(id: string) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('lotes_monta').delete().eq('id', id);
      if (error) throw error;
    } else {
      const plans = (await breedingPlanService.getAll()).filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    }
  }
};
