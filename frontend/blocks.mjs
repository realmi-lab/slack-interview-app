import { NUMBER_EMOJI, commonOptions, respondedCount } from '../backend/core.mjs';

// Slack Block Kit 화면: 앱 홈, 조율 시작 창, 조율 메시지

const plain = text => ({ type: 'plain_text', text, emoji: true });
const section = text => ({ type: 'section', text: { type: 'mrkdwn', text } });
const context = text => ({ type: 'context', elements: [{ type: 'mrkdwn', text }] });
const button = (text, action_id, extra = {}) => ({ type: 'button', text: plain(text), action_id, ...extra });
const emoji = i => `:${NUMBER_EMOJI[i]}:`;
const optionLabel = (poll, i) => `${emoji(i)} ${poll.options[i].label}`;
export const mentions = users => users.map(user => `<@${user}>`).join(' ');

export function homeView(channel) {
  return {
    type: 'home',
    blocks: [
      { type: 'header', text: plain('면접 일정 조율') },
      section('후보 시간을 보내면 면접관이 번호 이모지(:one: :two: :three: …)로 가능한 시간을 눌러요.\n면접관 모두가 가능한 시간이 메시지에 바로 표시돼요.'),
      { type: 'actions', elements: [button('새 일정 조율', 'open_poll', { style: 'primary' })] },
      context(`여기서 시작하면 <#${channel}> 채널에 올라가요. 다른 채널에서는 \`/interview\`를 입력하세요.`),
    ],
  };
}

// 조율 시작 창: 면접관과 후보 시간을 고른다 (봇 추천 후보가 미리 선택돼 있음)
export function pollModal({ week, slots, suggested, interviewers, channel }) {
  const option = slot => ({ text: plain(slot.label), value: slot.id });
  return {
    type: 'modal',
    callback_id: 'create_poll',
    private_metadata: channel, // 조율 메시지를 올릴 대화
    title: plain('면접 일정 조율'),
    submit: plain('보내기'),
    close: plain('취소'),
    blocks: [
      {
        type: 'input',
        block_id: 'interviewers',
        label: plain('면접관'),
        element: {
          type: 'multi_users_select',
          action_id: 'users',
          placeholder: plain('면접관 선택'),
          ...(interviewers.length && { initial_users: interviewers }),
        },
      },
      {
        type: 'input',
        block_id: 'options',
        label: plain(`후보 시간 · ${week}`),
        hint: plain('점심시간과 이미 확정된 면접 시간은 뺐어요.'),
        element: {
          type: 'multi_static_select',
          action_id: 'slots',
          placeholder: plain('후보 시간 선택'),
          max_selected_items: NUMBER_EMOJI.length,
          options: slots.map(option),
          ...(suggested.length && { initial_options: suggested.map(option) }),
        },
      },
    ],
  };
}

// 조율 메시지: 후보마다 누른 면접관, 모두 가능한 시간, 확정 버튼
export function pollMessage(poll, votes) {
  const lines = poll.options.map((_, i) => `${optionLabel(poll, i)}   ${mentions(votes[i])}`.trimEnd());
  return {
    text: `${mentions(poll.interviewers)} 면접 가능한 시간을 골라주세요`,
    blocks: [
      section(`*면접 가능한 시간의 번호 이모지를 눌러주세요*\n${mentions(poll.interviewers)} · 가능한 시간은 모두 눌러도 돼요`),
      section(lines.join('\n')),
      context(`응답 ${respondedCount(votes)}/${poll.interviewers.length}명 · 요청 <@${poll.organizer}>`),
      { type: 'divider' },
      ...resultBlocks(poll, votes),
    ],
  };
}

function resultBlocks(poll, votes) {
  if (poll.confirmed != null) {
    return [
      section(`📌 *확정* ${optionLabel(poll, poll.confirmed)}`),
      { type: 'actions', elements: [button('확정 취소', 'unconfirm_slot')] },
    ];
  }
  const common = commonOptions(poll, votes);
  if (!common.length) return [section('아직 모두 가능한 시간이 없어요.')];
  return [
    section(`✅ *모두 가능*\n${common.map(i => optionLabel(poll, i)).join('\n')}`),
    { type: 'actions', elements: common.map(i => button(`${emoji(i)} 확정`, `confirm_slot_${i}`, { value: String(i), style: 'primary' })) },
  ];
}
