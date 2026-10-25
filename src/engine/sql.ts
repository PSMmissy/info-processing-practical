import type { SqlSpec, SqlTable, BlankResult } from './types';

declare global { interface Window { initSqlJs?: (cfg?: any) => Promise<any> } }

let SQL: any = null;
let loading: Promise<any> | null = null;
export function loadSql(): Promise<any> {
  if (SQL) return Promise.resolve(SQL);
  if (loading) return loading;
  loading = (window.initSqlJs ? window.initSqlJs() : Promise.reject(new Error('sql.js not found')))
    .then((S: any) => { SQL = S; return S; })
    .catch((e: any) => { loading = null; throw e; });
  return loading;
}
export const sqlReady = () => !!SQL;

function freshDb(tables: SqlTable[]) {
  const db = new SQL.Database();
  for (const t of tables) {
    db.run(`CREATE TABLE ${t.name} (${t.cols.map((c, i) => c + ' ' + t.types[i]).join(', ')});`);
    const st = db.prepare(`INSERT INTO ${t.name} VALUES (${t.cols.map(() => '?').join(',')})`);
    for (const r of t.rows) st.run(r);
    st.free();
  }
  return db;
}
function runSel(db: any, sql: string): { columns: string[]; values: any[][] } {
  const r = db.exec(sql);
  return r[r.length - 1] || { columns: [], values: [] };
}
const normCell = (v: any) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
function rowsKey(rows: any[][], ordered = false) {
  const m = rows.map((r) => JSON.stringify(r.map(normCell)));
  return (ordered ? m : m.slice().sort()).join('|');
}
const dumpTable = (db: any, t: string) => runSel(db, `SELECT * FROM ${t}`).values;

const SQL_KW = ['SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'INSERT', 'UPDATE', 'DELETE', 'VALUES', 'CREATE', 'TABLE', 'ALTER', 'DISTINCT', 'BETWEEN', 'COUNT', 'AVG', 'SUM', 'MAX', 'MIN', 'INNER', 'OUTER', 'JOIN', 'UNION', 'INTERSECT', 'EXCEPT', 'EXISTS', 'LIKE', 'LIMIT', 'INDEX', 'VIEW', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'PRIMARY', 'FOREIGN', 'REFERENCES', 'CASCADE', 'UNIQUE', 'CHECK', 'DEFAULT', 'TRUNCATE', 'DROP', 'ASC', 'DESC', 'NULL', 'USING', 'NATURAL', 'CROSS', 'LEFT', 'RIGHT', 'FULL', 'COALESCE', 'LENGTH', 'ROUND', 'SUBSTR', 'UPPER', 'LOWER', 'TRIM', 'CONCAT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'OFFSET', 'INTEGER', 'VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'DATE', 'TRIGGER', 'BEFORE', 'AFTER', 'EACH', 'BEGIN', 'DECLARE', 'CURSOR', 'FETCH', 'CLOSE', 'OPTION', 'PRIVILEGES', 'ADD', 'COLUMN', 'MODIFY', 'RENAME', 'INTO', 'SET', 'AND', 'NOT', 'ALL', 'ANY', 'SOME', 'IN', 'IS', 'ON', 'AS', 'BY', 'OR', 'TO', 'ROW', 'WITH', 'PARTITION', 'OVER', 'RANK', 'DENSE_RANK', 'ROW_NUMBER', 'REPLACE', 'IFNULL', 'NULLIF', 'ABS', 'MOD', 'TOTAL', 'GLOB', 'ESCAPE'];
function dl1(a: string, b: string) {
  if (a === b) return false;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, d = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    d++; if (d > 1) return false;
    if (la > lb) i++; else if (lb > la) j++;
    else if (i + 1 < la && j + 1 < lb && a[i] === b[j + 1] && a[i + 1] === b[j]) { i += 2; j += 2; }
    else { i++; j++; }
  }
  return d + (la - i) + (lb - j) === 1;
}
function sqlTypo(sql: string): [string, string] | null {
  const words = String(sql).replace(/'[^']*'/g, ' ').toUpperCase().match(/[A-Z_]{5,}/g) || [];
  for (const w of words) { if (SQL_KW.includes(w)) continue; const k = SQL_KW.find((k) => dl1(w, k)); if (k) return [w, k]; }
  return null;
}

