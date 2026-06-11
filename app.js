// ===== DATA =====
const STORAGE_KEY = 'budget_data_v1'
const MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const BUILT_IN_CATEGORIES = [
  { id: 'food',          label: 'אוכל/סופרמרקט',       icon: '🛒', color: '#10b981', defaultBudget: 3000 },
  { id: 'restaurants',   label: 'מסעדות/קפה',           icon: '🍽️', color: '#f59e0b', defaultBudget: 800  },
  { id: 'transport',     label: 'תחבורה/דלק',           icon: '🚗', color: '#3b82f6', defaultBudget: 1000 },
  { id: 'shopping',      label: 'קניות/ביגוד',          icon: '👗', color: '#ec4899', defaultBudget: 800  },
  { id: 'entertainment', label: 'בילויים/פנאי',          icon: '🎭', color: '#8b5cf6', defaultBudget: 600  },
  { id: 'health',        label: 'בריאות/רפואה',          icon: '💊', color: '#ef4444', defaultBudget: 400  },
  { id: 'education',     label: 'חינוך/קורסים',          icon: '📚', color: '#06b6d4', defaultBudget: 500  },
  { id: 'utilities',     label: 'חשבונות (חשמל/מים/גז)', icon: '💡', color: '#64748b', defaultBudget: 600  },
  { id: 'communication', label: 'טלפון/אינטרנט',         icon: '📱', color: '#0ea5e9', defaultBudget: 300  },
  { id: 'beauty',        label: 'טיפוח/יופי',            icon: '💅', color: '#d946ef', defaultBudget: 300  },
  { id: 'travel',        label: 'נסיעות/חופשות',         icon: '✈️', color: '#0d9488', defaultBudget: 500  },
  { id: 'kids',          label: 'ילדים',                 icon: '👶', color: '#f97316', defaultBudget: 1000 },
  { id: 'pets',          label: 'חיות מחמד',             icon: '🐾', color: '#a78bfa', defaultBudget: 200  },
  { id: 'savings',       label: 'חיסכון/השקעות',         icon: '💰', color: '#16a34a', defaultBudget: 1000 },
  { id: 'other',         label: 'אחר',                   icon: '📦', color: '#94a3b8', defaultBudget: 300  },
]

let data = loadData()
let currentMonth = getCurrentYearMonth()
let activeView = 'dashboard'

function getCategories() {
  return data.categories || BUILT_IN_CATEGORIES
}

function getCatById(id) {
  return getCategories().find(c => c.id === id) || { id, label: id, icon: '📦', color: '#94a3b8' }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (!parsed.categories) parsed.categories = BUILT_IN_CATEGORIES
      return parsed
    }
  } catch(e) {}
  return { months: {}, recurringExpenses: [], categories: BUILT_IN_CATEGORIES }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getCurrentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

function formatYearMonth(ym) {
  const [y, m] = ym.split('-')
  return `${MONTH_NAMES[parseInt(m)-1]} ${y}`
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6)
}

function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  if (m === 1) return `${y-1}-12`
  return `${y}-${String(m-1).padStart(2,'0')}`
}

function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  if (m === 12) return `${y+1}-01`
  return `${y}-${String(m+1).padStart(2,'0')}`
}

function getMonth(ym) {
  return data.months[ym] || null
}

function buildDefaultBudgets() {
  const budgets = {}
  for (const cat of getCategories()) budgets[cat.id] = cat.defaultBudget || 0
  return budgets
}

function ensureMonth(ym) {
  if (data.months[ym]) return data.months[ym]
  const prev = getMonth(prevMonth(ym))
  data.months[ym] = {
    incomes: prev ? {...prev.incomes} : { partner1: 0, partner2: 0 },
    fixedExpenses: data.recurringExpenses.map(e => ({ id: newId(), name: e.name, amount: e.amount, recurring: true, sourceId: e.id })),
    categoryBudgets: prev ? {...prev.categoryBudgets} : buildDefaultBudgets(),
    categoryExpenses: []
  }
  saveData()
  return data.months[ym]
}

