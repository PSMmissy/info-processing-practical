import { useMemo, useState } from 'react';
import glossJson from '../data/gloss.json';
import type { Gloss } from '../engine/types';
import { AREA_ORDER, areaName } from '../engine/types';
import { store } from '../engine/store';
import { nrm, shuffle } from '../engine/util';

const GL: Gloss[] = glossJson as unknown as Gloss[];
const variants = (x: Gloss) => {
  const t = String(x.t), v = new Set<string>([t, t.replace(/\([^)]*\)/g, '')]);
  (t.match(/\(([^)]*)\)/g) || []).forEach((m) => { const in_ = m.slice(1, -1); v.add(in_); in_.split(/[,·]/).forEach((y) => v.add(y)); });
  t.split(/\s*\/\s*/).forEach((y) => v.add(y));
  if (x.sub && x.sub !== '순서') x.sub.split(/\s*[·,]\s*/).forEach((y) => v.add(y));
  return [...v].map(nrm).filter((k) => k.length >= 1);
};
const leak = (x: Gloss) => { const d = nrm(x.d), t = nrm(x.t), core = nrm(String(x.t).replace(/\([^)]*\)/g, '')); return (t.length >= 2 && d.includes(t)) || (core.length >= 2 && d.includes(core)); };

type Lv = 'A' | 'AB' | 'all';
type Filt = 'all' | 'todo' | 'known' | 'hard' | 'wrong' | 'sel';
type Test = { queue: string[]; i: number; first: Record<string, boolean>; mode: 'input' | 'choice'; target: Filt; choices: Record<string, string[]>; phase: 'q' | 'a'; last?: { ok: boolean; ans: string }; done?: Record<string, 1> };

const LV_OPTS: [Lv, string][] = [['A', '시험 핵심(A)만'], ['AB', '핵심 + 교재(A·B)'], ['all', '모두']];
const lvOk = (lv: Lv, x: Gloss) => lv === 'all' || (lv === 'AB' ? x.lv !== 'C' : x.lv === 'A');

