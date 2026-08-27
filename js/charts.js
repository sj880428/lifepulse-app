/**
 * SVG 기반 인터랙티브 차트 렌더링 엔진 (주간/월간 필터링 지원)
 */

/**
 * 체중 감량 추이 라인 차트 생성 (주간 / 월간 / 전체 지원)
 * @param {Array<{ date: string, weight: number, dose?: string }>} logs 
 * @param {number} targetWeight 
 * @param {number} startWeight 
 * @param {'week' | 'month' | 'all'} periodMode 
 * @param {Date} refDate 
 * @returns {string} SVG HTML string
 */
export function renderWeightChart(logs = [], targetWeight = 70, startWeight = 84.5, periodMode = 'month', refDate = new Date()) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return `<div class="chart-empty">기록된 체중 데이터가 없습니다. 체중을 기록해보세요!</div>`;
  }

  const pad = (n) => String(n).padStart(2, '0');
  const validRefDate = (refDate instanceof Date && !isNaN(refDate)) ? refDate : new Date();
  let filtered = logs.filter(l => l && l.weight && !isNaN(Number(l.weight))).sort((a, b) => new Date(a.date) - new Date(b.date));

  // 주간 / 월간 필터링
  if (periodMode === 'week') {
    const curr = new Date(validRefDate);
    const dayOfWeek = curr.getDay();
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    const startStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
    const endStr = `${saturday.getFullYear()}-${pad(saturday.getMonth() + 1)}-${pad(saturday.getDate())}`;
    filtered = filtered.filter(l => l.date >= startStr && l.date <= endStr);
  } else if (periodMode === 'month') {
    const year = validRefDate.getFullYear();
    const month = validRefDate.getMonth() + 1;
    const prefix = `${year}-${pad(month)}`;
    filtered = filtered.filter(l => l.date && l.date.startsWith(prefix));
  }

  if (filtered.length === 0) {
    const periodLabel = periodMode === 'week' ? '이번 주' : '이번 달';
    return `<div class="chart-empty">${periodLabel}에 기록된 체중 데이터가 없습니다.</div>`;
  }

  const width = 460;
  const height = 180;
  const padding = { top: 28, right: 35, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const weights = filtered.map(d => Number(d.weight));
  if (targetWeight) weights.push(Number(targetWeight));
  if (startWeight && periodMode === 'all') weights.push(Number(startWeight));

  const minW = Math.floor(Math.min(...weights) - 0.5);
  const maxW = Math.ceil(Math.max(...weights) + 0.5);

  const getX = (idx) => {
    if (filtered.length <= 1) return padding.left + chartW / 2;
    return padding.left + (idx / (filtered.length - 1)) * chartW;
  };

  const getY = (val) => {
    if (maxW === minW) return padding.top + chartH / 2;
    return padding.top + chartH - ((val - minW) / (maxW - minW)) * chartH;
  };

  // 배경 그리드 라인 & Y축 레이블
  const gridSteps = 3;
  let gridLines = '';
  for (let i = 0; i <= gridSteps; i++) {
    const val = minW + ((maxW - minW) / gridSteps) * i;
    const y = getY(val);
    gridLines += `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border-subtle)" stroke-dasharray="3,3" stroke-width="1"/>
      <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="var(--text-muted)" font-size="10" font-family="inherit">${val.toFixed(1)}kg</text>
    `;
  }

  // 목표 체중선
  let targetLine = '';
  if (targetWeight && targetWeight >= minW && targetWeight <= maxW) {
    const ty = getY(targetWeight);
    targetLine = `
      <line x1="${padding.left}" y1="${ty}" x2="${width - padding.right}" y2="${ty}" stroke="var(--accent-emerald)" stroke-dasharray="4,4" stroke-width="1.5" opacity="0.8"/>
      <text x="${width - padding.right + 4}" y="${ty + 3}" fill="var(--accent-emerald)" font-size="10" font-weight="700">목표</text>
    `;
  }

  // 데이터 포인트 좌표
  const points = filtered.map((d, i) => ({
    x: getX(i),
    y: getY(d.weight),
    weight: d.weight,
    date: (d.date || '').substring(5), // MM-DD
    dose: d.dose || ''
  }));

  // 곡선 경로 (SVG Path)
  let pathD = '';
  if (points.length === 1) {
    pathD = `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`;
  } else if (points.length > 1) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      pathD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
  }

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : '';

  // 원형 포인트 및 날짜 X축 텍스트
  let pointsHtml = '';
  points.forEach((p) => {
    pointsHtml += `
      <g class="chart-point-group" tabindex="0">
        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--accent-emerald)" stroke="var(--bg-card)" stroke-width="2" class="chart-dot"/>
        <text x="${p.x}" y="${p.y - 9}" text-anchor="middle" fill="var(--text-main)" font-size="11" font-weight="800">${p.weight}kg</text>
        <text x="${p.x}" y="${height - padding.bottom + 16}" text-anchor="middle" fill="var(--text-muted)" font-size="10">${p.date}</text>
      </g>
    `;
  });

  return `
    <svg class="weight-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="weightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="var(--accent-emerald)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--accent-emerald)" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      ${targetLine}
      ${areaD ? `<path d="${areaD}" fill="url(#weightGrad)"/>` : ''}
      <path d="${pathD}" fill="none" stroke="var(--accent-emerald)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${pointsHtml}
    </svg>
  `;
}