function calcTotals(ym) {
  const m = getMonth(ym)
  if (!m) return { totalIncome: 0, totalFixed: 0, totalAllocated: 0, freeBudget: 0, catSpent: {}, totalCatSpent: 0, unspent: 0 }
  const totalIncome = (m.incomes.partner1 || 0) + (m.incomes.partner2 || 0)
  const totalFixed = m.fixedExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalAllocated = Object.values(m.categoryBudgets || {}).reduce((s, v) => s + (v || 0), 0)
  const catSpent = {}
  for (const e of (m.categoryExpenses || [])) {
    catSpent[e.category] = (catSpent[e.category] || 0) + (e.amount || 0)
  }
  const totalCatSpent = Object.values(catSpent).reduce((s, v) => s + v, 0)
  const freeBudget = totalIncome - totalFixed - totalAllocated
  const unspent = totalIncome - totalFixed - totalCatSpent
  return { totalIncome, totalFixed, totalAllocated, freeBudget, catSpent, totalCatSpent, unspent }
}

function formatCurrency(n) {
  return '₪' + Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })
}

// ===== TOAST =====
function toast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2500)
}

// ===== NAVIGATION =====
function switchView(name) {
  activeView = name
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name))
  document.querySelectorAll('.nav-tab, .mnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name))
  renderAll()
}

// ===== RENDER =====
function renderAll() {
  renderMonthBar()
  if (activeView === 'dashboard') renderDashboard()
  if (activeView === 'fixed') renderFixed()
  if (activeView === 'categories') renderCategories()
  if (activeView === 'history') renderHistory()
}

function renderMonthBar() {
  document.getElementById('monthLabel').textContent = formatYearMonth(currentMonth)
  const m = getMonth(currentMonth)
  document.getElementById('btnNewMonth').style.display = m ? 'none' : 'inline-block'
}

// ===== DASHBOARD =====
function renderDashboard() {
  const m = getMonth(currentMonth)
  if (!m) {
    document.getElementById('dashboard-content').innerHTML = `
      <div class="empty-state">
        <div style="font-size:3rem;margin-bottom:12px">📅</div>
        <p>אין נתונים לחודש זה.</p>
        <p style="margin-top:8px">לחצי על <strong>"חודש חדש"</strong> ליצור את התכנון.</p>
      </div>`
    return
  }

  const { totalIncome, totalFixed, totalAllocated, freeBudget, catSpent, unspent } = calcTotals(currentMonth)
  const freeClass = freeBudget < 0 ? 'negative' : freeBudget < 500 ? 'warning' : 'positive'
  const unspentClass = unspent < 0 ? 'negative' : unspent < 500 ? 'warning' : 'positive'

  const activeCats = getCategories().filter(cat => (m.categoryBudgets[cat.id] || 0) > 0 || (catSpent[cat.id] || 0) > 0)

  let catCardsHtml = activeCats.map(cat => {
    const budget = m.categoryBudgets[cat.id] || 0
    const spent = catSpent[cat.id] || 0
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
    const fillClass = pct >= 100 ? 'over' : pct >= 80 ? 'warning' : ''
    const alertVis = spent > budget && budget > 0 ? 'visible' : ''
    return `
      <div class="cat-card" style="border-right-color:${cat.color}">
        <div class="cat-name">${cat.icon} ${cat.label}</div>
        <div class="cat-amounts">
          <span class="cat-spent">${formatCurrency(spent)}</span>
          <span class="cat-budget">מתוך ${formatCurrency(budget)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${fillClass}" style="width:${pct}%;background:${fillClass ? '' : cat.color}"></div>
        </div>
        <div class="cat-alert ${alertVis}">⚠ חריגה של ${formatCurrency(spent - budget)}</div>
      </div>`
  }).join('')

  if (!catCardsHtml) catCardsHtml = `<div class="empty-state" style="grid-column:1/-1">הגדירי תקציב בלשונית "קטגוריות" כדי לראות כאן פרוגרס.</div>`

  document.getElementById('dashboard-content').innerHTML = `
    <div class="income-section">
      <h3>הכנסות חודשיות</h3>
      <div class="income-inputs">
        <div class="form-group">
          <label>בן/בת זוג 1</label>
          <input type="number" id="inc1" value="${m.incomes.partner1 || ''}" placeholder="0" onchange="updateIncome(1, this.value)">
        </div>
        <div class="form-group">
          <label>בן/בת זוג 2</label>
          <input type="number" id="inc2" value="${m.incomes.partner2 || ''}" placeholder="0" onchange="updateIncome(2, this.value)">
        </div>
      </div>
    </div>

    <div class="cards-grid">
      <div class="card">
        <div class="card-label">סה"כ הכנסות</div>
        <div class="card-value">${formatCurrency(totalIncome)}</div>
      </div>
      <div class="card">
        <div class="card-label">הוצאות קבועות</div>
        <div class="card-value">${formatCurrency(totalFixed)}</div>
      </div>
      <div class="card">
        <div class="card-label">מוקצה לקטגוריות</div>
        <div class="card-value">${formatCurrency(totalAllocated)}</div>
      </div>
      <div class="card">
        <div class="card-label">תקציב פנוי (לא מוקצה)</div>
        <div class="card-value ${freeClass}">${freeBudget < 0 ? '-' : ''}${formatCurrency(freeBudget)}</div>
      </div>
    </div>

    <div class="categories-section">
      <h2>הוצאות בפועל לפי קטגוריה</h2>
      <div class="cat-cards">${catCardsHtml}</div>
    </div>

    <div class="balance-card">
      <div class="card-label">יתרה בפועל — אחרי כל ההוצאות</div>
      <div class="card-value ${unspentClass}">${unspent < 0 ? '-' : ''}${formatCurrency(unspent)}</div>
    </div>`
}

