/**
 * Google & Apple Calendar 양방향 연동 엔진 (.ics 표준 파일 내보내기 및 외부 캘린더 일정 불러오기)
 */
import { store } from './storage.js?v=4.0.0';
import { getActiveMedication } from './wegovy.js?v=4.0.0';

/**
 * 선택된 항목만 필터링하여 표준 iCalendar(.ics) 파일 내용 생성
 */
export function generateIcsContent(options = {}) {
  const {
    syncWegovy = true,
    syncEvents = true,
    syncWorkouts = true,
    syncMeals = false,
    syncLedger = false
  } = options;

  const now = new Date();
  const dtstamp = formatDateToIcsUtc(now);
  const eventsIcs = [];

  // 1. 위고비 / 의약품 투약 일정 & 다음 권장 투약일
  if (syncWegovy) {
    const activeMed = getActiveMedication();
    const wegovyLogs = store.getWegovyLogs();

    wegovyLogs.forEach((log, idx) => {
      if (log.date) {
        const uid = `wegovy-${log.id || idx}-${dtstamp}@lifepulse.app`;
        const doseText = log.dose ? `${log.dose}mg` : '투약';
        const siteText = log.siteName || log.site || '복부';
        const summary = `💉 ${activeMed.shortName} ${doseText} (${siteText})`;
        const desc = `체중: ${log.weight ? log.weight + 'kg' : '미입력'}\\n부작용: ${log.sideEffects ? log.sideEffects.join(', ') : '없음'}\\n메모: ${log.memo || '없음'}`;
        
        eventsIcs.push(formatVEvent({
          uid,
          dtstamp,
          dtstart: `${log.date.replace(/-/g, '')}T090000`,
          dtend: `${log.date.replace(/-/g, '')}T093000`,
          summary,
          description: desc,
          alarmMinutes: 15, // 15분 전 푸시 알림
          category: 'MEDICATION'
        }));
      }
    });

    // 다음 예정 투약일 알림도 자동 추가
    const settings = store.getSettings();
    const intervalDays = settings.wegovyIntervalDays || 7;
    if (wegovyLogs.length > 0) {
      const lastLog = wegovyLogs[wegovyLogs.length - 1];
      const lastDate = new Date(lastLog.date);
      lastDate.setDate(lastDate.getDate() + intervalDays);
      const nextDateStr = lastDate.toISOString().substring(0, 10);
      const nextUid = `next-wegovy-${nextDateStr}-${dtstamp}@lifepulse.app`;
      
      eventsIcs.push(formatVEvent({
        uid: nextUid,
        dtstamp,
        dtstart: `${nextDateStr.replace(/-/g, '')}T090000`,
        dtend: `${nextDateStr.replace(/-/g, '')}T093000`,
        summary: `🔔 [예정] ${activeMed.shortName} 투약 알림일`,
        description: `권장 주기(${intervalDays}일)에 맞춘 투약 예정일입니다.`,
        alarmMinutes: 60, // 1시간 전 알림
        category: 'MEDICATION'
      }));
    }
  }

  // 2. 일반 개인 / 업무 일정
  if (syncEvents) {
    const events = store.getEvents();
    events.forEach(ev => {
      if (ev.date) {
        const uid = `event-${ev.id}-${dtstamp}@lifepulse.app`;
        const timeStr = ev.time ? ev.time.replace(':', '') + '00' : '090000';
        const start = `${ev.date.replace(/-/g, '')}T${timeStr}`;
        const endHour = ev.time ? String(parseInt(ev.time.split(':')[0], 10) + 1).padStart(2, '0') + ev.time.split(':')[1] + '00' : '100000';
        const end = `${ev.date.replace(/-/g, '')}T${endHour}`;
        
        eventsIcs.push(formatVEvent({
          uid,
          dtstamp,
          dtstart: start,
          dtend: end,
          summary: `📅 ${ev.title || '일정'}`,
          description: ev.memo || '',
          location: ev.location || '',
          alarmMinutes: 30,
          category: 'EVENT'
        }));
      }
    });
  }

  // 3. 운동 세션 및 완료 기록
  if (syncWorkouts) {
    const workouts = store.getWorkouts();
    workouts.forEach(w => {
      if (w.date) {
        const uid = `workout-${w.id}-${dtstamp}@lifepulse.app`;
        const start = `${w.date.replace(/-/g, '')}T190000`;
        const dur = parseInt(w.duration, 10) || 30;
        const end = `${w.date.replace(/-/g, '')}T19${String(Math.min(59, dur)).padStart(2, '0')}00`;
        const summary = `🏃 [운동] ${w.name || w.type} ${w.duration}분 (-${w.burnedKcal}kcal)`;
        const desc = `소모 칼로리: ${w.burnedKcal} kcal\\n심박수: ${w.heartRate ? w.heartRate + ' bpm' : '-'}\\n거리: ${w.distance ? w.distance + ' km' : '-'}\\n메모: ${w.memo || ''}`;

        eventsIcs.push(formatVEvent({
          uid,
          dtstamp,
          dtstart: start,
          dtend: end,
          summary,
          description: desc,
          category: 'WORKOUT'
        }));
      }
    });
  }

  // 4. 식사 요약 (선택 사항)
  if (syncMeals) {
    const meals = store.getMeals();
    meals.forEach(m => {
      if (m.date) {
        const uid = `meal-${m.id}-${dtstamp}@lifepulse.app`;
        const timeMap = { breakfast: '083000', lunch: '123000', dinner: '190000', snack: '160000' };
        const timeStr = timeMap[m.mealType] || '120000';
        const start = `${m.date.replace(/-/g, '')}T${timeStr}`;

        eventsIcs.push(formatVEvent({
          uid,
          dtstamp,
          dtstart: start,
          dtend: start,
          summary: `🍽️ [식사] ${m.mealType}: ${m.foods} (+${m.kcal}kcal)`,
          description: `칼로리: ${m.kcal} kcal\\n메뉴: ${m.foods}\\n메모: ${m.memo || ''}`,
          category: 'MEAL'
        }));
      }
    });
  }

  // 5. 가계부 요약 (선택 사항)
  if (syncLedger) {
    const txs = store.getTransactions();
    txs.forEach(t => {
      if (t.date) {
        const uid = `tx-${t.id}-${dtstamp}@lifepulse.app`;
        const sign = t.type === 'income' ? '+' : '-';
        const start = `${t.date.replace(/-/g, '')}T210000`;

        eventsIcs.push(formatVEvent({
          uid,
          dtstamp,
          dtstart: start,
          dtend: start,
          summary: `💰 [가계부] ${t.category} ${sign}${Number(t.amount).toLocaleString()}원`,
          description: `결제수단: ${t.paymentMethod || '-'}\\n메모: ${t.memo || ''}`,
          category: 'LEDGER'
        }));
      }
    });
  }

  const icsHeader = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LifePulse//Healthcare and Ledger Calendar//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LifePulse 헬스케어 캘린더',
    'X-WR-TIMEZONE:Asia/Seoul'
  ].join('\r\n');

  const icsFooter = '\r\nEND:VCALENDAR';
  return icsHeader + '\r\n' + eventsIcs.join('\r\n') + icsFooter;
}

