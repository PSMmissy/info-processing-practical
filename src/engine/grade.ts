import type { Question, BlankResult } from './types';
import { nrm, jamo, normOut } from './util';
import { gradeSql } from './sql';

export function gradeBlank(q: Question, i: number, v: string): BlankResult {
  const b = q.blanks[i];
  v = String(v || '').trim();
  if (!v) return { ok: false };
  if (q.type === 'sql') return gradeSql(q.sql!, v);
  if (q.type === 'code') return { ok: [b.answer, ...(b.accept || [])].some((k) => normOut(k) === normOut(v)) };
  if (q.type === 'codeblank') {
    const w = (x: string) => String(x).replace(/\s+/g, '').replace(/;$/, '');
    return { ok: [b.answer, ...(b.accept || [])].some((k) => w(k) === w(v)) };
  }
  if (q.type === 'box') {
    const srt = (x: string) => (b.order ? x : x.split('').sort().join(''));
    const want = srt(jamo(b.answer)), got = srt(jamo(v)), rest = v.replace(/[ㄱ-ㅎ\s,.\-→>()·]/g, '');
    if (!got) return { ok: false, msg: '〈보기〉의 기호로 써야 해.' };
    return { ok: got === want && !rest };
  }
  const keys = [b.answer, ...(b.accept || [])];
  if (/^-?[\d,]+(\.\d+)?$/.test(String(b.answer).trim())) {
    const num = (x: string) => { const t = String(x).replace(/[\s,]/g, '').replace(/^[가-힣A-Za-z]+/, '').replace(/[가-힣A-Za-z%]+$/, ''); return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN; };
    const nv = num(v); return { ok: !isNaN(nv) && keys.some((k) => num(k) === nv) };
  }
  if (/^\d+(\.\d+){3}$/.test(String(b.answer).trim())) return { ok: v.replace(/\s/g, '') === b.answer };
  const n = nrm(v); return { ok: !!n && keys.some((k) => nrm(k) === n) };
}

export function gradeQuestion(q: Question, ans: string[]): BlankResult[] {
  return q.blanks.map((_, i) => gradeBlank(q, i, ans[i] || ''));
}
