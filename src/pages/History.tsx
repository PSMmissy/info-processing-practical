import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../engine/store';
import { Q } from '../engine/bank';
import { areaName } from '../engine/types';
import { fmtSec } from '../engine/util';
import QuestionCard from '../components/QuestionCard';

export default function History() {
  const nav = useNavigate();
  const [ver, setVer] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const hist = useMemo(() => Object.values(store.hist()).sort((a, b) => b.at.localeCompare(a.at)), [ver]);
  const per = useMemo(() => store.perQuestion(), [ver]);
  const byArea = useMemo(() => { const m: Record<string, [number, number]> = {}; hist.forEach((h) => h.qs.forEach((id) => { const q = Q(id); if (!q) return; const r = h.res[id]; const o = (m[q.area] ||= [0, 0]); o[0] += r.filter((x) => x.ok).length / r.length; o[1]++; })); return Object.entries(m).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]); }, [hist]);
  const wrong = useMemo(() => Object.entries(per).filter(([, v]) => !v.lastOk).map(([id]) => id).filter((id) => Q(id)), [per]);
  const label = (m: string) => ({ real: '실전', area: '영역별', final: '최종', retry: '다시 풀기' } as any)[m] || m;
  const avg10 = hist.length ? Math.round(hist.slice(0, 10).reduce((s, h) => s + h.score, 0) / Math.min(10, hist.length)) : 0;
  const best = hist.length ? Math.max(...hist.map((h) => h.score)) : 0;

  const rec = open ? hist.find((h) => h.id === open) : null;
  if (rec) return (
    <div>
      <div className="mhead"><b>{label(rec.mode)}</b><span className="tag">{rec.at.slice(0, 16).replace('T', ' ')}</span><span className="tag">{rec.score}점</span><span className="mtime">{fmtSec(rec.sec)}</span><button className="btn primary" onClick={() => setOpen(null)}>목록으로</button></div>
      {rec.qs.map((id, i) => { const q = Q(id); return q ? <QuestionCard key={id} q={q} n={i + 1} ans={rec.ans[id] || []} res={rec.res[id]} graded /> : null; })}
    </div>
  );
  return (
    <div className="page">
      <nav className="side">
        <div className="howto"><h3>백업</h3>
          <div className="filters" style={{ marginTop: 6 }}>
            <button className="btn sm" onClick={() => { const b = new Blob([store.exportAll()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `jcg-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); }}>내보내기</button>
            <label className="btn sm" style={{ cursor: 'pointer' }}>가져오기<input type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; f.text().then((t) => { try { store.importAll(t); setVer((v) => v + 1); alert('가져왔어.'); } catch { alert('파일 형식이 달라.'); } }); }} /></label>
            <button className="btn sm" onClick={() => { if (confirm('모의고사 기록을 전부 지울까? (용어집·개념 퀴즈 기록은 유지)')) { store.clearHist(); setVer((v) => v + 1); } }}>기록 초기화</button>
          </div>
          <p className="sm muted" style={{ marginTop: 6 }}>기록은 이 브라우저에만 저장돼. 다른 기기로 옮기려면 내보내기 → 가져오기.</p>
        </div>
      </nav>
      <main>
        <div><div className="eyebrow">내 기록</div><h2 style={{ margin: '2px 0 4px', fontSize: 22 }}>모의고사 {hist.length}회</h2></div>
        {hist.length === 0 ? <div className="empty">아직 모의고사 기록이 없어.</div> : (
          <>
            <div className="wk-tiles">
              <div className="wk-tile"><span>최근 10회 평균</span><b className={avg10 >= 60 ? 'okc' : 'ngc'}>{avg10}점</b></div>
              <div className="wk-tile"><span>최고</span><b>{best}점</b></div>
              <div className="wk-tile"><span>최근</span><b>{hist[0].score}점</b></div>
              <div className="wk-tile"><span>마지막에 틀린 문항</span><b>{wrong.length}</b></div>
            </div>
            <div className="card"><h3>점수 추이 <span className="en">최근 {Math.min(30, hist.length)}회 · 옅은 막대는 영역별/다시 풀기</span></h3>
              <div className="barchart">{hist.slice(0, 30).reverse().map((h) => <div key={h.id} style={{ height: `${h.score}%`, opacity: h.mode === 'real' || h.mode === 'final' ? 1 : .45 }} title={`${h.at.slice(0, 10)} ${h.score}점`}><span>{Math.round(h.score)}</span></div>)}</div>
            </div>
            <div className="card"><h3>영역별 정답률 <span className="en">낮은 순</span></h3>
              {byArea.map(([a, [c, t]]) => { const r = c / t; return <div key={a} className="lrow"><span>{areaName(a)} <span className="sm muted">{t}문항</span></span><span className="wk-rate"><span className="track"><span className={r < .6 ? 'low' : r < .8 ? 'mid' : 'hi'} style={{ width: `${r * 100}%` }} /></span>{Math.round(r * 100)}%</span></div>; })}
            </div>
            <div className="card">
              <div className="ctop"><h3>마지막에 틀린 문항 <span className="en">{wrong.length}개</span></h3>{wrong.length > 0 && <button className="btn primary" onClick={() => nav('/mock', { state: { retry: wrong.slice(0, 20) } })}>다시 풀기 (최대 20)</button>}</div>
              {wrong.slice(0, 50).map((id) => { const q = Q(id)!; return <div key={id} className="lrow"><span><span className="tag">{areaName(q.area)}</span> {q.concept}</span><span className="sm muted">틀림 {per[id].wrong}/{per[id].tries}</span></div>; })}
            </div>
            <div className="card"><h3>회차 목록</h3>
              {hist.map((h) => <div key={h.id} className="lrow"><span><b className={h.score >= 60 ? 'okc' : 'ngc'}>{h.score}점</b> <span className="tag">{label(h.mode)}{h.tpl ? ` · ${h.tpl === 'pred' ? '예상' : '20' + h.tpl.replace('-', '년 ') + '회 틀'}` : ''}</span> <span className="sm muted">{h.at.slice(0, 16).replace('T', ' ')} · {h.n}문항 · {fmtSec(h.sec)}</span></span><span><button className="btn sm" onClick={() => setOpen(h.id)}>보기</button> <button className="btn sm" onClick={() => { if (confirm('이 기록을 지울까?')) { store.deleteRecord(h.id); setVer((v) => v + 1); } }}>삭제</button></span></div>)}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
