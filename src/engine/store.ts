import type { ExamRecord } from './types';

const get = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const set = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } };

const K = { hist: 'jb.hist', glStat: 'jb.gl.stat', glKnown: 'jb.gl.known', glHard: 'jb.gl.hard', glSel: 'jb.gl.sel', qsStat: 'jb.qs.stat', draft: 'jb.draft', theme: 'jb.theme', noteDone: 'jb.note.done' };

const flagOps = (key: string) => ({
  get(): Record<string, 1> { return get(key, {}); },
  toggle(id: string) { const k = get<Record<string, 1>>(key, {}); if (k[id]) delete k[id]; else k[id] = 1; set(key, k); },
  setMany(ids: string[], on: boolean) { const k = get<Record<string, 1>>(key, {}); ids.forEach((id) => { if (on) k[id] = 1; else delete k[id]; }); set(key, k); },
});

export type GlStat = Record<string, { w: number; r: number; at?: string }>;
export type QsStat = Record<string, { w: number; r: number; at?: string }>;

export const store = {
  hist(): Record<string, ExamRecord> { return get(K.hist, {}); },
  saveRecord(r: ExamRecord) { const h = this.hist(); h[r.id] = r; set(K.hist, h); },
  deleteRecord(id: string) { const h = this.hist(); delete h[id]; set(K.hist, h); },
  clearHist() { set(K.hist, {}); },
  seen(): Set<string> { const s = new Set<string>(); Object.values(this.hist()).forEach((h) => h.qs.forEach((id) => s.add(id))); return s; },
  lastSeen(): Record<string, string> { const m: Record<string, string> = {}; Object.values(this.hist()).forEach((h) => h.qs.forEach((id) => { if (!m[id] || h.at > m[id]) m[id] = h.at; })); return m; },
  /** 문항별 누적: tries, wrong, lastOk */
  perQuestion(): Record<string, { tries: number; wrong: number; lastOk: boolean; lastAt: string }> {
    const m: Record<string, { tries: number; wrong: number; lastOk: boolean; lastAt: string }> = {};
    Object.values(this.hist()).sort((a, b) => a.at.localeCompare(b.at)).forEach((h) => h.qs.forEach((id) => {
      const r = h.res[id]; if (!r) return;
      const all = r.length > 0 && r.every((x) => x.ok);
      const o = (m[id] ||= { tries: 0, wrong: 0, lastOk: false, lastAt: '' });
      o.tries++; if (!all) o.wrong++; o.lastOk = all; o.lastAt = h.at;
    }));
    return m;
  },
  glStat(): GlStat { return get(K.glStat, {}); },
  glAdd(id: string, ok: boolean) { const s = this.glStat(); const st = (s[id] ||= { w: 0, r: 0 }); if (ok) st.r++; else st.w++; st.at = new Date().toISOString(); set(K.glStat, s); },
  glKnown(): Record<string, 1> { return get(K.glKnown, {}); },
  glToggleKnown(id: string) { const k = this.glKnown(); if (k[id]) delete k[id]; else k[id] = 1; set(K.glKnown, k); },
  glSetKnown(ids: string[], on: boolean) { const k = this.glKnown(); ids.forEach((id) => { if (on) k[id] = 1; else delete k[id]; }); set(K.glKnown, k); },
  /** 잘 안 외워짐 */
  glHard: flagOps(K.glHard),
  /** 선택 (테스트 범위용) */
  glSel: flagOps(K.glSel),
  qsStat(): QsStat { return get(K.qsStat, {}); },
  qsAdd(id: string, ok: boolean) { const s = this.qsStat(); const st = (s[id] ||= { w: 0, r: 0 }); if (ok) st.r++; else st.w++; st.at = new Date().toISOString(); set(K.qsStat, s); },
  draft<T>(): T | null { return get<T | null>(K.draft, null); },
  saveDraft(d: unknown) { set(K.draft, d); },
  clearDraft() { try { localStorage.removeItem(K.draft); } catch { /* */ } },
  theme(): string { return get(K.theme, 'system'); },
  setTheme(t: string) { set(K.theme, t); },
  noteDone(): Record<string, 1> { return get(K.noteDone, {}); },
  noteToggle(id: string) { const k = this.noteDone(); if (k[id]) delete k[id]; else k[id] = 1; set(K.noteDone, k); },
  exportAll(): string { const o: Record<string, unknown> = {}; Object.values(K).forEach((k) => { o[k] = get(k, null); }); return JSON.stringify(o); },
  importAll(json: string) { const o = JSON.parse(json); Object.values(K).forEach((k) => { if (o[k] != null) set(k, o[k]); }); },
};
