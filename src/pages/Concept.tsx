import { useMemo, useState } from 'react';
import qsJson from '../data/qs.json';
import type { ConceptQ } from '../engine/types';
import { AREA_ORDER, areaName } from '../engine/types';
import { store } from '../engine/store';
import { nrm, shuffle } from '../engine/util';

const QS: ConceptQ[] = qsJson as unknown as ConceptQ[];
type Run = { ids: string[]; i: number; first: Record<string, boolean>; mode: 'input' | 'choice'; choices: Record<string, string[]>; phase: 'q' | 'a'; last?: { ok: boolean; ans: string } };

export default function Concept() {
  const [area, setArea] = useState('all');
  const [lv, setLv] = useState<'A' | 'AB' | 'ABC'>('AB');
  const [target, setTarget] = useState<'all' | 'new' | 'wrong'>('all');
  const [n, setN] = useState(20);
  const [mode, setMode] = useState<'input' | 'choice'>('input');
  const [run, setRun] = useState<Run | null>(null);
  const [input, setInput] = useState('');
  const [ver, setVer] = useState(0);
  const stat = useMemo(() => store.qsStat(), [ver]);
  const pool = useMemo(() => QS.filter((x) => (area === 'all' || x.area === area) && (lv === 'ABC' || (lv === 'AB' ? x.lv !== 'C' : x.lv === 'A')) && (target === 'all' || (target === 'new' ? !stat[x.id] : (stat[x.id]?.w || 0) > 0))), [area, lv, target, stat]);
  const byId = useMemo(() => new Map(QS.map((x) => [x.id, x])), []);
  const countOf = (a: string) => QS.filter((x) => (a === 'all' || x.area === a) && (lv === 'ABC' || (lv === 'AB' ? x.lv !== 'C' : x.lv === 'A'))).length;
  const solvedOf = (a: string) => QS.filter((x) => (a === 'all' || x.area === a) && stat[x.id] && (stat[x.id].w === 0)).length;

  function start() {
    const ids = shuffle(pool).slice(0, n).map((x) => x.id);
    const choices: Record<string, string[]> = {};
    ids.forEach((id) => { const x = byId.get(id)!; choices[id] = shuffle([x.a, ...x.d.slice(0, 4)]); });
    setRun({ ids, i: 0, first: {}, mode, choices, phase: 'q' }); setInput('');
  }
  function answer(ans: string) {
    if (!run) return; const id = run.ids[run.i]; const x = byId.get(id)!;
    const ok = run.mode === 'choice' ? ans === x.a : [x.a, ...(x.acc || [])].map(nrm).includes(nrm(ans));
    const first = { ...run.first }; if (!(id in first)) { first[id] = ok; store.qsAdd(id, ok); setVer((v) => v + 1); }
    setRun({ ...run, ids: ok ? run.ids : [...run.ids, id], first, phase: 'a', last: { ok, ans } });
  }
  function next() { if (!run) return; setRun({ ...run, i: run.i + 1, phase: 'q', last: undefined }); setInput(''); }

  if (run) {
    const total = Object.keys(run.first).length, right = Object.values(run.first).filter(Boolean).length;
    if (run.i >= run.ids.length) return (
      <div className="quiz">
        <div className="qtop"><div><div className="eyebrow">개념 퀴즈</div><h2>결과</h2></div><button className="btn primary" onClick={() => setRun(null)}>닫기</button></div>
        <div className="qcard"><div className="sumbox"><b>{right}</b><span className="muted">/ {total} · 처음 답 기준</span></div><p className="muted sm" style={{ margin: 0 }}>틀린 건 '틀린 것만' 대상으로 다시 돌릴 수 있어.</p></div>
        <div className="sumlist">{Object.entries(run.first).filter(([, ok]) => !ok).map(([id]) => { const x = byId.get(id)!; return <div key={id} className="sumrow"><div><div className="sq"><b>{x.a}</b> <span className="muted">· {x.c}</span></div><div className="sa">{x.q.split('\n').slice(-1)[0]}</div></div><span className="tag">{areaName(x.area)}</span></div>; })}</div>
      </div>);
    const id = run.ids[run.i]; const x = byId.get(id)!; const useChoice = run.mode === 'choice' || x.choiceOnly;
    return (
      <div className="quiz">
        <div className="qtop"><div><div className="eyebrow">개념 퀴즈 · {areaName(x.area)} · {x.c}</div><h2>{run.i + 1} / {run.ids.length}</h2></div><div className="qmeta">맞음 {right}/{total} &nbsp; <button className="btn sm" onClick={() => setRun(null)}>그만두기</button></div></div>
        <div className="qbar"><span style={{ width: `${(run.i / run.ids.length) * 100}%` }} /></div>
        <div className="qcard">
          <p className="qq">{x.q}</p>
          {run.phase === 'q' ? (useChoice
            ? <div className="qopts">{run.choices[id].map((c, i) => <button key={c} className="qopt" onClick={() => answer(c)}><span className="key">{i + 1}</span>{c}</button>)}</div>
            : <form className="qinrow" onSubmit={(e) => { e.preventDefault(); if (input.trim()) answer(input); }}><input className="qin" autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="답" /><button className="btn primary" type="submit">확인</button><button type="button" className="btn" onClick={() => answer('')}>모르겠음</button></form>)
            : <div className={`fb ${run.last?.ok ? 'ok' : 'bad'}`}><div className="fbh">{run.last?.ok ? '정답' : '오답'}</div><div className="fbrow"><b>정답</b><span><b>{x.a}</b></span></div>{!run.last?.ok && <div className="fbrow"><b>내 답</b><span>{run.last?.ans || '(없음)'} — 뒤에 한 번 더 나와.</span></div>}<button className="btn primary" autoFocus onClick={next}>다음</button></div>}
        </div>
      </div>
    );
  }
  const wrongN = QS.filter((x) => (stat[x.id]?.w || 0) > 0).length;
  return (
    <div className="page">
      <nav className="side">
        <button aria-current={area === 'all'} onClick={() => setArea('all')}>전체 <small>{solvedOf('all')}/{countOf('all')}</small></button>
        {AREA_ORDER.map((a) => <button key={a} aria-current={area === a} onClick={() => setArea(a)}>{areaName(a)} <small>{solvedOf(a)}/{countOf(a)}</small></button>)}
      </nav>
      <main>
        <div><div className="eyebrow">개념 퀴즈 · {area === 'all' ? '전체' : areaName(area)}</div><h2 style={{ margin: '2px 0 4px', fontSize: 22 }}>{pool.length}개</h2><p className="meta" style={{ margin: 0 }}>설명을 보고 용어를 쓰거나 보기에서 고르는 단답 연습. 모의고사 전에 영역별로 빠르게 돌리는 용도.</p></div>
        <div className="gl-tbar">
          <b>시작 설정</b>
          <select value={lv} onChange={(e) => setLv(e.target.value as any)}><option value="A">핵심(A)만</option><option value="AB">핵심+교재(A·B)</option><option value="ABC">전부</option></select>
          <select value={target} onChange={(e) => setTarget(e.target.value as any)}><option value="all">모든 문제</option><option value="new">안 푼 것만</option><option value="wrong">틀린 것만 ({wrongN})</option></select>
          <select value={n} onChange={(e) => setN(+e.target.value)}><option value={10}>10문제</option><option value={20}>20문제</option><option value={50}>50문제</option><option value={9999}>전부</option></select>
          <select value={mode} onChange={(e) => setMode(e.target.value as any)}><option value="input">직접 입력</option><option value="choice">보기 선택</option></select>
          <button className="btn primary" disabled={!pool.length} onClick={start}>시작 ({Math.min(n, pool.length)}개)</button>
        </div>
        <div className="howto"><h3>HOW TO</h3><ol><li>영역 하나 고르고 20문제씩. 직접 입력이 기본, 급하면 보기 선택.</li><li>틀린 건 뒤에 한 번 더 나오고, 기록에 '틀림'으로 남아. 다음엔 '틀린 것만'으로 돌려.</li><li>왼쪽 숫자는 맞힌 적 있는 문제 수 / 전체.</li></ol></div>
      </main>
    </div>
  );
}
