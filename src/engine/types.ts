export type Blank = { label?: string; answer: string; accept?: string[]; order?: boolean };

export type SqlTable = { name: string; cols: string[]; types: string[]; rows: any[][] };
export type SqlSpec = {
  tables: SqlTable[];
  kind?: 'select' | 'dml';
  expect?: string;
  target?: string;
  ordered?: boolean;
  cond?: string[];
  showResult?: boolean;
  query?: string; // value 유형
  rowcount?: boolean;
  resultCols?: string[];
  resultRows?: any[][];
};

export type Question = {
  id: string;
  area: string;
  concept: string;
  type: 'short' | 'box' | 'sql' | 'value' | 'code' | 'codeblank';
  stem: string;
  passage?: string;
  table?: { head: string[]; rows: string[][] };
  box?: string[];
  blanks: Blank[];
  explain?: string;
  trap?: string;
  solve?: string;
  code?: { lang: 'c' | 'java' | 'python'; src: string; filled?: string; expected?: string };
  sql?: SqlSpec;
  kv?: string; // 기출 변형 "YY-R-NN"
  pred?: string; // 예상 "26-3"
  level?: string;
  base?: boolean;
  gl?: boolean;
  glid?: string;
};

export type BlankResult = { ok: boolean; msg?: string; mine?: any; want?: any };

export type ExamRecord = {
  id: string;
  at: string;
  mode: 'area' | 'real' | 'final' | 'retry';
  areas: string[];
  tpl?: string;
  qs: string[];
  ans: Record<string, string[]>;
  res: Record<string, BlankResult[]>;
  score: number;
  full: number;
  n: number;
  sec: number;
};

export type Gloss = { id: string; area: string; c: string; t: string; sub?: string; d: string; kw?: string; lv: 'A' | 'B' | 'C' };

export type ConceptQ = { id: string; area: string; c: string; q: string; a: string; acc: string[]; d: string[]; choiceOnly?: boolean; lv?: string };

export const AREA_NAME: Record<string, string> = {
  req: '요구사항·설계', db: '데이터베이스', sql: 'SQL', itf: '인터페이스·통합', test: '테스트',
  os: '운영체제', net: '네트워크', sec: '보안', code: '프로그래밍', mgmt: '관리·신기술',
};
export const AREA_ORDER = ['req', 'db', 'sql', 'itf', 'test', 'os', 'net', 'sec', 'mgmt', 'code'];
export const areaName = (id: string) => AREA_NAME[id] || id;
