import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { loadRuntime } from '../runtime.mjs';
try {
  loadRuntime(dirname(dirname(fileURLToPath(import.meta.url))));
  const db = new DatabaseSync(':memory:'); db.exec('SELECT 1'); db.close();
  console.log('설정 형식·토큰 존재·내장 SQLite 정상. Slack 연결·권한은 npm start 후 직접 확인하세요.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
