/**
 * GLP-1 비만/당뇨 치료제 (위고비 & 마운자로 등) 투약 및 건강 관리 로직
 */
import { store } from './storage.js?v=3.0.0';

export const MEDICATIONS = {
  none: {
    id: 'none',
    name: '투약 안함 (일반 다이어트 / 건강 관리)',
    shortName: '건강·체중',
    molecule: '일반 건강 및 식단/체중 관리',
    doses: [],
    defaultDose: '',
    defaultInterval: 0,
    color: '#10b981',
    badgeText: 'Health',
    isMedication: false
  },
  wegovy: {
    id: 'wegovy',
    name: '위고비 (Wegovy)',
    shortName: '위고비',
    molecule: '세마글루타이드 (Semaglutide)',
    doses: [
      { value: '0.25mg', label: '0.25mg (1단계 - 시작)' },
      { value: '0.5mg', label: '0.5mg (2단계 - 증량)' },
      { value: '1.0mg', label: '1.0mg (3단계 - 증량)' },
      { value: '1.7mg', label: '1.7mg (4단계 - 고용량)' },
      { value: '2.4mg', label: '2.4mg (5단계 - 유지)' }
    ],
    defaultDose: '0.25mg',
    defaultInterval: 7,
    color: '#10b981',
    badgeText: 'Wegovy',
    isMedication: true
  },
  mounjaro: {
    id: 'mounjaro',
    name: '마운자로 (Mounjaro)',
    shortName: '마운자로',
    molecule: '티르제파타이드 (Tirzepatide - GIP/GLP-1)',
    doses: [
      { value: '2.5mg', label: '2.5mg (1단계 - 시작)' },
      { value: '5.0mg', label: '5.0mg (2단계 - 증량)' },
      { value: '7.5mg', label: '7.5mg (3단계 - 증량)' },
      { value: '10.0mg', label: '10.0mg (4단계 - 고용량)' },
      { value: '12.5mg', label: '12.5mg (5단계 - 고용량)' },
      { value: '15.0mg', label: '15.0mg (6단계 - 최고용량)' }
    ],
    defaultDose: '2.5mg',
    defaultInterval: 7,
    color: '#06b6d4',
    badgeText: 'Mounjaro',
    isMedication: true
  },
  saxenda: {
    id: 'saxenda',
    name: '삭센다 (Saxenda)',
    shortName: '삭센다',
    molecule: '리라글루타이드 (Liraglutide)',
    doses: [
      { value: '0.6mg', label: '0.6mg (1주차)' },
      { value: '1.2mg', label: '1.2mg (2주차)' },
      { value: '1.8mg', label: '1.8mg (3주차)' },
      { value: '2.4mg', label: '2.4mg (4주차)' },
      { value: '3.0mg', label: '3.0mg (유지)' }
    ],
    defaultDose: '0.6mg',
    defaultInterval: 1,
    color: '#8b5cf6',
    badgeText: 'Saxenda',
    isMedication: true
  }
};

export const INJECTION_SITES = [
  { id: 'abdomen-right', label: '복부 (우측)', group: '복부', pos: { x: 58, y: 46 } },
  { id: 'abdomen-left', label: '복부 (좌측)', group: '복부', pos: { x: 42, y: 46 } },
  { id: 'thigh-right', label: '허벅지 (우측)', group: '허벅지', pos: { x: 62, y: 72 } },
  { id: 'thigh-left', label: '허벅지 (좌측)', group: '허벅지', pos: { x: 38, y: 72 } },
  { id: 'arm-right', label: '팔뚝 (우측)', group: '팔뚝', pos: { x: 78, y: 36 } },
  { id: 'arm-left', label: '팔뚝 (좌측)', group: '팔뚝', pos: { x: 22, y: 36 } },
];

export const COMMON_SIDE_EFFECTS = [
  '메스꺼움(약함)', '메스꺼움(보통)', '소화불량/더부룩함',
  '조기 포만감', '식욕감소', '두통', '피로감',
  '속쓰림', '변비', '설사', '어지러움', '트림'
];

/**
 * 현재 활성화된 의약품 정보 조회
 */
export function getActiveMedication() {
  const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
  const medKey = settings.medicationType || 'wegovy';
  return MEDICATIONS[medKey] || MEDICATIONS.wegovy;
}

/**
 * 투약 분석 및 다음 투약 D-Day, 체중 감량 상태 계산
 */
export function getWegovyStatus() {
  const logs = (store.getWegovyLogs && typeof store.getWegovyLogs === 'function') ? store.getWegovyLogs() : [];
  const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
  const activeMed = getActiveMedication();
  const intervalDays = settings.wegovyIntervalDays || activeMed.defaultInterval || 7;

  const isMedicationEnabled = activeMed.isMedication !== false;

  if (logs.length === 0) {
    return {
      hasLogs: false,
      activeMed,
      isMedicationEnabled,
      lastLog: null,
      dDayText: isMedicationEnabled ? '투약 기록 없음' : null,
      dDayClass: 'normal',
      dDayCount: 0,
      nextDate: null,
      cycleCount: 0,
      currentDose: activeMed.defaultDose,
      nextRecommendedSite: INJECTION_SITES[0],
      weightStats: null,
      allLogs: []
    };
  }

  const sortedLogs = [...logs].filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
  const lastLog = sortedLogs[sortedLogs.length - 1];

  let dDayText = null;
  let dDayClass = 'normal';
  let nextDateStr = null;

  if (isMedicationEnabled && lastLog && lastLog.date) {
    const lastDate = new Date(lastLog.date);
    lastDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + intervalDays);

    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      dDayText = '오늘 투약일! (D-Day)';
      dDayClass = 'today';
    } else if (diffDays > 0) {
      dDayText = `다음 투약까지 D-${diffDays}`;
      dDayClass = 'future';
    } else {
      dDayText = `투약 예정일 ${Math.abs(diffDays)}일 지남`;
      dDayClass = 'overdue';
    }
    nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
  }

  // 부위 순환 추천
  const lastSiteId = lastLog ? lastLog.site : null;
  const siteIndex = INJECTION_SITES.findIndex(s => s.id === lastSiteId);
  const nextSiteIndex = (siteIndex + 1) % INJECTION_SITES.length;
  const nextRecommendedSite = INJECTION_SITES[nextSiteIndex] || INJECTION_SITES[0];

  // 체중 감량 통계
  const weights = sortedLogs.filter(l => l && l.weight).map(l => Number(l.weight));
  let weightStats = null;
  if (weights.length > 0) {
    const startW = settings.startWeight || weights[0];
    const currentW = weights[weights.length - 1];
    const targetW = settings.targetWeight || 68.0;
    const totalLost = +(startW - currentW).toFixed(1);
    const remainToGoal = +(currentW - targetW).toFixed(1);
    const totalGap = startW - targetW;
    const percentLost = totalGap > 0 ? +((totalLost / totalGap) * 100).toFixed(1) : 100;

    weightStats = {
      startW,
      currentW,
      targetW,
      totalLost,
      remainToGoal: Math.max(0, remainToGoal),
      percentLost: Math.min(100, Math.max(0, percentLost))
    };
  }

  return {
    hasLogs: true,
    activeMed,
    isMedicationEnabled,
    lastLog,
    dDayText,
    dDayClass,
    nextDate: nextDateStr,
    cycleCount: sortedLogs.length,
    currentDose: (lastLog && lastLog.dose) || activeMed.defaultDose,
    nextRecommendedSite,
    weightStats,
    allLogs: sortedLogs
  };
}
