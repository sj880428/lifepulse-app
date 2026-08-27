/**
 * 대한민국 법정 공휴일 및 대체공휴일 데이터 및 계산 유틸리티
 */

// 연도별 음력 공휴일 양력 날짜 매핑 (2024 ~ 2030)
const LUNAR_HOLIDAYS = {
  2024: {
    seollalEve: '2024-02-09',
    seollal: '2024-02-10',
    seollalNext: '2024-02-11',
    buddha: '2024-05-15',
    chuseokEve: '2024-09-16',
    chuseok: '2024-09-17',
    chuseokNext: '2024-09-18',
  },
  2025: {
    seollalEve: '2025-01-28',
    seollal: '2025-01-29',
    seollalNext: '2025-01-30',
    buddha: '2025-05-05',
    chuseokEve: '2025-10-05',
    chuseok: '2025-10-06',
    chuseokNext: '2025-10-07',
  },
  2026: {
    seollalEve: '2026-02-16',
    seollal: '2026-02-17',
    seollalNext: '2026-02-18',
    buddha: '2026-05-24',
    chuseokEve: '2026-09-24',
    chuseok: '2026-09-25',
    chuseokNext: '2026-09-26',
  },
  2027: {
    seollalEve: '2027-02-06',
    seollal: '2027-02-07',
    seollalNext: '2027-02-08',
    buddha: '2027-05-13',
    chuseokEve: '2027-09-14',
    chuseok: '2027-09-15',
    chuseokNext: '2027-09-16',
  },
  2028: {
    seollalEve: '2028-01-26',
    seollal: '2028-01-27',
    seollalNext: '2028-01-28',
    buddha: '2028-05-02',
    chuseokEve: '2028-10-02',
    chuseok: '2028-10-03',
    chuseokNext: '2028-10-04',
  },
  2029: {
    seollalEve: '2029-02-12',
    seollal: '2029-02-13',
    seollalNext: '2029-02-14',
    buddha: '2029-05-20',
    chuseokEve: '2029-09-21',
    chuseok: '2029-09-22',
    chuseokNext: '2029-09-23',
  },
  2030: {
    seollalEve: '2030-02-02',
    seollal: '2030-02-03',
    seollalNext: '2030-02-04',
    buddha: '2030-05-09',
    chuseokEve: '2030-09-11',
    chuseok: '2030-09-12',
    chuseokNext: '2030-09-13',
  }
};

/**
 * 특정 연도의 모든 공휴일 및 대체공휴일 맵을 생성합니다.
 * @param {number} year 
 * @returns {Record<string, { name: string, isSubstitute: boolean }>} key: 'YYYY-MM-DD'
 */
