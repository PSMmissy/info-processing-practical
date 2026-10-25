export const JAMO = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ';
export const nrm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[\s\-_./()·,'"&:]/g, '');
export const jamo = (s: unknown) => (String(s ?? '').match(/[ㄱ-ㅎ]/g) || []).join('');
export const normOut = (s: unknown) =>
  String(s ?? '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
export function shuffle<T>(a: T[]): T[] {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function weighted<T>(arr: T[], w: (x: T) => number): T {
  const t = arr.reduce((s, x) => s + w(x), 0); let r = Math.random() * t;
  for (const x of arr) { r -= w(x); if (r <= 0) return x; }
  return arr[arr.length - 1];
}
export const fmtSec = (s: number) => { const m = Math.floor(s / 60), ss = s % 60; return `${m}:${String(ss).padStart(2, '0')}`; };
export const today = () => new Date().toISOString().slice(0, 10);
