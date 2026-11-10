import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../backend/config.mjs';
import { readTokens } from '../backend/slack.mjs';
test('fresh installation uses environment without config.json or macOS keychain', () => {
  const root = mkdtempSync(join(tmpdir(), 'interview-'));
  try {
    assert.equal(loadConfig(root, { SLACK_NOTIFY_CHANNEL: 'C123' }).optionCount, 6);
    assert.equal(loadConfig(root, { SLACK_NOTIFY_CHANNEL: 'C123', INTERVIEW_MINUTES: '30', OPTION_COUNT: '8' }).interviewMinutes, 30);
    assert.throws(() => loadConfig(root, { SLACK_NOTIFY_CHANNEL: 'C123', OPTION_COUNT: 'NaN' }), /optionCount/);
    assert.throws(() => loadConfig(root, {}), /채널 ID/);
    writeFileSync(join(root, 'config.json'), JSON.stringify({ interviewMinutes: 0 }));
    assert.throws(() => loadConfig(root, { SLACK_NOTIFY_CHANNEL: 'C123' }), /interviewMinutes/);
    writeFileSync(join(root, 'config.json'), JSON.stringify({ startHour: 13, endHour: 14 }));
    assert.throws(() => loadConfig(root, { SLACK_NOTIFY_CHANNEL: 'C123' }), /후보가 없습니다/);
  } finally { rmSync(root, { recursive: true }); }
});
test('environment wins over keychain and missing tokens give actionable errors', () => {
  const env = { SLACK_BOT_TOKEN: 'xoxb-synthetic', SLACK_APP_TOKEN: 'xapp-synthetic' };
  assert.equal(readTokens(env, 'linux').token, env.SLACK_BOT_TOKEN);
  assert.equal(readTokens(env, 'darwin', () => { throw Error('must not read'); }).appToken, env.SLACK_APP_TOKEN);
  assert.equal(readTokens({ SLACK_TOKEN_SOURCE: 'keychain' }, 'darwin', s => s.includes('bot-token') ? env.SLACK_BOT_TOKEN : env.SLACK_APP_TOKEN).token, env.SLACK_BOT_TOKEN);
  assert.throws(() => readTokens({}, 'linux'), /SLACK_BOT_TOKEN/);
  assert.throws(() => readTokens({}, 'darwin'), /SLACK_BOT_TOKEN/);
});

test('a copied .env alone configures a fresh process without config.json', async () => {
  const { spawnSync } = await import('node:child_process');
  const root = mkdtempSync(join(tmpdir(), 'interview-env-'));
  try {
    writeFileSync(join(root, '.env'), 'SLACK_BOT_TOKEN=xoxb-synthetic\nSLACK_APP_TOKEN=xapp-synthetic\nSLACK_NOTIFY_CHANNEL=C123\nINTERVIEW_MINUTES=30\nOPTION_COUNT=8\nAPP_TIMEZONE=Asia/Seoul\nSQLITE_PATH=data/custom.sqlite\n');
    const env = { ...process.env };
    for (const key of ['SLACK_BOT_TOKEN','SLACK_APP_TOKEN','SLACK_NOTIFY_CHANNEL','INTERVIEW_MINUTES','OPTION_COUNT','START_HOUR','END_HOUR','TZ','APP_TIMEZONE','SQLITE_PATH','SLACK_NOTIFICATION_CHANNEL','SLACK_TOKEN_SOURCE']) delete env[key];
    const script = `import { loadRuntime } from ${JSON.stringify(new URL('../backend/config.mjs', import.meta.url).href)}; const r=loadRuntime(${JSON.stringify(root)}); if(r.config.interviewMinutes!==30||r.config.optionCount!==8||process.env.TZ!=='Asia/Seoul'||!r.sqlitePath.endsWith('custom.sqlite'))process.exit(1);`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  } finally { rmSync(root, { recursive: true }); }
});
