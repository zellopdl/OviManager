
import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO DO SUPABASE
 */

// --- DADOS DO PROJETO ---
const MANUAL_URL = 'https://tonmhmaxwdhinwdkppfd.supabase.co';
const MANUAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbm1obWF4d2RoaW53ZGtwcGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODAzMzQsImV4cCI6MjA4NDE1NjMzNH0.m7HQa-OOIN5-H57JttvdaLnlBGPh1J1y4NBFSjis2ww';
// ------------------------------

const getEnvValue = (key: string): string => {
  try {
    // @ts-ignore
    const env = typeof process !== 'undefined' ? process.env : (window as any).process?.env;
    return env?.[key] || '';
  } catch {
    return '';
  }
};

const SUPABASE_URL = getEnvValue('SUPABASE_URL') || MANUAL_URL;
const SUPABASE_ANON_KEY = getEnvValue('SUPABASE_ANON_KEY') || MANUAL_KEY;

// Validação: Se houver URL e Key que não sejam os placeholders padrão, considera configurado.
export const isSupabaseConfigured = !!(
  SUPABASE_URL && 
  SUPABASE_URL.startsWith('http') && 
  !SUPABASE_URL.includes('your-project') &&
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY.length > 20
);

if (!isSupabaseConfigured) {
  console.warn("⚠️ [Supabase] Configuração não detectada ou incompleta. Usando LocalStorage.");
} else {
  console.log("🚀 [Supabase] Cliente inicializado com sucesso.");
}

export const supabase = isSupabaseConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null as any;
