import bankJson from '../data/bank.json';
import glmockJson from '../data/glmock.json';
import finalsJson from '../data/finals.json';
import type { Question } from './types';

export const BANK: Question[] = bankJson as unknown as Question[];
export const GL_MOCK: Question[] = glmockJson as unknown as Question[];
export const FINALS: Question[][] = finalsJson as unknown as Question[][];

const idx = new Map<string, Question>();
[...BANK, ...GL_MOCK, ...FINALS.flat()].forEach((q) => idx.set(q.id, q));
export const Q = (id: string): Question | undefined => idx.get(id);

export const KV_BANK = BANK.filter((q) => q.kv || q.pred);
export const kvSes = (q: Question) => (q.kv ? q.kv.slice(0, 4) : q.pred ? 'pred' : 'mock');
export const kvW = (s: string) => (s === 'pred' ? 4 : s === 'mock' ? 2 : ({ '26': 4, '25': 3, '24': 2, '23': 1.5, '22': 1 } as Record<string, number>)[s.slice(0, 2)] || 1);
export const kvLabel = (q: Question) => { if (q.pred) return '2026년 3회 예상'; if (!q.kv) return ''; const [y, r, n] = q.kv.split('-'); return `20${y}년 ${r}회 ${+n}번 변형`; };
export const kvSlot = (q: Question) => (q.area === 'code' ? 'code-' + (q.code?.lang || '') : q.area === 'sql' ? 'sql' : 'th');
export const isHard = (q: Question) => q.area === 'code' && !q.base && q.level !== 'exam';
/** 실전 이론 자리 풀: 기출 변형 + 예상 + 영역별 이론 문항 */
export const thPool = () => BANK.filter((q) => !q.base && !q.gl && q.area !== 'code' && q.area !== 'sql');

export const stats = {
  total: BANK.length,
  code: BANK.filter((q) => q.area === 'code').length,
  sql: BANK.filter((q) => q.area === 'sql').length,
  kv: BANK.filter((q) => q.kv).length,
  pred: BANK.filter((q) => q.pred).length,
  finals: FINALS.length,
};
