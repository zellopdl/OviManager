
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import ChartsView from './components/ChartsView.tsx';
import SheepTable from './components/SheepTable.tsx';
import SheepForm from './components/SheepForm.tsx';
import ManejoManager from './components/ManejoManager.tsx';
import KnowledgeAssistant from './components/KnowledgeAssistant.tsx';
import EntityManager from './components/EntityManager.tsx';
import PaddockManager from './components/PaddockManager.tsx';
import SupplierManager from './components/SupplierManager.tsx';
import LogoGenerator from './components/LogoGenerator.tsx';
import WeightManager from './components/WeightManager.tsx';
import ReproductionManager from './components/ReproductionManager.tsx';
import Login from './components/Login.tsx';
import { Sheep, Breed, Supplier, Group, Paddock } from './types.ts';
import { sheepService } from './services/sheepService.ts';
import { entityService } from './services/entityService.ts';
import { getSheepInsight } from './services/geminiService.ts';
import { supabase, isSupabaseConfigured } from './lib/supabase.ts';
import { SUPABASE_SCHEMA_SQL } from './constants.tsx';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingSheep, setEditingSheep] = useState<Sheep | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'online' | 'local'>('connecting');
  const [aiStatus, setAiStatus] = useState<'online' | 'error' | 'none'>(process.env.API_KEY ? 'online' : 'none');
  
  const [analysisSheep, setAnalysisSheep] = useState<Sheep | null>(null);
  const [analysisText, setAnalysisText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const [managerPassword, setManagerPassword] = useState(() => localStorage.getItem('ovi_manager_pwd') || '1234');
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [unlockInput, setUnlockInput] = useState('');

  const [sheep, setSheep] = useState<Sheep[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [paddocks, setPaddocks] = useState<Paddock[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setAuthLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    } else {
      setAuthLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async (forceLocal = false) => {
    if (!session && isSupabaseConfigured) return;

    try {
      if (!forceLocal && isSupabaseConfigured) setConnectionStatus('connecting');
      else setConnectionStatus('local');

      const [sData, bData, supData, gData, pData] = await Promise.all([
        sheepService.getAll().catch(e => { console.warn("Erro sheepService:", e); return []; }),
        entityService.getAll('racas').catch(e => { console.warn("Erro racas:", e); return []; }),
        entityService.getAll('fornecedores').catch(e => { console.warn("Erro fornecedores:", e); return []; }),
        entityService.getAll('grupos').catch(e => { console.warn("Erro grupos:", e); return []; }),
        entityService.getAll('piquetes').catch(e => { console.warn("Erro piquetes:", e); return []; })
      ]);

      setSheep(sData || []); 
      setBreeds(bData || []); 
      setSuppliers(supData || []); 
      setGroups(gData || []); 
      setPaddocks((pData as Paddock[]) || []);
      
      if (!forceLocal && isSupabaseConfigured) setConnectionStatus('online');
    } catch (err) {
      console.error("Erro crítico no carregamento:", err);
      setConnectionStatus('local');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { 
    if (session || !isSupabaseConfigured) {
      loadInitialData(); 
    }
  }, [loadInitialData, session]);

  const handleAnalyzeSheep = async (s: Sheep) => {
    setAnalysisSheep(s);
    setAnalyzing(true);
    setAnalysisText('');
    const breedName = breeds.find(b => b.id === s.racaId)?.nome || 'SRD';
    try {
      const res = await getSheepInsight(s, breedName);
      setAnalysisText(res || "Não foi possível gerar análise.");
      if (res.includes("CHAVE INVÁLIDA")) setAiStatus('error');
      else if (process.env.API_KEY) setAiStatus('online');
    } catch (err) {
      setAnalysisText("Erro de rede ao conectar com a IA.");
      setAiStatus('error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUnlock = () => {
    if (unlockInput === managerPassword) {
      setIsSettingsUnlocked(true);
      setUnlockInput('');
    } else {
      alert("Senha de gestor incorreta!");
      setUnlockInput('');
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    alert("Script SQL copiado! Use no Editor SQL do seu Supabase.");
  };

  const HeaderActions = (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full transition-all ${
        aiStatus === 'online' ? 'bg-indigo-50 border-indigo-100' : 
        aiStatus === 'error' ? 'bg-rose-50 border-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.1)]' : 
        'bg-slate-50 border-slate-100'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${
          aiStatus === 'online' ? 'bg-indigo-500 animate-pulse' : 
          aiStatus === 'error' ? 'bg-rose-500 shadow-[0_0_5px_#f43f5e]' : 'bg-slate-300'
        }`}></div>
        <span className={`text-[9px] font-black uppercase tracking-widest ${
          aiStatus === 'online' ? 'text-indigo-600' : 
          aiStatus === 'error' ? 'text-rose-600' : 'text-slate-400'
        }`}>
          {aiStatus === 'online' ? 'Gemini 3.0' : aiStatus === 'error' ? 'IA OFF' : 'IA Pendente'}
        </span>
      </div>
      
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
        }`}></div>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline">
          {connectionStatus === 'online' ? 'Nuvem' : 'Local'}
        </span>
      </div>
    </div>
  );

  const handleSheepSubmit = async (data: Partial<Sheep>) => {
    setIsSaving(true);
    try {
      if (editingSheep) {
        await sheepService.update(editingSheep.id, data);
      } else {
        await sheepService.create(data);
      }
      await loadInitialData();
      setView('list');
    } catch (err: any) {
      alert(err.message || "Erro ao salvar animal.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 animate-pulse">
        <div className="relative">
          <div className="h-14 w-14 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-xs">🐑</div>
        </div>
        <div className="text-center">
          <p className="text-slate-800 font-black text-xs uppercase tracking-[0.2em]">OviManager</p>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Sincronizando Rebanho...</p>
        </div>
      </div>
    );

    const safeSheep = sheep || [];

    switch (activeTab) {
      case 'dashboard': return <Dashboard sheep={safeSheep} breeds={breeds} groups={groups} />;
      case 'charts': return <ChartsView sheep={safeSheep} breeds={breeds} groups={groups} />;
      case 'guia': return <KnowledgeAssistant />;
      case 'manejo': return <ManejoManager sheep={safeSheep} paddocks={paddocks} groups={groups} onRefreshSheep={loadInitialData} managerPassword={managerPassword} />;
      case 'weight': return <WeightManager sheep={safeSheep} groups={groups} onRefresh={loadInitialData} />;
      case 'repro': return <ReproductionManager sheep={safeSheep} onRefresh={loadInitialData} />;
      case 'sheep':
        return view === 'list' ? (
          <SheepTable sheep={safeSheep} breeds={breeds} suppliers={suppliers} groups={groups} paddocks={paddocks}
            onEdit={(s) => { setEditingSheep(s); setView('form'); }}
            onDelete={async (id) => { 
              try {
                await sheepService.delete(id); 
                await loadInitialData(); 
              } catch (e: any) {
                alert("Falha ao excluir animal: " + (e.message || "Erro de conexão"));
              }
            }}
            onAdd={() => { setEditingSheep(undefined); setView('form'); }}
            onAnalyze={handleAnalyzeSheep} />
        ) : (
          <SheepForm sheep={editingSheep} breeds={breeds} suppliers={suppliers} groups={groups} paddocks={paddocks}
            onSubmit={handleSheepSubmit} 
            onCancel={() => setView('list')} 
            existingSheep={safeSheep} />
        );
      case 'racas': return <EntityManager title="Raças" tableName="racas" icon="🏷️" initialData={breeds} onRefresh={loadInitialData} sheep={safeSheep} />;
      case 'grupos': return <EntityManager title="Grupos de Rebanho" tableName="grupos" icon="👥" initialData={groups} onRefresh={loadInitialData} sheep={safeSheep} />;
      case 'piquetes': return <PaddockManager initialData={paddocks} onRefresh={loadInitialData} sheep={safeSheep} />;
      case 'suppliers': return <SupplierManager initialData={suppliers} onRefresh={loadInitialData} sheep={safeSheep} />;
      case 'settings': return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
          {!isSettingsUnlocked ? (
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🔐</div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Painel de Gestão</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8 leading-relaxed">
                Área restrita para configurações de<br/>Segurança e Banco de Dados.
              </p>
              
              <div className="space-y-4 max-w-xs mx-auto">
                <input 
                  type="password" 
                  autoFocus
                  placeholder="Senha de Gestor"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-center tracking-[0.3em] focus:border-emerald-500 transition-all"
                  value={unlockInput}
                  onChange={(e) => setUnlockInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                />
                <button 
                  onClick={handleUnlock}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                >
                  Liberar Acesso
                </button>
                <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-4">Padrão: 1234</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between px-2">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ajustes Avançados</h3>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Acesso Autorizado</p>
                </div>
                <button 
                  onClick={() => setIsSettingsUnlocked(false)}
                  className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-rose-100"
                >
                  Sair do Painel
                </button>
              </div>

              <LogoGenerator />

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-tight flex items-center gap-2">
                  <span className="text-base">🔑</span> Credenciais
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Alterar Senha do Gestor</label>
                    <input 
                      type="password" 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm tracking-widest" 
                      value={managerPassword} 
                      onChange={(e) => { setManagerPassword(e.target.value); localStorage.setItem('ovi_manager_pwd', e.target.value); }} 
                    />
                  </div>
                  <div className="pt-4 border-t">
                    <button 
                      onClick={handleLogout}
                      className="w-full py-4 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
                    >
                      🚪 Encerrar Sessão (Sair)
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest">Cloud</span>
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-tight flex items-center gap-2">
                  <span className="text-base">🗄️</span> Banco de Dados
                </h3>
                <div className="space-y-4">
                  <button 
                    onClick={copySqlSchema}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-black"
                  >
                    Copiar Script SQL para Supabase
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
      default: return null;
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center flex-col gap-4">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Verificando Credenciais...</p>
    </div>
  );

  if (!session && isSupabaseConfigured) {
    return <Login />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} headerExtra={HeaderActions}>
      <div className="min-w-0 w-full overflow-x-hidden">
        {renderContent()}
      </div>
      
      {analysisSheep && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 pb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Parecer da IA</h3>
                  <p className="text-emerald-600 font-black text-[10px] uppercase tracking-widest mt-1">Animal: {analysisSheep.nome} (#{analysisSheep.brinco})</p>
                </div>
                <button onClick={() => setAnalysisSheep(null)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">✕</button>
              </div>
              
              <div className={`rounded-2xl p-6 border min-h-[200px] relative overflow-y-auto max-h-[50vh] custom-scrollbar ${
                analysisText.includes("CHAVE INVÁLIDA") ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50/50 border-indigo-100'
              }`}>
                {analyzing ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Consultando Especialista...</p>
                  </div>
                ) : (
                  <div className={`text-sm leading-relaxed font-medium italic whitespace-pre-wrap ${
                    analysisText.includes("CHAVE INVÁLIDA") ? 'text-rose-700' : 'text-slate-800'
                  }`}>
                    {analysisText}
                  </div>
                )}
              </div>
            </div>
            <div className="p-8 pt-4">
              <button onClick={() => setAnalysisSheep(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Fechar Análise</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