function updateIncome(partner, val) {
  const m = getMonth(currentMonth)
  if (!m) return
  const key = partner === 1 ? 'partner1' : 'partner2'
  m.incomes[key] = parseFloat(val) || 0
  saveData()
  renderDashboard()
}

// ===== FIXED EXPENSES =====
function renderFixed() {
  const m = getMonth(currentMonth)
  if (!m) {
    document.getElementById('fixed-content').innerHTML = `<div class="empty-state">אין חודש פעיל. צרי חודש חדש תחילה.</div>`
    return
  }

  const total = m.fixedExpenses.reduce((s, e) => s + (e.amount || 0), 0)

  let rows = m.fixedExpenses.map(e => `
    <tr>
      <td>${e.name}</td>
      <td>${formatCurrency(e.amount)}</td>
      <td><span class="badge" style="background:#dbeafe;color:#1e40af">${e.recurring ? 'חוזרת' : 'חד-פעמית'}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteFixed('${e.id}')">מחק</button></td>
    </tr>`).join('')

  if (!rows) rows = `<tr><td colspan="4" class="empty-state" style="padding:20px">אין הוצאות קבועות</td></tr>`

  document.getElementById('fixed-content').innerHTML = `
    <div class="panel">
      <h2>הוצאות קבועות — ${formatYearMonth(currentMonth)}</h2>
      <table>
        <thead><tr><th>שם</th><th>סכום</th><th>סוג</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="2" style="font-weight:700;padding:12px">סה"כ: ${formatCurrency(total)}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>
    </div>
    <div class="panel">
      <h2>הוסף הוצאה קבועה</h2>
      <div class="form-row">
        <div class="form-group">
          <label>שם ההוצאה</label>
          <input type="text" id="fixedName" placeholder="לדוגמה: שכירות">
        </div>
        <div class="form-group">
          <label>סכום (₪)</label>
          <input type="number" id="fixedAmount" placeholder="0">
        </div>
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label class="checkbox-label">
          <input type="checkbox" id="fixedRecurring" checked>
          חוזרת כל חודש (תועתק אוטומטית לחודשים הבאים)
        </label>
      </div>
      <button class="btn btn-primary" onclick="addFixed()">הוסף</button>
    </div>`
}

