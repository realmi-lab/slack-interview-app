import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadEnvFile } from 'node:process';

export function loadConfig(root, env = process.env) {
  const file = join(root, 'config.json');
  const config = { startHour: 10, endHour: 18, interviewMinutes: 60, optionCount: 6,
    ...(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}) };
  for (const [key, name] of Object.entries({ startHour: 'START_HOUR', endHour: 'END_HOUR', interviewMinutes: 'INTERVIEW_MINUTES', optionCount: 'OPTION_COUNT' })) {
    if (env[name]?.trim()) config[key] = Number(env[name]);
  }
  config.notificationChannelId = env.SLACK_NOTIFICATION_CHANNEL?.trim() || config.notificationChannelId || '';
  if (!/^[CG][A-Z0-9]+$/.test(config.notificationChannelId)) throw new Error('SLACK_NOTIFICATION_CHANNEL 또는 config.json의 notificationChannelId에 실제 채널 ID를 입력하세요.');
  for (const [key, min, max] of [['startHour', 0, 23], ['endHour', 1, 24], ['interviewMinutes', 1, 480], ['optionCount', 1, 10]]) {
    if (!Number.isInteger(config[key]) || config[key] < min || config[key] > max) throw new Error(`${key}: ${min}~${max} 범위의 정수가 필요합니다.`);
  }
  if (config.endHour <= config.startHour || config.interviewMinutes > (config.endHour - config.startHour) * 60) throw new Error('시작·종료 시각과 면접 길이를 확인하세요.');
  // At least one candidate must survive the fixed lunch exclusion.
  let candidates = 0;
  for (let start = config.startHour * 60; start + config.interviewMinutes <= config.endHour * 60; start += config.interviewMinutes) {
    if (!(start < 14 * 60 && start + config.interviewMinutes > 12 * 60 + 30)) candidates++;
  }
  if (!candidates) throw new Error('점심시간을 제외하면 후보가 없습니다. 시간 설정을 바꾸세요.');
  return config;
}

export function readTokens(env = process.env, platform = process.platform, readKeychain = service => execFileSync('/usr/bin/security', ['find-generic-password', '-s', service, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()) {
  const get = (name, service, prefix) => {
    let value = env[name]?.trim();
    if (!value && platform === 'darwin') {
      try { value = readKeychain(service); } catch { /* Give a token-free setup error below. */ }
    }
    if (!value?.startsWith(prefix) || /\s/.test(value)) throw new Error(`${name}을 .env에 입력하세요. macOS에서는 기존 키체인도 사용할 수 있습니다.`);
    return value;
  };
  return { token: get('SLACK_BOT_TOKEN', 'slack-interview-bot-token', 'xoxb-'), appToken: get('SLACK_APP_TOKEN', 'slack-interview-app-token', 'xapp-') };
}

export function loadRuntime(root) {
  const envFile = join(root, '.env');
  if (existsSync(envFile)) loadEnvFile(envFile); // Existing process environment takes precedence.
  return { config: loadConfig(root), tokens: readTokens() };
}
