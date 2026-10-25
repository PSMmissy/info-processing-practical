import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AREA_ORDER, areaName } from '../engine/types';
import { BANK, FINALS, stats } from '../engine/bank';
import { startArea, startReal, startFinal, startRetry, type Draft } from '../engine/mock';
import { store } from '../engine/store';
import ExamRunner from '../components/ExamRunner';

const TH_AREAS = AREA_ORDER.filter((a) => a !== 'code');

export default function Mock() {
  const nav = useNavigate();
  const loc = useLocation();
  const retryIds: string[] | undefined = (loc.state as any)?.retry;
  const [draft, setDraft] = useState<Draft | null>(() => (retryIds?.length ? startRetry(retryIds) : store.draft<Draft>()));
  const [sel, setSel] = useState<Set<string>>(new Set(['req', 'db', 'sql', 'net', 'sec']));
  const [n, setN] = useState(12);
  const seen = useMemo(() => store.seen(), [draft]);
  const fresh = (a: string) => BANK.filter((q) => q.area === a && !q.base && !seen.has(q.id)).length;
  const hist = Object.values(store.hist());

  if (draft) return <ExamRunner draft={draft} onQuit={() => { setDraft(null); nav('/mock', { replace: true, state: null }); }} onRetry={(ids) => setDraft(startRetry(ids))} />;

  return (
    <div className="page">
      <nav className="side">
        <div className="howto"><h3>문제 은행</h3><p className="sm">전체 {stats.total} · 코드 {stats.code} · SQL {stats.sql}<br />기출 변형 {stats.kv} · 예상 {stats.pred}<br />푼 문항 {seen.size}</p></div>
      </nav>
      <main>
        <div><div className="eyebrow">모의고사</div><h2 style={{ margin: '2px 0 4px', fontSize: 22 }}>실전 · 영역별 · 최종</h2><p className="meta" style={{ margin: 0 }}>한 번 나온 문항은 뒤로 밀려서 같은 문제가 반복되지 않아. 코드는 출력 형식까지, SQL은 실제 실행 결과로 채점.</p></div>

        <div className="card">
          <div className="ctop"><h3>실전 모의고사 <span className="en">20문항 · 150분 권장</span></h3><button className="btn primary" onClick={() => setDraft(startReal())}>실전 시작</button></div>
          <p className="muted">최근 기출 회차 하나를 틀로 잡고 같은 자리에 기출 변형·예상 문항을 채워. 코드 9~10, SQL 3 이상, 용어집 단답형 1~2 포함.</p>
        </div>

        <div className="card">
          <div className="ctop"><h3>영역별 모의고사 <span className="en">20문항 = 이론 n + 코드 (20 − n)</span></h3></div>
          <div className="filters">{TH_AREAS.map((a) => <button key={a} className="fbtn" aria-pressed={sel.has(a)} onClick={() => { const s = new Set(sel); if (s.has(a)) s.delete(a); else s.add(a); setSel(s); }}>{areaName(a)} <span className="muted">{fresh(a)}</span></button>)}</div>
          <div className="filters">
            <span className="sm muted">이론</span>
            <select value={n} onChange={(e) => setN(+e.target.value)}>{[0, 4, 8, 10, 12, 14, 16, 20].map((v) => <option key={v} value={v}>{v}문항 (코드 {20 - v})</option>)}</select>
            <button className="btn primary" disabled={!sel.size && n > 0} onClick={() => setDraft(startArea([...sel], n))}>시작</button>
            <span className="sm muted">숫자는 아직 안 푼 문항 수</span>
          </div>
        </div>

        <div className="card">
          <div className="ctop"><h3>최종 모의고사 <span className="en">고정 5회 · 2026년 3회 경향</span></h3></div>
          <div className="filters">{FINALS.map((qs, i) => { const h = hist.filter((r) => r.mode === 'final' && r.qs[0] === qs[0].id).sort((a, b) => b.at.localeCompare(a.at))[0]; return <button key={i} className="btn" onClick={() => setDraft(startFinal(i + 1, qs))}>{i + 1}회{h ? <span className="muted"> · {h.score}점</span> : ''}</button>; })}</div>
          <p className="muted sm">회차마다 주제가 안 겹치게 배분한 20문항 세트.</p>
        </div>
      </main>
    </div>
  );
}