function formatVEvent(ev) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${ev.dtstamp}`,
    `DTSTART;TZID=Asia/Seoul:${ev.dtstart}`,
    `DTEND;TZID=Asia/Seoul:${ev.dtend}`,
    `SUMMARY:${escapeIcs(ev.summary)}`
  ];

  if (ev.description) lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeIcs(ev.location)}`);
  if (ev.category) lines.push(`CATEGORIES:${ev.category}`);

  // 알림(Alarm) 추가
  if (ev.alarmMinutes) {
    lines.push(
      'BEGIN:VALARM',
      `TRIGGER:-PT${ev.alarmMinutes}M`,
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcs(ev.summary)}`,
      'END:VALARM'
    );
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

function escapeIcs(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatDateToIcsUtc(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * 브라우저에서 .ics 파일 즉시 다운로드 (애플 캘린더 / 구글 캘린더 등록용)
 */
export function downloadIcsFile(filename = 'lifepulse_calendar.ics', icsContent = '') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * 외부에서 가져온 .ics 파일을 파싱하여 LifePulse 일정(events)으로 등록
 */
export function parseAndImportIcs(icsText) {
  if (!icsText || typeof icsText !== 'string') return { count: 0, imported: [] };

  const eventBlocks = icsText.split('BEGIN:VEVENT').slice(1);
  const importedEvents = [];

  eventBlocks.forEach(block => {
    const summaryMatch = block.match(/SUMMARY(?:;[^:]+)?:(.*)/i);
    const startMatch = block.match(/DTSTART(?:;[^:]+)?:([0-9]{8})(?:T([0-9]{4,6}))?/i);
    const descMatch = block.match(/DESCRIPTION(?:;[^:]+)?:(.*)/i);
    const locMatch = block.match(/LOCATION(?:;[^:]+)?:(.*)/i);

    if (summaryMatch && startMatch) {
      let title = summaryMatch[1].trim().replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ');
      const rawDate = startMatch[1]; // YYYYMMDD
      const dateStr = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
      
      let timeStr = '09:00';
      if (startMatch[2]) {
        const rawTime = startMatch[2];
        timeStr = `${rawTime.substring(0, 2)}:${rawTime.substring(2, 4)}`;
      }

      const memo = descMatch ? descMatch[1].trim().replace(/\\n/g, '\n').replace(/\\,/g, ',') : '';
      const loc = locMatch ? locMatch[1].trim().replace(/\\,/g, ',') : '';

      const newEvent = {
        id: 'ext_ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title,
        date: dateStr,
        time: timeStr,
        category: 'work',
        memo: loc ? `[장소: ${loc}] ${memo}` : memo
      };

      store.saveEvent(newEvent);
      importedEvents.push(newEvent);
    }
  });

  return { count: importedEvents.length, imported: importedEvents };
}
