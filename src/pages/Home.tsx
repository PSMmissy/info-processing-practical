import { Link } from 'react-router-dom';
import meta from '../data/meta.json';
import { store } from '../engine/store';

export default function Home() {
  const hist = Object.values(store.hist()).sort((a, b) => b.at.localeCompare(a.at));
  const last = hist[0];
  return (
    <div className="page">
      <nav className="side">
        <div className="howto"><h3>HOW TO</h3><ol>
          <li><b>이론 노트</b>로 영역 하나 훑고 → <b>개념 퀴즈</b> 20문제 → 틀린 건 <b>용어집</b> '틀린 적 있음'으로 복습.</li>
          <li>영역이 한 바퀴 돌면 <b>실전 모의고사</b> 하루 1~3회. 코드는 출력 형식(공백·줄바꿈)까지 그대로 써야 맞아.</li>
          <li>시험 전날은 <b>내 기록 → 틀린 문항 다시 풀기</b>와 용어집 '틀린 적 있음'만.</li>
        </ol></div>
      </nav>
      <main>
        <div><div className="eyebrow">정보처리기사 실기 대비</div><h2 style={{ margin: '2px 0 4px', fontSize: 22 }}>이론 · 용어 · 퀴즈 · 모의고사를 한곳에</h2><p className="meta" style={{ margin: 0 }}>로그인 없이 바로 쓰고, 기록은 이 브라우저에 남아. 문제·용어는 전부 자체 제작(기출은 원문이 아닌 변형).</p></div>
        {last && <div className="howto"><h3>최근 모의고사</h3><p><b className={last.score >= 60 ? 'okc' : 'ngc'}>{last.score}점</b> · {last.at.slice(0, 10)} · <Link to="/history">기록 보기</Link></p></div>}
        <div className="todaygrid">
          <Link to="/mock" className="tcard"><span className="tl">모의고사</span><b>실전 20문항</b><span>문제 {meta.total} · 코드 {meta.code} · SQL {meta.sql} · 기출 변형 {meta.kv} · 최종 5회</span></Link>
          <Link to="/glossary" className="tcard"><span className="tl">용어집</span><b>{meta.gloss}개</b><span>시험 핵심 {meta.glossA} · 핵심 한 줄 · 가리기 · 테스트</span></Link>
          <Link to="/concept" className="tcard"><span className="tl">개념 퀴즈</span><b>{meta.qs}개</b><span>설명 → 용어 단답 (입력 / 보기)</span></Link>
          <Link to="/theory" className="tcard"><span className="tl">이론 노트</span><b>{meta.notes}개 개념</b><span>시험에서 가르는 기준 중심 · 코드 예제</span></Link>
        </div>
        <p className="foot">틀린 정답이나 애매한 보기를 발견하면 문항 ID와 함께 알려줘.</p>
      </main>
    </div>
  );
}