/** 작성형 SQL 채점: 실행 결과(select) 또는 실행 후 테이블(dml)을 모범 답안과 비교 */
export function gradeSql(spec: SqlSpec, sql: string): BlankResult {
  sql = String(sql || '').trim();
  if (!sql) return { ok: false, msg: '답을 쓰지 않았어.' };
  if (!SQL) return { ok: false, msg: 'SQL 실행 엔진을 아직 불러오지 못했어. 잠시 후 다시 제출해 줘.' };
  const ty = sqlTypo(sql); if (ty) return { ok: false, msg: `철자가 틀렸어: ${ty[0]} → ${ty[1]}` };
  if (/\bLEN\s*\(/i.test(sql)) return { ok: false, msg: 'LEN은 MSSQL 전용 함수야. 표준 SQL은 LENGTH를 써.' };
  const alias = (spec.cond || []).some((c) => /별칭/.test(c));
  const dbA = freshDb(spec.tables), dbB = freshDb(spec.tables);
  try {
    if (spec.kind === 'dml') {
      dbA.run(spec.expect!);
      try { dbB.run(sql); } catch (e: any) { return { ok: false, msg: 'SQL 오류: ' + e.message }; }
      const target = spec.target!;
      const a = dumpTable(dbA, target), b = dumpTable(dbB, target);
      for (const t of spec.tables) { if (t.name !== target && rowsKey(dumpTable(dbA, t.name)) !== rowsKey(dumpTable(dbB, t.name))) return { ok: false, msg: `[${t.name}] 테이블까지 바뀌었어.` }; }
      const ok = rowsKey(a) === rowsKey(b);
      const cols = spec.tables.find((t) => t.name === target)!.cols;
      return { ok, msg: ok ? '' : '실행 후 테이블 내용이 정답과 달라. WHERE 조건이나 값을 확인해 봐.', mine: { columns: cols, values: b }, want: { columns: cols, values: a } };
    }
    const want = runSel(dbA, spec.expect!);
    let mine: { columns: string[]; values: any[][] };
    try { mine = runSel(dbB, sql); } catch (e: any) { return { ok: false, msg: 'SQL 오류: ' + e.message }; }
    if (!mine.values.length && want.values.length) return { ok: false, msg: '조회 결과가 한 행도 안 나와. 조건을 확인해 봐.' + (/=\s*NULL/i.test(sql) ? ' NULL 비교는 = NULL이 아니라 IS NULL이야.' : ''), mine: { columns: want.columns, values: [] }, want };
    if (mine.columns.length !== want.columns.length) return { ok: false, msg: `출력 컬럼 수가 달라 (정답 ${want.columns.length}개, 내 답 ${mine.columns.length}개).`, mine, want };
    const nameOf = (c: string) => String(c).split('.').pop()!.replace(/^["'`[]|["'`\]]$/g, '').toLowerCase();
    if (alias && mine.columns.some((c, i) => nameOf(c) !== nameOf(want.columns[i]))) return { ok: false, msg: `컬럼 이름(별칭)이나 순서가 달라. 정답: ${want.columns.join(', ')}`, mine, want };
    if (rowsKey(mine.values) !== rowsKey(want.values)) return { ok: false, msg: '조회 결과(행)가 달라.', mine, want };
    if (spec.ordered && rowsKey(mine.values, true) !== rowsKey(want.values, true)) return { ok: false, msg: '행은 맞는데 정렬 순서가 달라.', mine, want };
    return { ok: true, mine, want };
  } finally { try { dbA.close(); } catch { /* */ } try { dbB.close(); } catch { /* */ } }
}

/** 결과값(value) 유형: 지문의 SQL을 실행해 얻는 값/행 수 */
export function sqlValue(spec: SqlSpec): string | null {
  if (!SQL) return null;
  const db = freshDb(spec.tables);
  try { const r = runSel(db, spec.query!); return spec.rowcount ? String(r.values.length) : String(normCell(r.values[0]?.[0])); }
  catch { return null; } finally { db.close(); }
}
/** 모범 답안 실행 결과 (문제 화면의 [결과] 표시용) */
export function sqlExpectRows(spec: SqlSpec): { columns: string[]; values: any[][] } | null {
  if (spec.resultCols && spec.resultRows) return { columns: spec.resultCols, values: spec.resultRows };
  if (!SQL || !spec.expect) return null;
  const db = freshDb(spec.tables);
  try { if (spec.kind === 'dml') { db.run(spec.expect); return runSel(db, `SELECT * FROM ${spec.target}`); } return runSel(db, spec.expect); }
  catch { return null; } finally { db.close(); }
}
