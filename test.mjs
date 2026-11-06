import test from 'node:test';
import assert from 'node:assert/strict';
import { nextMonday, weekLabel, weekSlots, spread, tally, commonOptions, respondedCount } from './core.mjs';
import { PollStore } from './store.mjs';
import { homeView, pollModal, pollMessage } from './blocks.mjs';

const slots = weekSlots('2026-11-09');
const poll = {
  channel: 'C1', ts: '1.0', team: 'T1', organizer: 'U0',
  interviewers: ['UA', 'UB', 'UC'],
  options: slots.slice(0, 3),
  confirmed: null,
};

test('다음 주 월요일과 주간 표시', () => {
  assert.equal(nextMonday(new Date(2026, 10, 3)), '2026-11-09'); // 화요일
  assert.equal(nextMonday(new Date(2026, 10, 8)), '2026-11-09'); // 일요일
  assert.equal(nextMonday(new Date(2026, 10, 9)), '2026-11-16'); // 월요일이면 다음 주
  assert.equal(weekLabel('2026-11-09'), '11/9–11/13');
});

test('후보 시간: 1시간 단위, 점심 제외, 하루 6개', () => {
  assert.equal(slots.length, 30);
  assert.deepEqual(slots.slice(0, 6).map(s => s.id.slice(11)), ['10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
  assert.deepEqual(slots[0], { id: '2026-11-09 10:00', label: '월 11/9 10:00–11:00' });
  assert.equal(slots.at(-1).label, '금 11/13 17:00–18:00');
});

test('추천: 한 주에 고르게 퍼짐', () => {
  assert.deepEqual(spread(slots, 6).map(s => s.label), [
    '월 11/9 10:00–11:00', '월 11/9 17:00–18:00', '화 11/10 16:00–17:00',
    '수 11/11 15:00–16:00', '목 11/12 14:00–15:00', '금 11/13 11:00–12:00',
  ]);
  assert.equal(spread(slots.slice(0, 2), 6).length, 2);
});

test('이모지 집계: 면접관 반응만 세고 모두 가능한 후보를 찾음', () => {
  const reactions = [
    { name: 'one', users: ['UA', 'UB', 'UC', 'BOT'] },
    { name: 'two', users: ['UA', 'BOT'] },
    { name: 'thumbsup', users: ['UB'] },
  ];
  const votes = tally(poll, reactions);
  assert.deepEqual(votes, [['UA', 'UB', 'UC'], ['UA'], []]);
  assert.deepEqual(commonOptions(poll, votes), [0]);
  assert.equal(respondedCount(votes), 3);
  assert.deepEqual(tally(poll), [[], [], []]); // 반응 없음
});

test('저장소: 확정한 시간은 다음 추천에서 빠짐', () => {
  const store = new PollStore(':memory:');
  store.create(poll);
  assert.deepEqual(store.get('C1', '1.0').options, poll.options);
  assert.equal(store.get('C1', '2.0'), undefined);
  assert.deepEqual(store.lastInterviewers('T1'), poll.interviewers);
  store.setConfirmed('C1', '1.0', 1);
  assert.deepEqual([...store.busy('T1')], ['2026-11-09 11:00']);
  store.setConfirmed('C1', '1.0', null);
  assert.equal(store.busy('T1').size, 0);
  store.markNotified('C1', '1.0');
  assert.equal(store.get('C1', '1.0').notified, 1);
  store.close();
});

test('조율 메시지: 누른 사람, 모두 가능, 확정·취소 버튼', () => {
  const votes = [['UA', 'UB', 'UC'], ['UA'], []];
  const open = pollMessage(poll, votes);
  const blocks = JSON.stringify(open.blocks);
  assert.match(open.text, /<@UA> <@UB> <@UC>/);
  assert.match(blocks, /:two: 월 11\/9 11:00–12:00 {3}<@UA>/);
  assert.match(blocks, /응답 3\/3명/);
  assert.match(blocks, /confirm_slot_0/);
  assert.doesNotMatch(blocks, /confirm_slot_1/);

  const confirmed = JSON.stringify(pollMessage({ ...poll, confirmed: 0 }, votes).blocks);
  assert.match(confirmed, /📌 \*확정\* :one: 월 11\/9 10:00–11:00/);
  assert.match(confirmed, /unconfirm_slot/);
  assert.doesNotMatch(confirmed, /confirm_slot_\d/);

  assert.match(JSON.stringify(pollMessage(poll, [[], [], []]).blocks), /아직 모두 가능한 시간이 없어요/);
});

test('조율 시작 창과 앱 홈', () => {
  const view = pollModal({ week: '11/9–11/13', slots, suggested: spread(slots, 6), interviewers: ['UA'], channel: 'C1' });
  const select = view.blocks.find(b => b.block_id === 'options').element;
  assert.equal(select.options.length, 30);
  assert.equal(select.initial_options.length, 6);
  assert.equal(select.max_selected_items, 10);
  assert.deepEqual(view.blocks.find(b => b.block_id === 'interviewers').element.initial_users, ['UA']);
  assert.equal(view.private_metadata, 'C1');

  const empty = pollModal({ week: '11/9–11/13', slots, suggested: [], interviewers: [], channel: 'C1' });
  assert.equal('initial_users' in empty.blocks[0].element, false);
  assert.equal('initial_options' in empty.blocks[1].element, false);
  assert.match(JSON.stringify(homeView('C1')), /open_poll/);
});
