/**
 * 가계부 분석 및 지출/수입 통계 엔진
 */
import { store } from './storage.js?v=3.0.0';

export const EXPENSE_CATEGORIES = [
  { id: '의료/위고비', name: '의료 / 위고비', icon: '💉', color: '#10b981' },
  { id: '식비', name: '식비 / 장보기', icon: '🛒', color: '#f59e0b' },
  { id: '건강/영양제', name: '건강 / 영양제 / 샐러드', icon: '🥗', color: '#14b8a6' },
  { id: '운동/피트니스', name: '운동 / PT / 헬스', icon: '🏃', color: '#6366f1' },
  { id: '카페/디저트', name: '카페 / 간식', icon: '☕', color: '#ec4899' },
  { id: '교통/차량', name: '교통 / 주유', icon: '🚗', color: '#06b6d4' },
  { id: '쇼핑/생활', name: '쇼핑 / 생활용품', icon: '🛍️', color: '#8b5cf6' },
  { id: '주거/통신', name: '주거 / 공과금 / 통신', icon: '🏠', color: '#64748b' },
  { id: '기타지출', name: '기타 지출', icon: '🏷️', color: '#94a3b8' }
];

export const INCOME_CATEGORIES = [
  { id: '급여', name: '월급 / 급여', icon: '💰', color: '#10b981' },
  { id: '부수입', name: '부수입 / 상여금', icon: '✨', color: '#3b82f6' },
  { id: '용돈/환급', name: '용돈 / 세금환급', icon: '🎁', color: '#8b5cf6' },
  { id: '기타수입', name: '기타 수입', icon: '💵', color: '#14b8a6' }
];

/**
 * 특정 연월의 가계부 요약 데이터 계산
 * @param {number} year 
 * @param {number} month 
 */
export function getMonthlyLedgerSummary(year, month) {
  const txs = (store.getTransactions && typeof store.getTransactions === 'function') ? store.getTransactions() : [];
  const pad = (n) => String(n).padStart(2, '0');
  const prefix = `${year}-${pad(month)}`;

  const monthTxs = txs.filter(t => t && t.date && t.date.startsWith(prefix));

  let totalExpense = 0;
  let totalIncome = 0;
  let wegovyMedicalTotal = 0;

  const categoryMap = {};

  const weeklyTotals = [
    { weekNum: 1, label: '1주차', expense: 0, income: 0 },
    { weekNum: 2, label: '2주차', expense: 0, income: 0 },
    { weekNum: 3, label: '3주차', expense: 0, income: 0 },
    { weekNum: 4, label: '4주차', expense: 0, income: 0 },
    { weekNum: 5, label: '5주차', expense: 0, income: 0 }
  ];

  monthTxs.forEach(t => {
    const amt = Number(t.amount) || 0;
    const day = parseInt(t.date.split('-')[2], 10);
    const weekIdx = Math.min(4, Math.floor((day - 1) / 7));

    if (t.type === 'income') {
      totalIncome += amt;
      weeklyTotals[weekIdx].income += amt;
    } else {
      totalExpense += amt;
      weeklyTotals[weekIdx].expense += amt;
      categoryMap[t.category] = (categoryMap[t.category] || 0) + amt;
      if (t.category === '의료/위고비') {
        wegovyMedicalTotal += amt;
      }
    }
  });

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([catName, amt]) => {
      const meta = EXPENSE_CATEGORIES.find(c => c.id === catName) || { icon: '🏷️', color: '#94a3b8' };
      return {
        category: catName,
        total: amt,
        icon: meta.icon,
        color: meta.color,
        percent: totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    year,
    month,
    totalExpense,
    totalIncome,
    netBalance: totalIncome - totalExpense,
    wegovyMedicalTotal,
    categoryBreakdown,
    weeklyTotals: weeklyTotals.filter(w => w.expense > 0 || w.income > 0 || weeklyTotals.indexOf(w) < 4),
    transactionCount: monthTxs.length,
    transactions: monthTxs
  };
}

/**
 * 특정 기준일이 포함된 '주간(Weekly)' 가계부 요약 분석
 * @param {Date} targetDate 
 */
export function getWeeklyLedgerSummary(targetDate = new Date()) {
  const txs = (store.getTransactions && typeof store.getTransactions === 'function') ? store.getTransactions() : [];
  const pad = (n) => String(n).padStart(2, '0');

  const curr = (targetDate instanceof Date && !isNaN(targetDate)) ? new Date(targetDate) : new Date();
  const dayOfWeek = curr.getDay(); // 0: 일요일
  const sunday = new Date(curr);
  sunday.setDate(curr.getDate() - dayOfWeek);

  const weekDays = [];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    weekDays.push({
      dateStr,
      dayName: dayNames[i],
      dayNum: d.getDate(),
      expense: 0,
      income: 0,
      transactions: []
    });
  }

  const startDateStr = weekDays[0].dateStr;
  const endDateStr = weekDays[6].dateStr;

  let totalExpense = 0;
  let totalIncome = 0;
  let wegovyMedicalTotal = 0;
  const categoryMap = {};
  const weekTxs = [];

  txs.forEach(t => {
    if (t && t.date && t.date >= startDateStr && t.date <= endDateStr) {
      const amt = Number(t.amount) || 0;
      weekTxs.push(t);

      const dayObj = weekDays.find(d => d.dateStr === t.date);
      if (dayObj) {
        dayObj.transactions.push(t);
        if (t.type === 'income') {
          dayObj.income += amt;
        } else {
          dayObj.expense += amt;
        }
      }

      if (t.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        categoryMap[t.category] = (categoryMap[t.category] || 0) + amt;
        if (t.category === '의료/위고비') {
          wegovyMedicalTotal += amt;
        }
      }
    }
  });

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([catName, amt]) => {
      const meta = EXPENSE_CATEGORIES.find(c => c.id === catName) || { icon: '🏷️', color: '#94a3b8' };
      return {
        category: catName,
        total: amt,
        icon: meta.icon,
        color: meta.color,
        percent: totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    startDateStr,
    endDateStr,
    periodLabel: `${startDateStr.substring(5)} ~ ${endDateStr.substring(5)}`,
    totalExpense,
    totalIncome,
    netBalance: totalIncome - totalExpense,
    wegovyMedicalTotal,
    categoryBreakdown,
    weekDays,
    transactions: weekTxs
  };
}

/**
 * 일자별 가계부 금액 맵 반환 (캘린더 셀 렌더링용)
 * @param {number} year 
 * @param {number} month 
 * @returns {Record<string, { income: number, expense: number }>}
 */
export function getDailyLedgerMap(year, month) {
  const txs = (store.getTransactions && typeof store.getTransactions === 'function') ? store.getTransactions() : [];
  const pad = (n) => String(n).padStart(2, '0');
  const prefix = `${year}-${pad(month)}`;
  const dailyMap = {};

  txs.forEach(t => {
    if (t && t.date && t.date.startsWith(prefix)) {
      if (!dailyMap[t.date]) {
        dailyMap[t.date] = { income: 0, expense: 0 };
      }
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        dailyMap[t.date].income += amt;
      } else {
        dailyMap[t.date].expense += amt;
      }
    }
  });

  return dailyMap;
}
