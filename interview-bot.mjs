import { App } from '@slack/bolt';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NUMBER_EMOJI, nextMonday, weekLabel, weekSlots, spread, tally, respondedCount } from './core.mjs';
import { PollStore } from './store.mjs';
import { homeView, pollModal, pollMessage, mentions } from './blocks.mjs';

import { loadRuntime } from './runtime.mjs';

// ── 설정·저장소 ──
const root = dirname(fileURLToPath(import.meta.url));
const { config, tokens } = loadRuntime(root);
mkdirSync(join(root, 'data'), { recursive: true, mode: 0o700 });
const store = new PollStore(join(root, 'data', 'availability.sqlite'));

// ── Slack 연결 (Socket Mode, 토큰은 macOS 키체인) ──
const app = new App({
  ...tokens,
  socketMode: true,
  logLevel: 'error',
  clientOptions: { retryConfig: { retries: 0 } },
});

// ── 조율 시작: /interview 또는 앱 홈 버튼 ──
// 다음 주 후보 중 확정된 면접 시간을 빼고, 한 주에 고르게 추천한다
async function openPollModal(client, triggerId, team, channel) {
  const weekStart = nextMonday();
  const busy = store.busy(team);
  const slots = weekSlots(weekStart, config).filter(slot => !busy.has(slot.id));
  await client.views.open({
    trigger_id: triggerId,
    view: pollModal({ week: weekLabel(weekStart), slots, suggested: spread(slots, config.optionCount), interviewers: store.lastInterviewers(team), channel }),
  });
}

app.command('/interview', async ({ command, ack, client }) => {
  await ack();
  await openPollModal(client, command.trigger_id, command.team_id, command.channel_id);
});
app.action('open_poll', async ({ body, ack, client }) => {
  await ack();
  await openPollModal(client, body.trigger_id, body.team.id, config.notificationChannelId);
});
app.event('app_home_opened', async ({ event, client }) => {
  if (event.tab === 'home') await client.views.publish({ user_id: event.user, view: homeView(config.notificationChannelId) });
});

// 조율 메시지를 올리고, 누르기 쉽게 번호 이모지를 미리 달아 둔다
app.view('create_poll', async ({ body, view, ack, client }) => {
  const values = view.state.values;
  const poll = {
    team: body.team.id,
    organizer: body.user.id,
    interviewers: values.interviewers.users.selected_users,
    options: values.options.slots.selected_options
      .map(option => ({ id: option.value, label: option.text.text }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    confirmed: null,
  };
  let posted;
  try {
    posted = await client.chat.postMessage({ channel: view.private_metadata, ...pollMessage(poll, poll.options.map(() => [])) });
  } catch (error) {
    return ack({ response_action: 'errors', errors: { options: `이 대화에 올릴 수 없어요(${error.data?.error ?? error.message}). 봇을 채널에 초대한 뒤 다시 보내 주세요.` } });
  }
  await ack();
  store.create({ ...poll, channel: posted.channel, ts: posted.ts });
  for (const name of NUMBER_EMOJI.slice(0, poll.options.length)) {
    await client.reactions.add({ channel: posted.channel, timestamp: posted.ts, name });
  }
});

// ── 이모지 반응 → 조율 메시지 갱신 ──
// 반응이 한꺼번에 와도 하나씩 순서대로 반영한다
let queue = Promise.resolve();
const refresh = (client, channel, ts) => (queue = queue.then(() => render(client, channel, ts)).catch(console.error));

async function render(client, channel, ts) {
  const poll = store.get(channel, ts);
  if (!poll) return; // 조율 메시지가 아님
  const { message } = await client.reactions.get({ channel, timestamp: ts, full: true });
  const votes = tally(poll, message.reactions);
  await client.chat.update({ channel, ts, ...pollMessage(poll, votes) });
  if (!poll.notified && respondedCount(votes) === poll.interviewers.length) {
    store.markNotified(channel, ts);
    await client.chat.postMessage({ channel, thread_ts: ts, text: `<@${poll.organizer}> 면접관이 모두 응답했어요. 위 메시지에서 모두 가능한 시간을 확인하고 확정해 주세요.` });
  }
}

const onReaction = async ({ event, client }) => {
  if (event.item.type === 'message' && NUMBER_EMOJI.includes(event.reaction)) await refresh(client, event.item.channel, event.item.ts);
};
app.event('reaction_added', onReaction);
app.event('reaction_removed', onReaction);

// ── 확정 / 확정 취소 (조율을 요청한 사람만) ──
async function setConfirmed({ body, ack, client }, index) {
  await ack();
  const channel = body.container.channel_id;
  const ts = body.container.message_ts;
  const poll = store.get(channel, ts);
  if (!poll) return;
  if (body.user.id !== poll.organizer) {
    await client.chat.postEphemeral({ channel, user: body.user.id, text: '조율을 요청한 사람만 확정할 수 있어요.' });
    return;
  }
  store.setConfirmed(channel, ts, index);
  await refresh(client, channel, ts);
  const text = index === null ? '확정을 취소했어요.' : `📌 면접 확정: ${poll.options[index].label}\n${mentions(poll.interviewers)}`;
  await client.chat.postMessage({ channel, thread_ts: ts, text });
}
app.action(/^confirm_slot_\d+$/, args => setConfirmed(args, Number(args.action.value)));
app.action('unconfirm_slot', args => setConfirmed(args, null));

app.error(async error => console.error('Slack 요청 처리 실패:', error?.code || error?.message || error));

// ── 시작·종료 ──
await app.start();
console.log('Slack 연결 완료 · 면접 일정 조율 봇');

async function stop() {
  await app.stop();
  store.close();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
