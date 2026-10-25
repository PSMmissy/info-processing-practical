import { useMemo, useState } from 'react';
import areasJson from '../data/areas.json';
import codeExJson from '../data/codeEx.json';
import { store } from '../engine/store';

type Item = { id?: string; n: string; e?: string; d?: string; k?: string; c?: string; l?: string[]; x?: string; t?: string[]; grp?: string; g?: string[] };
type Area = { id: string; name: string; how: string[]; items: Item[] };
type Ex = { t: string; lang: string; code: string; out: string; why: string };
const AREAS = areasJson as unknown as Area[];
const CODE_EX = codeExJson as unknown as Record<string, Ex[]>;

export default function Theory() {
  const [area, setArea] = useState(AREAS[0].id);
  const [q, setQ] = useState('');
  const [onlyHot, setOnlyHot] = useState(false);
  const [ver, setVer] = useState(0);
  const done = useMemo(() => store.noteDone(), [ver]);
  const a = AREAS.find((x) => x.id === area)!;
  const qq = q.trim().toLowerCase();
  const items = a.items.filter((it) => (!onlyHot || it.t?.includes('hot')) && (!qq || JSON.stringify(it).toLowerCase().includes(qq)));
  const groups = useMemo(() => { const m = new Map<string, Item[]>(); items.forEach((it) => { const g = it.grp || ''; if (!m.has(g)) m.set(g, []); m.get(g)!.push(it); }); return [...m.entries()]; }, [items]);
  const key = (it: Item) => a.id + ':' + it.n;
  const doneN = (x: Area) => x.items.filter((it) => done[x.id + ':' + it.n]).length;
  return (
    <div className="page">
      <nav className="side">
        {AREAS.map((x) => <button key={x.id} aria-current={area === x.id} onClick={() => setArea(x.id)}>{x.name} <small>{doneN(x)}/{x.items.length}</small></button>)}
        <div className="sep" />
        <div className="filters"><button className="fbtn" aria-pressed={onlyHot} onClick={() => setOnlyHot(!onlyHot)}>빈출만</button></div>
      </nav>
      <main>
        <div className="qtop">
          <div><div className="eyebrow">이론 노트</div><h2>{a.name} <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>{items.length}개 · 읽음 {items.filter((it) => done[key(it)]).length}</span></h2></div>
          <div className="search"><input placeholder="이 영역에서 검색" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {a.how?.length > 0 && <div className="howto"><h3>푸는 기준</h3><ol>{a.how.map((h, i) => <li key={i}>{h}</li>)}</ol></div>}
        {groups.map(([g, list]) => (
          <div key={g}>
            {g && <div className="eyebrow" style={{ margin: '6px 0' }}>{g}</div>}
            <div className="grid">{list.map((it) => (
              <div key={it.n} className={`card ${done[key(it)] ? 'done' : ''}`}>
                <div className="ctop">
                  <h3>{it.n}{it.e && <span className="en">{it.e}</span>}</h3>
                  <div className="tags">{it.t?.includes('hot') && <span className="tag hot">빈출</span>}{it.g && it.g.length > 0 && <span className="tag gi">{it.g.join(' · ')}</span>}<button className="done-btn" onClick={() => { store.noteToggle(key(it)); setVer((v) => v + 1); }}>{done[key(it)] ? '읽음 ✓' : '읽음'}</button></div>
                </div>
                {it.d && <p>{it.d}</p>}
                {it.l && <ul className="li">{it.l.map((s, i) => <li key={i}>{s}</li>)}</ul>}
                {it.k && <div className="row k"><b>키워드</b><span>{it.k}</span></div>}
                {it.c && <div className="row c"><b>주의</b><span>{it.c}</span></div>}
                {it.x && <div className="row x"><b>예</b><span>{it.x}</span></div>}
                {area === 'code' && CODE_EX[it.n] && <details className="cx"><summary className="cx-h">예제 코드 {CODE_EX[it.n].length}개</summary>
                  {CODE_EX[it.n].map((ex, i) => <div key={i} className="cx-i"><div className="cx-t">{ex.t}<span className="cx-l">{ex.lang}</span></div><div className="cx-code"><pre>{ex.code}</pre></div><div className="cx-o"><span>출력</span><pre>{ex.out}</pre></div><div className="cx-why"><b>왜</b>{ex.why}</div></div>)}
                </details>}
              </div>))}</div>
          </div>
        ))}
        {items.length === 0 && <div className="empty">해당하는 항목이 없어.</div>}
      </main>
    </div>
  );
}
