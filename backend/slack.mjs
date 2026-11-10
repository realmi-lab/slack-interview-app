// Slack 공통 연결: .env 토큰 확인과 Socket Mode 접속만 담당한다.
import { App } from '@slack/bolt';
import { execFileSync } from 'node:child_process';

export function readTokens(env = process.env, platform = process.platform, readKeychain = service => execFileSync('/usr/bin/security', ['find-generic-password', '-s', service, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()) {
  const get = (name, service, prefix) => {
    let value = env[name]?.trim();
    // Existing Mac installations can explicitly opt in; normal setup uses .env only.
    if (!value && env.SLACK_TOKEN_SOURCE === 'keychain' && platform === 'darwin') {
      try { value = readKeychain(service); } catch { /* Report a token-free setup error. */ }
    }
    if (!value?.startsWith(prefix) || /\s/.test(value)) throw new Error(`${name}: .env에 올바른 토큰을 입력하세요.`);
    return value;
  };
  return { token: get('SLACK_BOT_TOKEN', 'slack-interview-bot-token', 'xoxb-'), appToken: get('SLACK_APP_TOKEN', 'slack-interview-app-token', 'xapp-') };
}

export function createApp(tokens) {
  return new App({ ...tokens, socketMode: true, logLevel: 'error', clientOptions: { retryConfig: { retries: 0 } } });
}
