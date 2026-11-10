import { tally, commonOptions } from './core.mjs';

// Recheck live votes: an old button must not confirm a slot after votes changed.
export async function confirmPoll(store, client, channel, ts, user, index) {
  const poll = store.get(channel, ts);
  if (!poll) return '조율을 찾지 못했어요.';
  if (user !== poll.organizer) return '조율을 요청한 사람만 확정할 수 있어요.';
  if (index !== null) {
    if (!Number.isInteger(index) || index < 0 || index >= poll.options.length) return '유효하지 않은 후보예요.';
    const { message } = await client.reactions.get({ channel, timestamp: ts, full: true });
    if (!commonOptions(poll, tally(poll, message.reactions)).includes(index)) return '응답이 바뀌었어요. 모두 가능한 후보를 다시 확인해 주세요.';
  }
  store.setConfirmed(channel, ts, index);
  return null;
}
