import { useEffect, useMemo, useState } from 'react';
import type { Draft } from '../engine/mock';
import type { BlankResult, ExamRecord } from '../engine/types';
import { areaName } from '../engine/types';
import { Q } from '../engine/bank';
import { gradeQuestion } from '../engine/grade';
import { loadSql } from '../engine/sql';
import { store } from '../engine/store';
import { fmtSec } from '../engine/util';
import QuestionCard from './QuestionCard';

type Props = { draft: Draft; onDone?: (rec: ExamRecord) => void; onQuit: () => void; onRetry?: (ids: string[]) => void };

export default function ExamRunner({ draft, onDone, onQuit, onRetry }: Props) {
  const [ans, setAns] = useState<Record<string, string[]>>(draft.ans);
  const [rec, setRec] = useState<ExamRecord | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const qs = useMemo(() => draft.qs.map((id) => Q(id)!).filter(Boolean), [draft.qs]);

  useEffect(() => { loadSql().catch(() => { /* */ }); }, []);
  useEffect(() => { if (rec) return; const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, [rec]);
  useEffect(() => { if (!rec) store.saveDraft({ ...draft, ans }); }, [ans, draft, rec]);

  const sec = rec ? rec.sec : Math.floor((Date.now() - draft.t0) / 1000);
  const setA = (id: string, k: number, v: string) => setAns((a) => ({ ...a, [id]: Object.assign([...(a[id] || [])], { [k]: v }) }));

  async function submit() {
    setBusy(true);
    try { await loadSql(); } catch { /* SQL 채점은 엔진 없이 메시지만 */ }
    const res: Record<string, BlankResult[]> = {}; let score = 0, full = 0; const per = 100 / qs.length;
    qs.forEach((q) => { const r = gradeQuestion(q, ans[q.id] || []); res[q.id] = r; const c = r.filter((x) => x.ok).length; score += (per * c) / r.length; if (c === r.length) full++; if (q.gl && q.glid) store.glAdd(q.glid, c === r.length); });
    const r: ExamRecord = { id: draft.id, at: draft.at, mode: draft.mode, areas: draft.areas, tpl: draft.tpl, qs: draft.qs, ans, res, score: Math.round(score * 10) / 10, full, n: qs.length, sec: Math.floor((Date.now() - draft.t0) / 1000) };
    store.saveRecord(r); store.clearDraft(); setRec(r); setBusy(false); onDone?.(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const unanswered = qs.filter((q) => !(ans[q.id] || []).some((v) => v && v.trim())).length;
  const byArea = rec ? (() => { const m: Record<string, [number, number]> = {}; qs.forEach((q) => { const r = rec.res[q.id]; const a = q.area === 'code' ? `${({ c: 'C', java: 'Java', python: 'Python' } as any)[q.code?.lang || '']} 코드` : areaName(q.area); const o = (m[a] ||= [0, 0]); o[0] += (r.filter((x) => x.ok).length / r.length) * (100 / qs.length); o[1] += 100 / qs.length; }); return Object.entries(m).map(([a, [p, t]]) => `${a} ${Math.round(p * 10) / 10}/${Math.round(t * 10) / 10}`).join(' · '); })() : '';
  const wrongIds = rec ? qs.filter((q) => !rec.res[q.id].every((x) => x.ok)).map((q) => q.id) : [];
  const title = draft.label || (draft.mode === 'real' ? '실전 모의고사' : draft.mode === 'retry' ? '오답 다시 풀기' : '영역별 모의고사');

  return (
    <div>
      <div className="mhead">
        <b>{title}</b><span className="tag">{qs.length}문항</span>
        {!rec && unanswered > 0 && <span className="tag">미응답 {unanswered}</span>}
        <span className="mtime">{fmtSec(sec)}</span>
        {!rec ? (<><button className="btn" onClick={() => { if (confirm('지금 그만두면 답안이 저장되지 않아. 나갈까?')) { store.clearDraft(); onQuit(); } }}>그만두기</button><button className="btn primary" disabled={busy} onClick={submit}>{busy ? '채점 중…' : '제출 · 채점'}</button></>)
          : (<>{wrongIds.length > 0 && onRetry && <button className="btn" onClick={() => onRetry(wrongIds)}>틀린 {wrongIds.length}문항 다시 풀기</button>}<button className="btn primary" onClick={onQuit}>닫기</button></>)}
      </div>
      {rec && <div className={`mscore ${rec.score >= 60 ? 'pass' : 'fail'}`}><b>{rec.score}</b><span>/ 100점</span><span className="mpass-l">{rec.score >= 60 ? '합격선 통과' : '합격선 미달'}</span><span>완전 정답 {rec.full}/{rec.n}</span><span>{fmtSec(rec.sec)}</span><span style={{ flexBasis: '100%', marginLeft: 0 }} className="sm">{byArea}</span></div>}
      {qs.map((q, i) => <QuestionCard key={q.id} q={q} n={i + 1} ans={ans[q.id] || []} onChange={rec ? undefined : (k, v) => setA(q.id, k, v)} res={rec?.res[q.id]} graded={!!rec} />)}
      {!rec && <div className="msub"><button className="btn primary" disabled={busy} onClick={submit}>제출 · 채점</button></div>}
      <span hidden>{tick}</span>
    </div>
  );
}