export function getKoreanHolidays(year) {
  const holidays = {};

  const addHoliday = (dateStr, name, isSubstitute = false) => {
    if (!dateStr) return;
    holidays[dateStr] = { name, isSubstitute };
  };

  const pad = (n) => String(n).padStart(2, '0');
  const makeDateStr = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  
  const getDayOfWeek = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).getDay(); // 0: 일, 6: 토
  };

  const getNextWorkday = (startDateStr, existingHolidayDates) => {
    let [y, m, d] = startDateStr.split('-').map(Number);
    let curr = new Date(y, m - 1, d);
    while (true) {
      curr.setDate(curr.getDate() + 1);
      const currStr = `${curr.getFullYear()}-${pad(curr.getMonth() + 1)}-${pad(curr.getDate())}`;
      const day = curr.getDay();
      if (day !== 0 && day !== 6 && !existingHolidayDates.has(currStr)) {
        return currStr;
      }
    }
  };

  // 1. 고정 양력 공휴일
  addHoliday(makeDateStr(year, 1, 1), '신정');
  addHoliday(makeDateStr(year, 3, 1), '3·1절');
  addHoliday(makeDateStr(year, 5, 5), '어린이날');
  addHoliday(makeDateStr(year, 6, 6), '현충일');
  addHoliday(makeDateStr(year, 8, 15), '광복절');
  addHoliday(makeDateStr(year, 10, 3), '개천절');
  addHoliday(makeDateStr(year, 10, 9), '한글날');
  addHoliday(makeDateStr(year, 12, 25), '성탄절');

  // 2. 음력 공휴일
  const lunar = LUNAR_HOLIDAYS[year];
  if (lunar) {
    addHoliday(lunar.seollalEve, '설날 연휴');
    addHoliday(lunar.seollal, '설날');
    addHoliday(lunar.seollalNext, '설날 연휴');
    addHoliday(lunar.buddha, '부처님 오신 날');
    addHoliday(lunar.chuseokEve, '추석 연휴');
    addHoliday(lunar.chuseok, '추석');
    addHoliday(lunar.chuseokNext, '추석 연휴');
  }

  // 3. 대체공휴일 산출 규칙 (대한민국 관공서의 공휴일에 관한 규정)
  // 대체공휴일 적용 대상: 3·1절, 광복절, 개천절, 한글날, 어린이날, 부처님오신날, 성탄절, 설날연휴, 추석연휴
  const substituteCandidates = [
    { key: makeDateStr(year, 3, 1), name: '3·1절' },
    { key: makeDateStr(year, 5, 5), name: '어린이날' },
    { key: makeDateStr(year, 8, 15), name: '광복절' },
    { key: makeDateStr(year, 10, 3), name: '개천절' },
    { key: makeDateStr(year, 10, 9), name: '한글날' },
    { key: makeDateStr(year, 12, 25), name: '성탄절' },
  ];

  if (lunar?.buddha) {
    substituteCandidates.push({ key: lunar.buddha, name: '부처님 오신 날' });
  }

  // 단일 공휴일 대체휴일 체크 (토요일 또는 일요일인 경우)
  const holidayDateSet = new Set(Object.keys(holidays));
  for (const item of substituteCandidates) {
    const day = getDayOfWeek(item.key);
    if (day === 0 || day === 6) { // 토 또는 일
      const subDate = getNextWorkday(item.key, holidayDateSet);
      holidayDateSet.add(subDate);
      addHoliday(subDate, `대체공휴일(${item.name})`, true);
    }
  }

  // 설날 연휴 대체공휴일 체크 (연휴 3일 중 일요일 또는 다른 공휴일과 겹치는 경우)
  if (lunar) {
    const seollalDays = [lunar.seollalEve, lunar.seollal, lunar.seollalNext];
    const hasSundayOrConflict = seollalDays.some(d => getDayOfWeek(d) === 0);
    if (hasSundayOrConflict) {
      const lastDay = seollalDays[seollalDays.length - 1];
      const subDate = getNextWorkday(lastDay, holidayDateSet);
      holidayDateSet.add(subDate);
      addHoliday(subDate, '대체공휴일(설날)', true);
    }

    // 추석 연휴 대체공휴일 체크
    const chuseokDays = [lunar.chuseokEve, lunar.chuseok, lunar.chuseokNext];
    const chuseokConflict = chuseokDays.some(d => {
      const day = getDayOfWeek(d);
      // 일요일이거나, 개천절(10/3) 등 다른 법정공휴일과 겹치는 경우
      return day === 0 || (d === makeDateStr(year, 10, 3));
    });
    if (chuseokConflict) {
      const lastDay = chuseokDays[chuseokDays.length - 1];
      const subDate = getNextWorkday(lastDay, holidayDateSet);
      holidayDateSet.add(subDate);
      addHoliday(subDate, '대체공휴일(추석)', true);
    }
  }

  // 어린이날과 부처님오신날이 같은 날(예: 2025-05-05)인 경우 특수 처리
  if (lunar?.buddha === makeDateStr(year, 5, 5)) {
    const subDate = getNextWorkday(makeDateStr(year, 5, 5), holidayDateSet);
    holidayDateSet.add(subDate);
    addHoliday(subDate, '대체공휴일(부처님오신날)', true);
  }

  return holidays;
}

/**
 * 특정 날짜가 공휴일인지 확인합니다.
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {{ isHoliday: boolean, name: string, isSubstitute: boolean }}
 */
export function checkHoliday(dateStr) {
  if (!dateStr) return { isHoliday: false, name: '', isSubstitute: false };
  const year = parseInt(dateStr.substring(0, 4), 10);
  const holidays = getKoreanHolidays(year);
  if (holidays[dateStr]) {
    return {
      isHoliday: true,
      name: holidays[dateStr].name,
      isSubstitute: holidays[dateStr].isSubstitute
    };
  }
  return { isHoliday: false, name: '', isSubstitute: false };
}
