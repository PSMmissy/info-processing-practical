import type { Question, BlankResult } from '../engine/types';
import { areaName } from '../engine/types';
import { JAMO } from '../engine/util';
import { kvLabel } from '../engine/bank';
import { sqlExpectRows } from '../engine/sql';

export function Table({ head, rows }: { head: string[]; rows: any[][] }) {
  return (
    <div className="tw"><table className="cmp">
      <thead><tr>{head.map((h, i) => <th key={i}>{String(h)}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c == null ? 'NULL' : String(c)}</td>)}</tr>)}</tbody>
    </table></div>
  );
}

function Passage({ text }: { text: string }) {
  const parts = text.split(/(\( [①-⑩] \))/g);
  return <div className="mpass">{parts.map((p, i) => (/^\( [①-⑩] \)$/.test(p) ? <span key={i}>( <mark>{p[2]}</mark> )</span> : <span key={i}>{p}</span>))}</div>;
}

export type QCProps = {
  q: Question; n: number; ans: string[]; onChange?: (k: number, v: string) => void;
  res?: BlankResult[]; graded?: boolean; showMeta?: boolean;
};

export default function QuestionCard({ q, n, ans, onChange, res, graded, showMeta = true }: QCProps) {
  const ok = graded && res ? res.filter((r) => r.ok).length : 0;
  const cls = graded && res ? (ok === res.length ? 'all' : ok === 0 ? 'none' : 'part') : '';
  const sql = q.sql;
  const expectRows = graded && sql && q.type === 'sql' ? sqlExpectRows(sql) : null;
  const lang = q.code?.lang ? ({ c: 'C', java: 'Java', python: 'Python' } as any)[q.code.lang] : '';
  const dis = !!graded || !onChange;
  const longBox = !!q.box && q.box.some((o) => o.length > 18);
  return (
    <div className={`mq ${cls}`} id={`q-${q.id}`}>
      <div className="mqh">
        <b>{n}.</b>
        <span className="tag">{q.area === 'code' ? `${lang} 코드` : areaName(q.area)}</span>
        {showMeta && q.pred && <span className="tag pred">{kvLabel(q)}</span>}
        {showMeta && q.kv && <span className="tag gi">{kvLabel(q)}</span>}
        {showMeta && q.gl && <span className="tag">용어집 단답형</span>}
        {graded && <span className="muted sm" style={{ marginLeft: 'auto' }}>{q.concept}</span>}
      </div>
      <p className="qq">{q.stem}</p>
      {q.passage && <Passage text={q.passage} />}
      {q.table && <Table head={q.table.head} rows={q.table.rows} />}
      {q.code && <pre className="mcode">{q.code.src}</pre>}
      {sql && (
        <div>
          {sql.tables.map((t) => <div key={t.name}><div className="sqltn">〈{t.name}〉</div><Table head={t.cols} rows={t.rows} /></div>)}
          {sql.query && <pre className="mcode">{sql.query}</pre>}
          {sql.cond && <div className="sqlcond"><b>〈처리 조건〉</b><ul>{sql.cond.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}
          {sql.showResult && sql.resultRows && sql.kind === 'select' && <div><div className="sqltn">〈결과〉</div><Table head={sql.resultCols!} rows={sql.resultRows} /></div>}
        </div>
      )}
      {q.box && <div className={`bogi ${longBox ? 'long' : ''}`}><span className="bh">보기</span><div className="bl">{q.box.map((o, i) => <span key={i}><b>{JAMO[i]}.</b>{o}</span>)}</div></div>}
      <div className="mblanks">
        {q.blanks.map((b, k) => {
          const v = ans[k] || '';
          const st = graded && res ? (res[k]?.ok ? 'ok' : 'bad') : '';
          if (q.type === 'code') return <div className="mrow" key={k}><span className="mlab">출력</span><textarea className={`qin qout ${st}`} disabled={dis} value={v} placeholder="실행 결과를 줄바꿈까지 그대로" onChange={(e) => onChange?.(k, e.target.value)} /></div>;
          if (q.type === 'sql') return <div className="mrow" key={k}><span className="mlab">SQL</span><textarea className={`qin qsql ${st}`} disabled={dis} value={v} placeholder="SQL문 작성" onChange={(e) => onChange?.(k, e.target.value)} /></div>;
          return <div className="mrow" key={k}><span className="mlab">{b.label || '답'}</span><input className={`qin ${st}`} disabled={dis} value={v} autoComplete="off" placeholder={q.type === 'box' ? '기호 (예: ㄷ)' : q.type === 'codeblank' ? '코드 조각' : ''} onChange={(e) => onChange?.(k, e.target.value)} /></div>;
        })}
      </div>
      {graded && res && (
        <div className="mrev">
          {q.blanks.map((b, k) => {
            const r = res[k];
            return (
              <div key={k} className={`mrr ${r?.ok ? 'ok' : 'ng'}`}>
                <span className="mmark">{r?.ok ? '정답' : '오답'}</span>
                <div className="mrc">
                  {q.type === 'code' ? (
                    <>
                      <span>정답 출력</span><pre className="mcode" style={{ margin: '4px 0' }}>{b.answer}</pre>
                      {!r?.ok && <><span className="muted sm">내 답</span><pre className="mcode" style={{ margin: '4px 0', opacity: .8 }}>{ans[k] || '(빈칸)'}</pre></>}
                    </>
                  ) : q.type === 'sql' ? (
                    <>
                      <span>모범 답안: <code>{b.answer}</code></span>
                      {r?.msg && <span className="muted sm">{r.msg}</span>}
                      {!r?.ok && (r?.mine?.values || expectRows) && <div className="sqlcmp">
                        {r?.mine?.values && <div><div className="tl">내 실행 결과</div><Table head={r.mine.columns} rows={r.mine.values} /></div>}
                        {expectRows && <div><div className="tl">정답 실행 결과{sql!.kind === 'dml' ? ` 〈${sql!.target}〉` : ''}</div><Table head={expectRows.columns} rows={expectRows.values} /></div>}
                      </div>}
                    </>
                  ) : (
                    <>
                      <span>{b.label ? b.label + ' ' : ''}정답: <b>{b.answer}</b>{q.type === 'box' && q.box && <span className="muted"> — {(b.answer.match(/[ㄱ-ㅎ]/g) || []).map((s) => q.box![JAMO.indexOf(s)]).join(' → ')}</span>}</span>
                      {!r?.ok && <span className="muted sm">내 답: {ans[k] || '(빈칸)'}{r?.msg ? ' — ' + r.msg : ''}</span>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {q.trap && <div className="mexp"><b className="ngc">함정</b> {q.trap}</div>}
          {q.explain && <div className="mexp">{q.explain}</div>}
          {q.solve && <details className="msolve"><summary>풀이 과정</summary>
            {(q.solve as any).steps && <ol className="msteps">{(q.solve as any).steps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>}
            {(q.solve as any).trace?.head && <Table head={(q.solve as any).trace.head} rows={(q.solve as any).trace.rows} />}
            {(q.solve as any).output && <div className="muted sm">최종: {String((q.solve as any).output)}</div>}
          </details>}
        </div>
      )}
    </div>
  );
}
