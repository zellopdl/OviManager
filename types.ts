
export enum Sexo {
  MACHO = 'macho',
  FEMEA = 'femea'
}

export enum Status {
  ATIVO = 'ativo',
  DESCARTE = 'descarte',
  OBITO = 'obito'
}

export enum Sanidade {
  SAUDAVEL = 'saudavel',
  ENFERMARIA = 'enfermaria',
  OBITO = 'obito'
}

export enum BreedingCycleResult {
  PENDENTE = 'pendente',
  PRENHA = 'prenha',
  VAZIA = 'vazia'
}

export interface BreedingPlanEwe {
  eweId: string;
  cioDetectado: boolean;
  dataCio?: string;
  reprodutorId?: string;
  dataPrimeiraMonta?: string;
  tentativas: number;
  resultados: {
    1: BreedingCycleResult;
    2: BreedingCycleResult;
    3: BreedingCycleResult;
  };
  finalizado: boolean;
}

export interface BreedingPlan {
  id: string;
  nome: string;
  reprodutorId?: string;
  dataSincronizacao?: string;
  dataInicioMonta: string;
  status: 'sincronizacao' | 'em_monta' | 'concluido';
  ovelhas: BreedingPlanEwe[];
  created_at?: string;
}

export enum BreedingStatus {
  COBERTA = 'coberta',
  CONFIRMADA = 'confirmada',
  PARTO = 'parto',
  FALHA = 'falha'
}

export interface BreedingRecord {
  id: string;
  matrizId: string;
  reprodutorId: string;
  dataCobertura: string;
  dataPrevisaoParto: string;
  dataPartoReal?: string;
  status: BreedingStatus;
  observacoes?: string;
  created_at?: string;
}

export enum TipoManejo {
  RECORRENTE = 'recorrente',
  SAZONAL = 'sazonal',
  IMPREVISIVEL = 'imprevisivel'
}

export enum StatusManejo {
  PENDENTE = 'pendente',
  CONCLUIDO = 'concluido',
  CANCELADO = 'cancelado'
}

export enum Recorrencia {
  NENHUMA = 'nenhuma',
  DIARIA = 'diaria',
  SEMANAL = 'semanal',
  MENSAL = 'mensal',
  ANUAL = 'anual'
}

export interface RecorrenciaConfig {
  diasSemana?: number[];
  diasMes?: number[];
  mesesAnual?: number[]; // [0-11]
  intervaloDiario?: number; // x em x dias
  duracaoValor?: number | null;
  dataInicioReferencia?: string;
  contagem?: number;
}

export interface Breed {
  id: string;
  nome: string;
}

export interface Supplier {
  id: string;
  nome: string;
  endereco?: string;
  contato?: string;
  celular?: string;
  fornece?: string;
}

export interface Group {
  id: string;
  nome: string;
}

export interface Paddock {
  id: string;
  piquete: string;
  tamanho: number | null;
  lotacao: number;
  grama: string | null;
  created_at?: string;
}

export interface WeightHistory {
  id: string;
  ovelha_id: string;
  peso: number;
  data: string;
}

export interface Sheep {
  id: string;
  brinco: string;
  nome: string;
  nascimento: string;
  sexo: Sexo;
  racaId: string;
  origem: string;
  piqueteId: string;
  peso: number;
  saude: string;
  sanidade: Sanidade;
  famacha: number;
  ecc: number;
  grupoId: string;
  status: Status;
  prenha: boolean;
  pai?: string;
  mae?: string;
  obs?: string;
  createdAt: string;
  historicoPeso?: WeightHistory[];
}

export interface Manejo {
  id: string;
  titulo: string;
  tipo: TipoManejo;
  recorrencia: Recorrencia;
  recorrenciaConfig?: RecorrenciaConfig;
  dataPlanejada: string;
  horaPlanejada?: string;
  dataExecucao?: string;
  colaborador?: string;
  status: StatusManejo;
  procedimento?: string;
  observacoes?: string;
  ovelhasIds?: string[];
  grupoId?: string;
  created_at?: string;
}

export interface KnowledgeEntry {
  id: string;
  titulo: string;
  assunto: string;
  conteudo: string;
  created_at?: string;
}

export interface DashboardStats {
  total: number;
  ativos: number;
  machos: number;
  femeas: number;
  mediaPeso: number;
}