function addFixed() {
  const name = document.getElementById('fixedName').value.trim()
  const amount = parseFloat(document.getElementById('fixedAmount').value)
  const recurring = document.getElementById('fixedRecurring').checked
  if (!name || !amount) { toast('יש למלא שם וסכום'); return }

  const m = getMonth(currentMonth)
  m.fixedExpenses.push({ id: newId(), name, amount, recurring })

  if (recurring) {
    data.recurringExpenses = data.recurringExpenses.filter(e => e.name !== name)
    data.recurringExpenses.push({ id: newId(), name, amount })
  }

  saveData()
  document.getElementById('fixedName').value = ''
  document.getElementById('fixedAmount').value = ''
  toast('הוצאה נוספה ✓')
  renderFixed()
}

function deleteFixed(id) {
  const m = getMonth(currentMonth)
  const exp = m.fixedExpenses.find(e => e.id === id)
  if (exp && exp.recurring) {
    data.recurringExpenses = data.recurringExpenses.filter(e => e.name !== exp.name)
  }
  m.fixedExpenses = m.fixedExpenses.filter(e => e.id !== id)
  saveData()
  renderFixed()
}

// ===== CATEGORIES VIEW =====
function renderCategories() {
  const m = getMonth(currentMonth)
  if (!m) {
    document.getElementById('categories-content').innerHTML = `<div class="empty-state">אין חודש פעיל. צרי חודש חדש תחילה.</div>`
    return
  }

  const { catSpent } = calcTotals(currentMonth)
  const cats = getCategories()

  const budgetRows = cats.map(cat => {
    const budget = m.categoryBudgets[cat.id] || 0
    const spent = catSpent[cat.id] || 0
    const over = spent > budget && budget > 0
    return `
      <div class="budget-row">
        <div class="budget-row-left">
          <span class="cat-icon">${cat.icon}</span>
          <span class="cat-row-label">${cat.label}</span>
        </div>
        <div class="budget-row-right">
          <input type="number" class="budget-input" value="${budget || ''}" placeholder="0"
            oninput="updateCatBudget('${cat.id}', this.value)"
            style="border-color:${over ? 'var(--red)' : ''}">
          ${spent > 0 ? `<span class="spent-indicator" style="color:${over ? 'var(--red)' : 'var(--text-muted)'}">שולם: ${formatCurrency(spent)}${over ? ' ⚠' : ''}</span>` : ''}
        </div>
      </div>`
  }).join('')

  const catOptions = cats.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('')

  let expRows = (m.categoryExpenses || []).slice().reverse().map(e => {
    const cat = getCatById(e.category)
    return `
      <tr>
        <td>${e.date || ''}</td>
        <td>${e.name}</td>
        <td><span class="badge" style="background:${cat.color}22;color:${cat.color}">${cat.icon} ${cat.label}</span></td>
        <td>${formatCurrency(e.amount)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteCatExp('${e.id}')">מחק</button></td>
      </tr>`
  }).join('')

  if (!expRows) expRows = `<tr><td colspan="5" class="empty-state" style="padding:20px">אין הוצאות עדיין</td></tr>`

  document.getElementById('categories-content').innerHTML = `
    <div class="panel">
      <h2>תקציב לפי קטגוריה — ${formatYearMonth(currentMonth)}</h2>
      <div class="budget-rows">${budgetRows}</div>
    </div>

    <div class="panel">
      <h2>הוסף הוצאה</h2>
      <div class="form-row">
        <div class="form-group">
          <label>שם ההוצאה</label>
          <input type="text" id="catExpName" placeholder="לדוגמה: סופר">
        </div>
        <div class="form-group">
          <label>סכום (₪)</label>
          <input type="number" id="catExpAmount" placeholder="0">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>קטגוריה</label>
          <select id="catExpCat">${catOptions}</select>
        </div>
        <div class="form-group">
          <label>תאריך</label>
          <input type="date" id="catExpDate" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      <button class="btn btn-primary" onclick="addCatExp()">הוסף הוצאה</button>
    </div>

    <div class="panel">
      <h2>➕ הוסף קטגוריה מותאמת אישית</h2>
      <div class="form-row">
        <div class="form-group">
          <label>שם הקטגוריה</label>
          <input type="text" id="newCatLabel" placeholder="לדוגמה: מתנות">
        </div>
        <div class="form-group">
          <label>אייקון (אמוג'י)</label>
          <input type="text" id="newCatIcon" placeholder="🎁" maxlength="4" style="font-size:1.3rem;text-align:center">
        </div>
        <div class="form-group">
          <label>צבע</label>
          <input type="color" id="newCatColor" value="#6366f1" style="height:42px;padding:4px 8px">
        </div>
      </div>
      <button class="btn btn-primary" onclick="addCustomCategory()">הוסף קטגוריה</button>
      ${getCategories().filter(c => !BUILT_IN_CATEGORIES.find(b => b.id === c.id)).length > 0 ? `
        <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:0.85rem;font-weight:600;color:var(--text-muted);margin-bottom:10px">קטגוריות מותאמות אישית</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${getCategories().filter(c => !BUILT_IN_CATEGORIES.find(b => b.id === c.id)).map(c => `
              <span class="custom-cat-chip" style="background:${c.color}22;border:1px solid ${c.color};color:${c.color}">
                ${c.icon} ${c.label}
                <button onclick="deleteCustomCategory('${c.id}')" style="background:none;border:none;cursor:pointer;color:${c.color};font-size:0.9rem;padding:0 0 0 4px">✕</button>
              </span>`).join('')}
          </div>
        </div>` : ''}
    </div>

    <div class="panel">
      <h2>רשימת הוצאות</h2>
      <table>
        <thead><tr><th>תאריך</th><th>שם</th><th>קטגוריה</th><th>סכום</th><th></th></tr></thead>
        <tbody>${expRows}</tbody>
      </table>
    </div>`
}

function updateCatBudget(cat, val) {
  const m = getMonth(currentMonth)
  if (!m) return
  if (!m.categoryBudgets) m.categoryBudgets = {}
  m.categoryBudgets[cat] = parseFloat(val) || 0
  saveData()
}

function addCatExp() {
  const name = document.getElementById('catExpName').value.trim()
  const amount = parseFloat(document.getElementById('catExpAmount').value)
  const category = document.getElementById('catExpCat').value
  const date = document.getElementById('catExpDate').value
  if (!name || !amount) { toast('יש למלא שם וסכום'); return }

  const m = getMonth(currentMonth)
  if (!m.categoryExpenses) m.categoryExpenses = []
  m.categoryExpenses.push({ id: newId(), name, amount, category, date })
  saveData()
  document.getElementById('catExpName').value = ''
  document.getElementById('catExpAmount').value = ''
  toast('הוצאה נוספה ✓')
  renderCategories()
}

function deleteCatExp(id) {
  const m = getMonth(currentMonth)
  m.categoryExpenses = (m.categoryExpenses || []).filter(e => e.id !== id)
  saveData()
  renderCategories()
}

function addCustomCategory() {
  const label = document.getElementById('newCatLabel').value.trim()
  const icon = document.getElementById('newCatIcon').value.trim() || '📦'
  const color = document.getElementById('newCatColor').value
  if (!label) { toast('יש לתת שם לקטגוריה'); return }

  const id = 'custom_' + newId()
  data.categories.push({ id, label, icon, color, defaultBudget: 0, custom: true })

  // add budget entry for current month
  const m = getMonth(currentMonth)
  if (m) {
    if (!m.categoryBudgets) m.categoryBudgets = {}
    m.categoryBudgets[id] = 0
  }

  saveData()
  toast(`קטגוריה "${label}" נוספה ✓`)
  renderCategories()
}

function deleteCustomCategory(id) {
  data.categories = data.categories.filter(c => c.id !== id)
  saveData()
  toast('קטגוריה נמחקה')
  renderCategories()
}

// ===== HISTORY =====
let savingsChart = null
let catChart = null

function renderHistory() {
  const months = Object.keys(data.months).sort()
  if (months.length === 0) {
    document.getElementById('history-content').innerHTML = `<div class="empty-state">עדיין אין נתונים היסטוריים.</div>`
    return
  }

  const rows = months.map(ym => {
    const { totalIncome, totalFixed, totalCatSpent } = calcTotals(ym)
    const totalExpenses = totalFixed + totalCatSpent
    const savings = totalIncome - totalExpenses
    const cls = savings < 0 ? 'color:var(--red)' : savings > 0 ? 'color:var(--green)' : ''
    return `<tr>
      <td>${formatYearMonth(ym)}</td>
      <td>${formatCurrency(totalIncome)}</td>
      <td>${formatCurrency(totalExpenses)}</td>
      <td style="${cls};font-weight:600">${savings < 0 ? '-' : '+'}${formatCurrency(savings)}</td>
    </tr>`
  }).join('')

  document.getElementById('history-content').innerHTML = `
    <div class="panel">
      <h2>סיכום חודשי</h2>
      <table>
        <thead><tr><th>חודש</th><th>הכנסות</th><th>הוצאות</th><th>חיסכון</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="panel">
      <h2>חיסכון לאורך זמן</h2>
      <div class="chart-container"><canvas id="savingsChart"></canvas></div>
    </div>
    <div class="panel">
      <h2>הוצאות לפי קטגוריה (6 חודשים אחרונים)</h2>
      <div class="chart-container"><canvas id="catChart"></canvas></div>
    </div>`

  renderCharts(months)
}

function renderCharts(months) {
  const recent = months.slice(-6)
  const labels = recent.map(ym => formatYearMonth(ym))
  const cats = getCategories()

  const savings = recent.map(ym => {
    const { totalIncome, totalFixed, totalCatSpent } = calcTotals(ym)
    return totalIncome - totalFixed - totalCatSpent
  })

  if (savingsChart) savingsChart.destroy()
  if (catChart) catChart.destroy()

  const ctxS = document.getElementById('savingsChart').getContext('2d')
  savingsChart = new Chart(ctxS, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'חיסכון',
        data: savings,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: savings.map(v => v < 0 ? '#ef4444' : '#22c55e')
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: v => '₪' + v.toLocaleString() } } }
    }
  })

  // only show cats that have any spending
  const activeCats = cats.filter(cat =>
    recent.some(ym => {
      const { catSpent } = calcTotals(ym)
      return (catSpent[cat.id] || 0) > 0
    })
  )

  const ctxC = document.getElementById('catChart').getContext('2d')
  catChart = new Chart(ctxC, {
    type: 'bar',
    data: {
      labels,
      datasets: activeCats.map(cat => ({
        label: cat.icon + ' ' + cat.label,
        data: recent.map(ym => {
          const { catSpent } = calcTotals(ym)
          return catSpent[cat.id] || 0
        }),
        backgroundColor: cat.color
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { stacked: true },
        y: { stacked: true, ticks: { callback: v => '₪' + v.toLocaleString() } }
      }
    }
  })
}

// ===== MONTH NAVIGATION =====
function goToPrevMonth() {
  currentMonth = prevMonth(currentMonth)
  renderAll()
}

function goToNextMonth() {
  currentMonth = nextMonth(currentMonth)
  renderAll()
}

function createNewMonth() {
  ensureMonth(currentMonth)
  toast(`חודש ${formatYearMonth(currentMonth)} נוצר ✓`)
  renderAll()
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderAll()
})
