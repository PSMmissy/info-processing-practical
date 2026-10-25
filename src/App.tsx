import { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { store } from './engine/store';
import { loadSql } from './engine/sql';
const Home = lazy(() => import('./pages/Home'));
const Theory = lazy(() => import('./pages/Theory'));
const Concept = lazy(() => import('./pages/Concept'));
const Glossary = lazy(() => import('./pages/Glossary'));
const Mock = lazy(() => import('./pages/Mock'));
const History = lazy(() => import('./pages/History'));

export default function App() {
  const [theme, setTheme] = useState(store.theme());
  useEffect(() => { if (theme === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', theme); store.setTheme(theme); }, [theme]);
  useEffect(() => { loadSql().catch(() => { /* */ }); }, []);
  return (
    <HashRouter>
      <div className="app">
        <header className="top">
          <NavLink to="/" className="brand"><div className="eyebrow">정보처리기사 실기</div><h1>정처기 실기 족보</h1></NavLink>
          <nav>
            <NavLink to="/theory">이론 노트</NavLink>
            <NavLink to="/concept">개념 퀴즈</NavLink>
            <NavLink to="/glossary">용어집</NavLink>
            <NavLink to="/mock">모의고사</NavLink>
            <NavLink to="/history">내 기록</NavLink>
            <button className="fbtn" style={{ marginLeft: 6 }} onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')} title="테마">{theme === 'dark' ? '어둡게' : theme === 'light' ? '밝게' : '시스템'}</button>
          </nav>
        </header>
        <Suspense fallback={<div className="empty">불러오는 중…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/theory" element={<Theory />} />
            <Route path="/concept" element={<Concept />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/mock" element={<Mock />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </Suspense>
      </div>
    </HashRouter>
  );
}
