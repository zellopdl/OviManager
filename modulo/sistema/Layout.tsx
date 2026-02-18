
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  headerExtra?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, headerExtra }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    const saved = localStorage.getItem('ovi_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ovi_sidebar_collapsed', String(isDesktopCollapsed));
  }, [isDesktopCollapsed]);

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: '📊', category: 'Principal' },
    { id: 'charts', label: 'Análises', icon: '📈', category: 'Principal' },
    { id: 'sheep', label: 'Rebanho', icon: '🐑', category: 'Principal' },
    { id: 'weight', label: 'Pesagem', icon: '⚖️', category: 'Operacional' },
    { id: 'repro', label: 'Reprodução', icon: '🧬', category: 'Operacional' },
    { id: 'manejo', label: 'Agenda', icon: '📅', category: 'Operacional' },
    { id: 'guia', label: 'Consultoria', icon: '💡', category: 'Suporte' },
    { id: 'racas', label: 'Raças', icon: '🏷️', category: 'Cadastros' },
    { id: 'piquetes', label: 'Piquetes', icon: '🌾', category: 'Cadastros' },
    { id: 'grupos', label: 'Grupos', icon: '👥', category: 'Cadastros' },
    { id: 'suppliers', label: 'Fornecedores', icon: '🚚', category: 'Cadastros' },
    { id: 'settings', label: 'Ajustes', icon: '⚙️', category: 'Sistema' },
  ];

  const bottomTabs = menuItems.filter(item => ['dashboard', 'charts', 'sheep', 'weight'].includes(item.id));

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  return (
    <div className="flex h-safe-screen w-full bg-slate-50 overflow-hidden flex-col md:flex-row">
      <aside 
        className={`hidden md:flex flex-col bg-slate-900 text-white shadow-xl z-20 transition-all duration-300 ease-in-out ${
          isDesktopCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`p-5 border-b border-slate-800 flex items-center transition-all ${isDesktopCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-lg shadow-lg shadow-emerald-500/20 shrink-0">
            🐑
          </div>
          {!isDesktopCollapsed && (
            <h1 className="text-lg font-black tracking-tight">OviManager</h1>
          )}
        </div>
        
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {['Principal', 'Operacional', 'Suporte', 'Cadastros', 'Sistema'].map(cat => (
            <div key={cat} className="space-y-1">
              {!isDesktopCollapsed && (
                <h3 className="px-3 text-[9px] uppercase tracking-widest text-slate-500 font-black mb-1">
                  {cat}
                </h3>
              )}
              <div className="space-y-0.5">
                {menuItems.filter(i => i.category === cat).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={isDesktopCollapsed ? item.label : ''}
                    className={`w-full flex items-center rounded-xl transition-all no-select group ${
                      isDesktopCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'
                    } ${
                      activeTab === item.id 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <span className={`text-base transition-transform group-hover:scale-110`}>
                      {item.icon}
                    </span>
                    {!isDesktopCollapsed && (
                      <span className="font-bold text-[11px] uppercase tracking-tight">
                        {item.label}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all ${
              isDesktopCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'
            }`}
          >
            <span className="text-lg">🚪</span>
            {!isDesktopCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>}
          </button>
          
          <button 
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
          >
            <span className={`transition-transform duration-300 ${isDesktopCollapsed ? 'rotate-180' : ''}`}>
              {isDesktopCollapsed ? '➡️' : '⬅️'}
            </span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="bg-white border-b border-slate-200 h-14 md:h-16 flex items-center justify-between px-6 md:px-8 shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-sm">🐑</div>
            <h2 className="text-md md:text-lg font-black text-slate-800 capitalize tracking-tight truncate">
              {menuItems.find(m => m.id === activeTab)?.label || 'OviManager'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50/50">
          <div className="max-w-7xl mx-auto p-4 md:p-8 pb-32 md:pb-12">
            {children}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around items-center h-18 px-4 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-t-[28px]">
        {bottomTabs.map((item) => (
          <button
            key={item.id}
            onClick={() => { handleTabClick(item.id); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full py-3 transition-all no-select ${
              activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <span className={`text-2xl transition-transform ${activeTab === item.id ? 'scale-110' : ''}`}>{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