/**
 * 주간 일자별 지출 바 차트 생성
 * @param {Array<{ dayName: string, dayNum: number, expense: number, income: number }>} weekDays 
 * @param {number} totalExpense 
 */
export function renderWeeklyExpenseBarChart(weekDays = [], totalExpense = 0) {
  if (!weekDays || !Array.isArray(weekDays) || weekDays.length === 0) {
    return `<div class="chart-empty">주간 지출 데이터가 없습니다.</div>`;
  }

  const maxDayExp = Math.max(...weekDays.map(d => Number(d.expense) || 0), 10000);

  let barsHtml = weekDays.map((d, i) => {
    const isSun = i === 0;
    const isSat = i === 6;
    const exp = Number(d.expense) || 0;
    const heightPercent = exp > 0 ? Math.max(12, (exp / maxDayExp) * 100) : 0;
    const barColor = exp > 0 ? 'var(--accent-rose)' : 'transparent';
    const amountLabel = exp > 0 ? `${Math.round(exp / 1000)}k` : '-';

    return `
      <div class="weekly-bar-col">
        <div class="weekly-bar-amt" title="₩${exp.toLocaleString()}">${amountLabel}</div>
        <div class="weekly-bar-track">
          <div class="weekly-bar-fill" style="height: ${heightPercent}%; background-color: ${barColor};"></div>
        </div>
        <div class="weekly-bar-day ${isSun ? 'is-sun' : isSat ? 'is-sat' : ''}">
          <span>${d.dayName || ''}</span>
          <small>${d.dayNum || ''}</small>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="weekly-bar-chart-wrap">
      <div class="weekly-bars-container">
        ${barsHtml}
      </div>
    </div>
  `;
}

/**
 * 가계부 카테고리별 지출 도넛 차트 생성
 * @param {Array<{ category: string, total: number, color: string }>} categoryData 
 * @param {number} totalExpense 
 * @returns {string} SVG HTML string
 */
export function renderExpenseDonutChart(categoryData = [], totalExpense = 0) {
  if (!categoryData || !Array.isArray(categoryData) || categoryData.length === 0 || !totalExpense || totalExpense <= 0) {
    return `<div class="chart-empty" style="padding: 1.5rem 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.82rem;">지출 내역이 없습니다.</div>`;
  }

  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  let circlesHtml = '';

  const colors = [
    '#ef4444', '#f97316', '#10b981', '#06b6d4', 
    '#6366f1', '#ec4899', '#8b5cf6', '#eab308'
  ];

  categoryData.forEach((item, idx) => {
    const amt = Number(item.total) || 0;
    const percent = amt / totalExpense;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    const color = item.color || colors[idx % colors.length];

    circlesHtml += `
      <circle cx="${center}" cy="${center}" r="${radius}"
        fill="transparent"
        stroke="${color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDasharray}"
        stroke-dashoffset="${strokeDashoffset}"
        stroke-linecap="round"
        transform="rotate(-90 ${center} ${center})"
        class="donut-segment"
      />
    `;
  });

  return `
    <div class="donut-chart-container">
      <svg class="donut-svg" viewBox="0 0 ${size} ${size}">
        <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent" stroke="var(--bg-subtle)" stroke-width="${strokeWidth}"/>
        ${circlesHtml}
      </svg>
      <div class="donut-center-info">
        <span class="donut-label">총 지출</span>
        <span class="donut-value">₩${Number(totalExpense).toLocaleString()}</span>
      </div>
    </div>
  `;
}
