import { BANK, GL_MOCK, KV_BANK, kvSes, kvW, kvSlot, isHard, thPool, Q } from './bank';
import { store } from './store';
import { shuffle, weighted } from './util';
import type { Question } from './types';

export type Draft = {
  id: string; at: string; mode: 'area' | 'real' | 'final' | 'retry'; areas: string[]; tpl?: string;
  qs: string[]; ans: Record<string, string[]>; t0: number; label?: string;
};

const freshFirst = (seen: Set<string>, all: Question[]) => [...shuffle(all.filter((q) => !seen.has(q.id))), ...shuffle(all.filter((q) => seen.has(q.id)))];

function pickAreas(areas: string[], n: number): string[] {
  const seen = store.seen();
  const pools = shuffle(areas.slice()).map((a) => freshFirst(seen, BANK.filter((q) => q.area === a && !q.base)));
  const out: string[] = []; let k = 0;
  while (out.length < n && pools.some((p) => p.length)) { const p = pools[k++ % pools.length]; if (p.length) out.push(p.shift()!.id); }
  return shuffle(out);
}
function pickBy(pred: (q: Question) => boolean, n: number): string[] {
  const seen = store.seen();
  return freshFirst(seen, BANK.filter((q) => !q.base && pred(q))).slice(0, n).map((q) => q.id);
}

function mk(mode: Draft['mode'], areas: string[], qs: string[], extra: Partial<Draft> = {}): Draft {
  const ans: Record<string, string[]> = {};
  qs.forEach((id) => { ans[id] = (Q(id)?.blanks || []).map(() => ''); });
  return { id: 'm' + Date.now(), at: new Date().toISOString(), mode, areas, qs, ans, t0: Date.now(), ...extra };
}

/** 영역별 모의고사: 이론 n문항 + 코드 (20 − n)문항 (심화 함정은 1~2개) */
export function startArea(areas: string[], n: number): Draft {
  const cN = Math.max(0, 20 - n), hN = cN >= 7 ? 2 : cN >= 1 ? 1 : 0;
  const qs = shuffle([...pickAreas(areas, n), ...pickBy((q) => q.area === 'code' && q.level === 'exam', cN - hN), ...pickBy(isHard, hN)]);
  return mk('area', areas, qs);
}

/** 실전 모의고사: 기출 회차 하나를 틀로 잡고 같은 자리(코드 언어·SQL·이론 영역)를 변형 문항으로 채움 */
export function startReal(): Draft {
  const seen = store.seen();
  const sess = [...new Set(KV_BANK.filter((q) => q.kv).map(kvSes))];
  const tpl = weighted(sess, kvW);
  let slots: any[] = KV_BANK.filter((q) => kvSes(q) === tpl).sort((a, b) => a.kv!.localeCompare(b.kv!));
  const MIN_SQL = 3; let nSql = slots.filter((q) => kvSlot(q) === 'sql').length;
  if (nSql < MIN_SQL) {
    slots = slots.slice();
    const th = shuffle(slots.map((q, i) => (kvSlot(q) === 'th' ? i : -1)).filter((i) => i >= 0));
    for (const i of th) { if (nSql >= MIN_SQL) break; slots[i] = { area: 'sql', kv: slots[i].kv, _sql: true }; nSql++; }
  }
  const used = new Set<string>(), qs: string[] = [];
  // 용어집 단답형 1~2문항
  { const nGl = Math.random() < 0.5 ? 1 : 2, th = shuffle(slots.map((q, i) => (kvSlot(q) === 'th' && !q._sql ? i : -1)).filter((i) => i >= 0));
    let fresh = shuffle(GL_MOCK.filter((q) => !seen.has(q.id))); if (fresh.length < nGl) fresh = shuffle(GL_MOCK);
    for (let k = 0; k < nGl && k < th.length && fresh.length; k++) { const g = fresh.pop()!; slots[k === 0 ? th[0] : th[1]] = g; } }
  const last = store.lastSeen();
  slots.forEach((s) => {
    if (s.gl) { used.add(s.id); qs.push(s.id); return; }
    const key = kvSlot(s);
    const src = key === 'th' ? thPool() : KV_BANK;
    let pool = src.filter((q) => !used.has(q.id) && kvSlot(q) === key && (key !== 'th' || q.area === s.area));
    if (key === 'th' && !pool.length) pool = src.filter((q) => !used.has(q.id) && kvSlot(q) === 'th');
    let fresh = pool.filter((q) => !seen.has(q.id));
    if (key === 'th' && !fresh.length) fresh = src.filter((q) => !used.has(q.id) && kvSlot(q) === 'th' && !seen.has(q.id));
    if (fresh.length) pool = fresh;
    else pool = pool.slice().sort((a, b) => (last[a.id] || '').localeCompare(last[b.id] || '')).slice(0, Math.max(3, Math.ceil(pool.length / 4)));
    if (!pool.length) return;
    const q = weighted(pool, (q) => kvW(kvSes(q))); used.add(q.id); qs.push(q.id);
  });
  return mk('real', ['__exam'], qs, { tpl });
}

export function startFinal(n: number, qs: Question[]): Draft {
  return mk('final', ['__final'], qs.map((q) => q.id), { label: `최종 모의고사 ${n}회` });
}

/** 오답 다시 풀기: 마지막에 틀린 문항들 */
export function startRetry(ids: string[]): Draft {
  return mk('retry', ['__retry'], shuffle(ids));
}
