/**
 * 운동 & 활동 소모 칼로리 관리 및 스마트워치 (갤럭시 워치 & 애플워치) 연동 모듈
 */
import { store } from './storage.js?v=3.0.0';

export const WORKOUT_TYPES = [
  { id: 'running', name: '러닝 / 조깅', icon: '🏃', kcalPerMin: 10.0, color: '#ef4444', hasDistance: true },
  { id: 'walking', name: '걷기 / 산책', icon: '🚶', kcalPerMin: 4.2, color: '#10b981', hasDistance: true },
  { id: 'gym', name: '헬스 / 웨이트', icon: '🏋️', kcalPerMin: 6.5, color: '#6366f1', hasDistance: false },
  { id: 'cycling', name: '사이클 / 자전거', icon: '🚴', kcalPerMin: 8.0, color: '#06b6d4', hasDistance: true },
  { id: 'swimming', name: '수영', icon: '🏊', kcalPerMin: 9.0, color: '#3b82f6', hasDistance: true },
  { id: 'pilates', name: '필라테스 / 요가', icon: '🧘', kcalPerMin: 3.8, color: '#ec4899', hasDistance: false },
  { id: 'hiking', name: '등산 / 계단', icon: '🧗', kcalPerMin: 8.5, color: '#f59e0b', hasDistance: true },
  { id: 'hiit', name: '홈트 / HIIT', icon: '🏠', kcalPerMin: 7.5, color: '#8b5cf6', hasDistance: false },
  { id: 'apple_watch', name: '애플워치 (Apple)', icon: '⌚', kcalPerMin: 0, color: '#fa5252', hasDistance: true },
  { id: 'galaxy_watch', name: '갤럭시 워치 (삼성)', icon: '⌚', kcalPerMin: 0, color: '#2563eb', hasDistance: true }
];

export const INTENSITY_LEVELS = [
  { value: 0.8, label: '가볍게 (저강도)', emoji: '🟢' },
  { value: 1.0, label: '보통 (중강도)', emoji: '🟡' },
  { value: 1.25, label: '강하게 (고강도)', emoji: '🔴' }
];

/**
 * 운동 시간 및 강도 기반 예상 소모 칼로리 자동 계산
 */
export function estimateWorkoutCalories(typeId, durationMinutes, intensityMultiplier = 1.0) {
  const type = WORKOUT_TYPES.find(t => t.id === typeId) || WORKOUT_TYPES[0];
  if (type.kcalPerMin === 0) return 0;
  const baseKcal = (durationMinutes || 0) * type.kcalPerMin;
  return Math.round(baseKcal * intensityMultiplier);
}

/**
 * 일자별 운동 요약 및 소모 칼로리 집계
 */
export function getDailyWorkoutsSummary(dateStr) {
  const allWorkouts = (store.getWorkouts && typeof store.getWorkouts === 'function') ? store.getWorkouts() : [];
  const dayWorkouts = allWorkouts.filter(w => w && w.date === dateStr);

  let totalBurnedKcal = 0;
  let totalDurationMin = 0;
  let totalDistanceKm = 0;

  dayWorkouts.forEach(w => {
    totalBurnedKcal += (Number(w.burnedKcal) || 0);
    totalDurationMin += (Number(w.duration) || 0);
    if (w.distance) totalDistanceKm += Number(w.distance);
  });

  return {
    dateStr,
    dayWorkouts,
    totalBurnedKcal,
    totalDurationMin,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    count: dayWorkouts.length
  };
}

/**
 * 월간 운동 일자별 맵 생성 (캘린더 렌더링용)
 */
export function getMonthlyWorkoutMap(year, month) {
  const allWorkouts = (store.getWorkouts && typeof store.getWorkouts === 'function') ? store.getWorkouts() : [];
  const pad = (n) => String(n).padStart(2, '0');
  const prefix = `${year}-${pad(month)}`;
  const workoutMap = {};

  allWorkouts.forEach(w => {
    if (w && w.date && w.date.startsWith(prefix)) {
      if (!workoutMap[w.date]) {
        workoutMap[w.date] = { totalBurnedKcal: 0, totalDurationMin: 0, count: 0, workouts: [] };
      }
      workoutMap[w.date].totalBurnedKcal += (Number(w.burnedKcal) || 0);
      workoutMap[w.date].totalDurationMin += (Number(w.duration) || 0);
      workoutMap[w.date].count += 1;
      workoutMap[w.date].workouts.push(w);
    }
  });

  return workoutMap;
}
