import { DatabaseSync } from 'node:sqlite';

// 조율 메시지(채널 + 메시지 ts)마다 면접관·후보 시간·확정 상태를 저장한다.
// 누가 어떤 후보를 눌렀는지는 저장하지 않고, Slack의 이모지 반응을 그때그때 읽는다.
export class PollStore {
  constructor(file) {
    this.db = new DatabaseSync(file);
    this.db.exec(`CREATE TABLE IF NOT EXISTS polls (
      channel      TEXT NOT NULL,
      ts           TEXT NOT NULL,
      team         TEXT NOT NULL,
      organizer    TEXT NOT NULL,              -- 조율을 요청한 사람
      interviewers TEXT NOT NULL,              -- JSON ["U1", "U2"]
      options      TEXT NOT NULL,              -- JSON [{ id, label }]
      confirmed    INTEGER,                    -- 확정한 후보 번호(0부터), 없으면 NULL
      notified     INTEGER NOT NULL DEFAULT 0, -- '모두 응답' 알림을 보냈으면 1
      created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (channel, ts)
    )`);
  }

  create({ channel, ts, team, organizer, interviewers, options }) {
    this.db.prepare('INSERT INTO polls (channel, ts, team, organizer, interviewers, options) VALUES (?, ?, ?, ?, ?, ?)')
      .run(channel, ts, team, organizer, JSON.stringify(interviewers), JSON.stringify(options));
  }

  get(channel, ts) {
    const row = this.db.prepare('SELECT * FROM polls WHERE channel = ? AND ts = ?').get(channel, ts);
    return row && { ...row, interviewers: JSON.parse(row.interviewers), options: JSON.parse(row.options) };
  }

  // index가 null이면 확정 취소
  setConfirmed(channel, ts, index) {
    const poll = this.get(channel, ts);
    if (!poll || (index !== null && (!Number.isInteger(index) || index < 0 || index >= poll.options.length))) {
      throw new Error('유효하지 않은 조율 또는 후보입니다.');
    }
    this.db.prepare('UPDATE polls SET confirmed = ? WHERE channel = ? AND ts = ?').run(index, channel, ts);
  }

  markNotified(channel, ts) {
    this.db.prepare('UPDATE polls SET notified = 1 WHERE channel = ? AND ts = ?').run(channel, ts);
  }

  // 이미 확정된 면접 시간 id (다음 추천에서 뺀다)
  busy(team) {
    const rows = this.db.prepare('SELECT options, confirmed FROM polls WHERE team = ? AND confirmed IS NOT NULL').all(team);
    return new Set(rows.map(row => JSON.parse(row.options)[row.confirmed].id));
  }

  // 가장 최근 조율의 면접관 (다음 조율 창의 기본값)
  lastInterviewers(team) {
    const row = this.db.prepare('SELECT interviewers FROM polls WHERE team = ? ORDER BY rowid DESC LIMIT 1').get(team);
    return row ? JSON.parse(row.interviewers) : [];
  }

  close() {
    this.db.close();
  }
}