export default function Glossary() {
  const [area, setArea] = useState('all');
  const [lv, setLv] = useState<Lv>('AB');
  const [filt, setFilt] = useState<Filt>('all');
  const [q, setQ] = useState('');
  const [hide, setHide] = useState(false);
  const [shown, setShown] = useState<Record<string, 1>>({});
  const [ver, setVer] = useState(0);
  const bump = () => setVer((v) => v + 1);
  const known = useMemo(() => store.glKnown(), [ver]);
  const hard = useMemo(() => store.glHard.get(), [ver]);
  const sel = useMemo(() => store.glSel.get(), [ver]);
  const stat = useMemo(() => store.glStat(), [ver]);
  const W = (id: string) => stat[id]?.w || 0;
  const pass = (f: Filt, x: Gloss) => f === 'all' || (f === 'todo' ? !known[x.id] : f === 'known' ? !!known[x.id] : f === 'hard' ? !!hard[x.id] : f === 'sel' ? !!sel[x.id] : W(x.id) > 0);
  const qq = q.trim().toLowerCase();
  const scope = useMemo(() => GL.filter((x) => (area === 'all' || x.area === area) && lvOk(lv, x)), [area, lv]);
  const rows = useMemo(() => scope.filter((x) => pass(filt, x) && (!qq || (x.t + ' ' + (x.sub || '') + ' ' + x.d + ' ' + (x.kw || '')).toLowerCase().includes(qq))), [scope, filt, qq, known, hard, sel, stat]);
  const groups = useMemo(() => { const m = new Map<string, Gloss[]>(); rows.forEach((x) => { if (!m.has(x.c)) m.set(x.c, []); m.get(x.c)!.push(x); }); return [...m.entries()]; }, [rows]);
  const countOf = (a: string) => GL.filter((x) => (a === 'all' || x.area === a) && lvOk(lv, x)).length;
  const nOf = (f: Filt) => scope.filter((x) => pass(f, x)).length;

  // ---- 테스트 ----
  const [test, setTest] = useState<Test | null>(null);
  const [tArea, setTArea] = useState('all');
  const [tScope, setTScope] = useState<Lv>('A');
  const [tTarget, setTTarget] = useState<Filt>('all');
  const [tN, setTN] = useState(20);
  const [tMode, setTMode] = useState<'input' | 'choice'>('input');
  const [input, setInput] = useState('');
  const testPool = () => GL.filter((x) => (tArea === 'all' || x.area === tArea) && lvOk(tScope, x) && x.sub !== '순서' && !leak(x) && x.d && x.d.length >= 20 && pass(tTarget, x));
  const poolN = testPool().length;
  function startTest() {
    const pool = shuffle(testPool()).slice(0, tN);
    const choices: Record<string, string[]> = {};
    pool.forEach((x) => { const same = shuffle(GL.filter((y) => y.id !== x.id && y.c === x.c)).slice(0, 2); const other = shuffle(GL.filter((y) => y.id !== x.id && y.area === x.area && y.c !== x.c)).slice(0, 4 - same.length); choices[x.id] = shuffle([x.t, ...same.map((y) => y.t), ...other.map((y) => y.t)]); });
    setTest({ queue: pool.map((x) => x.id), i: 0, first: {}, mode: tMode, target: tTarget, choices, phase: 'q' }); setInput('');
  }
  function answer(ans: string) {
    if (!test) return; const id = test.queue[test.i]; const x = GL.find((g) => g.id === id)!;
    const ok = test.mode === 'choice' ? ans === x.t : variants(x).includes(nrm(ans));
    const first = { ...test.first }; if (!(id in first)) { first[id] = ok; store.glAdd(id, ok); bump(); }
    setTest({ ...test, queue: ok ? test.queue : [...test.queue, id], first, phase: 'a', last: { ok, ans } });
  }
  function next() { if (!test) return; setTest({ ...test, i: test.i + 1, phase: 'q', last: undefined }); setInput(''); }

  if (test) {
    const total = Object.keys(test.first).length, right = Object.values(test.first).filter(Boolean).length;
    const tname = ({ all: '용어 테스트', todo: '안 외운 용어 테스트', known: '외운 용어 테스트', hard: '잘 안 외워지는 용어 테스트', wrong: '틀린 적 있는 용어 테스트', sel: '선택한 용어 테스트' } as Record<Filt, string>)[test.target];
    if (test.i >= test.queue.length) {
      const wrongIds = Object.entries(test.first).filter(([, ok]) => !ok).map(([id]) => id);
      const okIds = Object.entries(test.first).filter(([, ok]) => ok).map(([id]) => id);
      const newHard = wrongIds.filter((id) => !hard[id]), unHard = okIds.filter((id) => hard[id]), newKnown = okIds.filter((id) => !known[id]);
      const done = test.done || {};
      const mark = (k: string, fn: () => void) => { fn(); bump(); setTest({ ...test, done: { ...done, [k]: 1 } }); };
      return (
        <div className="quiz">
          <div className="qtop"><div><div className="eyebrow">{tname}</div><h2>결과</h2></div><button className="btn primary" onClick={() => setTest(null)}>닫기</button></div>
          <div className="qcard"><div className="sumbox"><b>{right}</b><span className="muted">/ {total} · 처음 답 기준</span></div>
            <div className="filters" style={{ marginTop: 8 }}>
              {newHard.length > 0 && <button className="btn sm" disabled={!!done.hard} onClick={() => mark('hard', () => store.glHard.setMany(newHard, true))}>{done.hard ? "'잘 안 외워짐'에 추가했어" : `틀린 ${newHard.length}개 '잘 안 외워짐'에 추가`}</button>}
              {test.target === 'hard' && unHard.length > 0 && <button className="btn sm" disabled={!!done.unhard} onClick={() => mark('unhard', () => store.glHard.setMany(unHard, false))}>{done.unhard ? "'잘 안 외워짐' 해제했어" : `한 번에 맞힌 ${unHard.length}개 '잘 안 외워짐' 해제`}</button>}
              {newKnown.length > 0 && <button className="btn sm" disabled={!!done.known} onClick={() => mark('known', () => store.glSetKnown(newKnown, true))}>{done.known ? "'외움' 체크했어" : `맞힌 ${newKnown.length}개 '외움' 체크`}</button>}
            </div>
            <p className="muted sm" style={{ margin: '8px 0 0' }}>틀린 용어는 '틀림 N'으로 쌓여서 목록의 '틀린 적 있음' 필터로 모아 볼 수 있어.</p></div>
          <div className="sumlist">{wrongIds.map((id) => { const x = GL.find((g) => g.id === id)!; return <div key={id} className="sumrow"><div><div className="sq"><b>{x.t}</b>{x.sub && x.sub !== '순서' ? <span className="muted"> · {x.sub}</span> : null}</div><div className="sa">{x.d}</div>{x.kw && <div className="sa okc">핵심: {x.kw}</div>}</div><span className="tag">{areaName(x.area)}</span></div>; })}</div>
        </div>);
    }
    const id = test.queue[test.i]; const x = GL.find((g) => g.id === id)!;
    const hint = x.c.replace(/\s*\(.*\)$/, '');
    return (
      <div className="quiz">
        <div className="qtop"><div><div className="eyebrow">{tname} · {areaName(x.area)}</div><h2>{test.i + 1} / {test.queue.length}</h2></div><div className="qmeta">맞음 {right}/{total} &nbsp; <button className="btn sm" onClick={() => setTest(null)}>그만두기</button></div></div>
        <div className="qbar"><span style={{ width: `${(test.i / test.queue.length) * 100}%` }} /></div>
        <div className="qcard">
          <p className="glhint"><b>{hint}</b>에 대한 설명이다. 이에 해당하는 용어를 쓰시오.</p>
          <p className="qq">{x.d}</p>
          {test.phase === 'q' ? (
            test.mode === 'choice' ? <div className="qopts">{test.choices[id].map((c, i) => <button key={c} className="qopt" onClick={() => answer(c)}><span className="key">{i + 1}</span>{c}</button>)}</div>
              : <form className="qinrow" onSubmit={(e) => { e.preventDefault(); if (input.trim()) answer(input); }}><input className="qin" autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="용어 (한글/영문/약어)" /><button className="btn primary" type="submit">확인</button><button type="button" className="btn" onClick={() => answer('')}>모르겠음</button></form>
          ) : (
            <div className={`fb ${test.last?.ok ? 'ok' : 'bad'}`}>
              <div className="fbh">{test.last?.ok ? '정답' : '오답'}</div>
              <div className="fbrow"><b>정답</b><span><b>{x.t}</b>{x.sub && x.sub !== '순서' ? ` (${x.sub})` : ''}</span></div>
              {!test.last?.ok && <div className="fbrow"><b>내 답</b><span>{test.last?.ans || '(없음)'} — 뒤에 한 번 더 나와.</span></div>}
              {x.kw && <div className="fbrow"><b>핵심</b><span>{x.kw}</span></div>}
              <div className="fbrow"><b>표시</b><span className="filters">
                <label className="gl-k gl-h"><input type="checkbox" checked={!!hard[id]} onChange={() => { store.glHard.toggle(id); bump(); }} />잘 안 외워짐</label>
                <label className="gl-k"><input type="checkbox" checked={!!known[id]} onChange={() => { store.glToggleKnown(id); bump(); }} />외움</label>
              </span></div>
              <button className="btn primary" autoFocus onClick={next}>다음</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const ids = rows.map((x) => x.id);
  const knownN = ids.filter((id) => known[id]).length;
  const selN = scope.filter((x) => sel[x.id]).length;
  return (
    <div className="page">
      <nav className="side">
        <button aria-current={area === 'all'} onClick={() => setArea('all')}>전체 <small>{countOf('all')}</small></button>
        {AREA_ORDER.filter((a) => a !== 'code').map((a) => <button key={a} aria-current={area === a} onClick={() => setArea(a)}>{areaName(a)} <small>{countOf(a)}</small></button>)}
        <div className="sep" />
        <div className="filters">
          {LV_OPTS.map(([k, l]) => <button key={k} className="fbtn" aria-pressed={lv === k} onClick={() => setLv(k)}>{l}</button>)}
        </div>
        <div className="sep" />
        <div className="filters">
          <button className="fbtn" aria-pressed={filt === 'all'} onClick={() => setFilt('all')}>전체</button>
          <button className="fbtn" aria-pressed={filt === 'todo'} onClick={() => setFilt(filt === 'todo' ? 'all' : 'todo')}>안 외운 것만 {nOf('todo')}</button>
          <button className="fbtn" aria-pressed={filt === 'known'} onClick={() => setFilt(filt === 'known' ? 'all' : 'known')}>외운 것만 {nOf('known')}</button>
          <button className="fbtn gl-hardf" aria-pressed={filt === 'hard'} onClick={() => setFilt(filt === 'hard' ? 'all' : 'hard')}>잘 안 외워지는 것만 {nOf('hard')}</button>
          <button className="fbtn gl-hardf" aria-pressed={filt === 'wrong'} onClick={() => setFilt(filt === 'wrong' ? 'all' : 'wrong')}>틀린 적 있음 {nOf('wrong')}</button>
          <button className="fbtn gl-self" aria-pressed={filt === 'sel'} onClick={() => setFilt(filt === 'sel' ? 'all' : 'sel')}>선택한 것만 {nOf('sel')}</button>
        </div>
      </nav>
      <main>
        <div>
          <div className="eyebrow">용어집 · {area === 'all' ? '전체' : areaName(area)}</div>
          <h2 style={{ margin: '2px 0 4px', fontSize: 22 }}>{rows.length}개</h2>
          <p className="meta" style={{ margin: 0 }}>설명을 읽고 용어를 떠올리는 게 목적이라, 용어를 가리고 보면서 외우고 테스트로 확인해. 초록 '핵심'은 한 줄 요약. 안 외워지는 건 '잘 안 외워짐', 따로 시험 볼 건 '선택'에 체크.</p>
        </div>
        <div className="gl-tbar">
          <b>용어 테스트</b>
          <select value={tArea} onChange={(e) => setTArea(e.target.value)}><option value="all">전체 과목</option>{AREA_ORDER.filter((a) => a !== 'code').map((a) => <option key={a} value={a}>{areaName(a)}</option>)}</select>
          <select value={tScope} onChange={(e) => setTScope(e.target.value as Lv)}>{LV_OPTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select value={tTarget} onChange={(e) => setTTarget(e.target.value as Filt)}>
            <option value="all">모든 용어</option><option value="todo">안 외운 것만</option><option value="known">외운 것만</option><option value="hard">잘 안 외워지는 것만</option><option value="wrong">틀린 적 있는 것만</option><option value="sel">선택한 것만</option>
          </select>
          <select value={tN} onChange={(e) => setTN(+e.target.value)}><option value={10}>10문제</option><option value={20}>20문제</option><option value={50}>50문제</option><option value={9999}>전부</option></select>
          <select value={tMode} onChange={(e) => setTMode(e.target.value as any)}><option value="input">직접 입력</option><option value="choice">보기 선택</option></select>
          <button className="btn primary" disabled={!poolN} onClick={startTest}>시작 ({Math.min(tN, poolN)}개)</button>
        </div>
        <div className="gl-bar">
          <div className="search"><input placeholder="검색 (용어·설명·핵심)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <label className="gl-hide"><input type="checkbox" checked={hide} onChange={(e) => { setHide(e.target.checked); setShown({}); }} />용어 가리기</label>
          <div className="gl-prog"><span className="gl-pbar"><span style={{ width: `${rows.length ? (knownN / rows.length) * 100 : 0}%` }} /></span><span>외움 {knownN} / {rows.length}</span></div>
          <button className="btn sm" onClick={() => { store.glSetKnown(ids, true); bump(); }}>보이는 것 전부 외움</button>
          <button className="btn sm" onClick={() => { store.glSetKnown(ids, false); bump(); }}>전부 해제</button>
          <button className="btn sm" disabled={!selN} onClick={() => { store.glSel.setMany(scope.map((x) => x.id), false); if (filt === 'sel') setFilt('all'); bump(); }}>{area === 'all' ? '선택 전체 해제' : '이 영역 선택 해제'} ({selN})</button>
        </div>
        {rows.length === 0 ? <div className="empty">{filt === 'todo' && !qq ? '이 범위는 다 외웠어.' : '해당하는 용어가 없어.'}</div> : groups.map(([c, list]) => (
          <div key={c}>
            <div className="eyebrow" style={{ margin: '8px 0 0' }}>{c}</div>
            <div className={`gl ${hide ? 'hide' : ''}`}>{list.map((x) => (
              <div key={x.id} className={`gl-row ${known[x.id] ? 'known' : ''} ${hard[x.id] ? 'hard' : ''} ${sel[x.id] ? 'sel' : ''}`}>
                <div className="gl-tc">
                  <button className={`gl-t ${shown[x.id] ? 'open' : ''}`} onClick={() => hide && setShown((s) => ({ ...s, [x.id]: s[x.id] ? 0 as any : 1 }))}>{x.t}{x.sub && x.sub !== '순서' && <span className="gl-g">{x.sub}</span>}</button>
                  {W(x.id) > 0 && <span className="gl-wc">틀림 {W(x.id)}</span>}
                </div>
                <div className="gl-d">{x.kw && <span className="gl-kw">핵심: {x.kw}</span>}{x.d}</div>
                <div className="gl-side">
                  <label className="gl-k"><input type="checkbox" checked={!!known[x.id]} onChange={() => { store.glToggleKnown(x.id); bump(); }} />외움</label>
                  <label className="gl-k gl-h"><input type="checkbox" checked={!!hard[x.id]} onChange={() => { store.glHard.toggle(x.id); bump(); }} />잘 안 외워짐</label>
                  <label className="gl-k gl-s"><input type="checkbox" checked={!!sel[x.id]} onChange={() => { store.glSel.toggle(x.id); bump(); }} />선택</label>
                </div>
              </div>))}</div>
          </div>
        ))}
      </main>
    </div>
  );
}
