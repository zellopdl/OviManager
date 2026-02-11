
import React from 'react';

export const FAMACHA_OPTIONS = [
  { value: 1, label: '1 - Ótimo (Vermelho Vivo)' },
  { value: 2, label: '2 - Bom (Rosa)' },
  { value: 3, label: '3 - Atenção (Rosa Pálido)' },
  { value: 4, label: '4 - Ruim (Branco/Anêmico)' },
  { value: 5, label: '5 - Crítico (Severamente Anêmico)' },
];

export const ECC_OPTIONS = [
  { value: 1, label: '1 - Muito Magra (Caquética)' },
  { value: 2, label: '2 - Magra' },
  { value: 3, label: '3 - Ideal / Moderada' },
  { value: 4, label: '4 - Gorda' },
  { value: 5, label: '5 - Muito Gorda (Obesa)' },
];

export const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'descarte', label: 'Descarte' },
  { value: 'obito', label: 'Óbito' },
];

export const SANIDADE_OPTIONS = [
  { value: 'saudavel', label: 'Saudável' },
  { value: 'enfermaria', label: 'Enfermaria' },
  { value: 'obito', label: 'Óbito' },
];

export const SEXO_OPTIONS = [
  { value: 'macho', label: 'Macho' },
  { value: 'femea', label: 'Fêmea' },
];

export const PRENHA_OPTIONS = [
  { value: true, label: 'Prenha' },
  { value: false, label: 'Não Prenha' },
];

export const TIPO_MANEJO_OPTIONS = [
  { value: 'recorrente', label: 'Recorrente (Rotina Diária)' },
  { value: 'sazonal', label: 'Sazonal (Previsível/Planejado)' },
  { value: 'imprevisivel', label: 'Imprevisível (Emergência/Reparo)' },
];

export const RECORRENCIA_OPTIONS = [
  { value: 'nenhuma', label: 'Tarefa Única' },
  { value: 'diaria', label: 'Repetição Diária' },
  { value: 'semanal', label: 'Repetição Semanal' },
  { value: 'mensal', label: 'Repetição Mensal' },
  { value: 'anual', label: 'Repetição Anual' },
];

export const SUPABASE_SCHEMA_SQL = `-- SCRIPT DE ATUALIZAÇÃO OVIMANAGER v2.5 (Cronograma Cronológico)

-- Tabelas Base:
CREATE TABLE IF NOT EXISTS public.piquetes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  piquete TEXT UNIQUE NOT NULL,
  tamanho REAL,
  lotacao REAL DEFAULT 0,
  grama TEXT
);

CREATE TABLE IF NOT EXISTS public.racas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL,
  endereco TEXT,
  contato TEXT,
  celular TEXT,
  fornece TEXT
);

CREATE TABLE IF NOT EXISTS public.grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ovelhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brinco TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  nascimento DATE,
  sexo TEXT,
  raca_id UUID REFERENCES public.racas(id),
  origem TEXT,
  piquete_id UUID REFERENCES public.piquetes(id),
  peso NUMERIC DEFAULT 0,
  saude TEXT,
  sanidade TEXT DEFAULT 'saudavel',
  famacha INTEGER DEFAULT 1,
  ecc NUMERIC DEFAULT 3,
  grupo_id UUID REFERENCES public.grupos(id),
  status TEXT DEFAULT 'ativo',
  prenha BOOLEAN DEFAULT false,
  pai TEXT,
  mae TEXT,
  obs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.manejos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  recorrencia TEXT DEFAULT 'nenhuma',
  recorrencia_config JSONB DEFAULT '{}'::jsonb,
  grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL,
  data_planejada DATE DEFAULT CURRENT_DATE,
  hora_planejada TIME DEFAULT '08:00',
  data_execucao DATE,
  colaborador TEXT,
  status TEXT DEFAULT 'pendente',
  procedimento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.manejo_ovelhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manejo_id UUID REFERENCES public.manejos(id) ON DELETE CASCADE,
  ovelha_id UUID REFERENCES public.ovelhas(id) ON DELETE CASCADE,
  UNIQUE(manejo_id, ovelha_id)
);
`;
