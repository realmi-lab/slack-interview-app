// 면접 후보 시간 계산과 이모지 투표 집계 (Slack·DB와 무관한 순수 함수)

export const DAY_NAMES = ['월', '화', '수', '목', '금'];
// 후보 번호 1~10에 쓰는 Slack 이모지 이름
export const NUMBER_EMOJI = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'keycap_ten'];

const LUNCH = { start: 12 * 60 + 30, end: 14 * 60 }; // 점심 12:30–14:00 (분 단위)

const clock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const shortDate = day => `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`;

export function addDays(day, n) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

// 오늘 다음에 오는 월요일 (오늘이 월요일이면 다음 주 월요일)
export function nextMonday(today = new Date()) {
  const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7 || 7));
  return date.toISOString().slice(0, 10);
}

export const weekLabel = weekStart => `${shortDate(weekStart)}–${shortDate(addDays(weekStart, 4))}`;

// 한 주(월~금)의 면접 후보 시간. 점심시간과 겹치는 시간은 뺀다.
export function weekSlots(weekStart, { startHour = 10, endHour = 18, interviewMinutes = 60 } = {}) {
  const slots = [];
  DAY_NAMES.forEach((name, i) => {
    const day = addDays(weekStart, i);
    for (let start = startHour * 60; start + interviewMinutes <= endHour * 60; start += interviewMinutes) {
      const end = start + interviewMinutes;
      if (start < LUNCH.end && end > LUNCH.start) continue;
      slots.push({ id: `${day} ${clock(start)}`, label: `${name} ${shortDate(day)} ${clock(start)}–${clock(end)}` });
    }
  });
  return slots;
}

// 목록에서 count개를 고르게 뽑는다 (추천 후보가 한 주에 골고루 퍼지도록)
export function spread(list, count) {
  const n = Math.min(count, list.length);
  return Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]);
}

// 번호 이모지 반응 → 후보마다 그 시간을 누른 면접관 목록
export function tally(poll, reactions = []) {
  return poll.options.map((_, i) => {
    const users = reactions.find(r => r.name === NUMBER_EMOJI[i])?.users ?? [];
    return poll.interviewers.filter(user => users.includes(user));
  });
}

// 면접관 모두가 누른 후보 번호
export const commonOptions = (poll, votes) =>
  votes.flatMap((users, i) => (users.length === poll.interviewers.length ? [i] : []));

// 하나라도 누른 면접관 수
export const respondedCount = votes => new Set(votes.flat()).size;
