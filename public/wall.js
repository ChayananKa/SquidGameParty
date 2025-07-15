let employees = [];
let soundOn = true;
let MAX_DRAW_NUMBER;
let previousEmployees = [];
let currentPhase = 'register';

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await loadEmployees();
  setupControls();
  updateControls();

  // 💥 Auto-refresh every 3 seconds
  setInterval(() => {
    loadEmployees();
  }, 5000);
});


function setupControls() {
  document.getElementById('randomBtn').addEventListener('click', handleRandom);
  document.getElementById('resetBtn').addEventListener('click', handleReset);
  document.getElementById('soundToggle').addEventListener('click', toggleSound);
  document.getElementById('startBtn').addEventListener('click', handleStart);
}

async function loadEmployees() {
  const res = await fetch('/api/employees');
  const newData = await res.json();

  renderGrid(newData, previousEmployees);
  renderFooter(newData);
  updateStatusText();

  previousEmployees = newData;
}


function renderGrid(current, previous) {
  const grid = document.getElementById('gridContainer');
  grid.innerHTML = '';

  const prevMap = new Map();
  previous.forEach(e => {
    if (e.drawNumber != null) prevMap.set(e.employeeId, e);
  });

  const assignedMap = new Map();
  current.forEach(emp => {
    if (emp.drawNumber != null) assignedMap.set(emp.drawNumber, emp);
  });

  for (let i = 1; i <= MAX_DRAW_NUMBER; i++) {
    const slot = document.createElement('div');
    slot.classList.add('slot');

    const emp = assignedMap.get(i);

    if (emp) {
      slot.classList.add(`status-${emp.status || 'IN'}`);
      
      // Check new registration
      const prev = prevMap.get(emp.employeeId);
      if (!prev) {
        slot.classList.add('new-register');
        playSound('assign');
      }

      slot.innerHTML = `
        <div class="slot-content">
          <div class="photo">
            <img src="${emp.photo}" alt="Photo">
          </div>
          <div class="number">#${emp.drawNumber}</div>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <div class="slot-content">
          <div class="photo">
            <img src="/images/logo_nct.png" alt="Waiting" class="placeholder">
          </div>
          <div class="number">#${i}</div>
        </div>
      `;
    }

    grid.appendChild(slot);
  }
}


function renderFooter(employees) {
  const footer = document.getElementById('outListScroll');
  const outList = employees
    .filter(emp => emp.status === 'OUT')
    .map(emp => `${emp.name} #${emp.drawNumber}`)
    .join(' | ');

  footer.textContent = outList ? `OUT: ${outList}` : 'OUT: ไม่มีใครตกรอบตอนนี้';
}

function updateStatusText() {
  const statusDiv = document.getElementById('statusText');
  const inCount = employees.filter(e => !e.status || e.status === 'IN').length;

  if (inCount === 0) {
    statusDiv.textContent = '✅ งานจบแล้ว 🎉';
  } else {
    statusDiv.textContent = `📥 กำลังสุ่มคัดออก - เหลือ ${inCount} คน`;
  }
}

async function handleRandom() {
  const count = parseInt(document.getElementById('countSelect').value);
  if (!count || count <= 0) return;

  // 1️⃣ Start Fake Animation
  startRandomAnimation();

  // 2️⃣ เล่นเสียง Effect
  playSound('random');

  // 3️⃣ รอ Delay (เช่น 5 วินาที)
  await new Promise(resolve => setTimeout(resolve, 6000));

  // 4️⃣ Call API จริง
  await fetch('/api/randomOut', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count })
  });

  await loadEmployees();

  // 5️⃣ หยุด Animation
  stopRandomAnimation();
}

async function handleReset() {
  if (!confirm('⚠️ ยืนยันจะ Reset ข้อมูลทั้งหมด?')) return;

  await fetch('/api/reset', {
    method: 'POST'
  });

  playSound('reset');
  await loadEmployees();
}

function handleStart() {
  if (!confirm('⚠️ จะเริ่มงานแล้วนะ ปิดลงทะเบียนและเปิดการสุ่ม?')) return;

  currentPhase = 'random';
  updateControls();
  playSound('start');
  alert('🎤 งานเริ่มแล้ว! ลงทะเบียนถูกปิด และสามารถสุ่ม Random Out ได้');
}

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById('soundToggle').textContent = soundOn ? '🔊 Sound On' : '🔇 Sound Off';
}

function playSound(action) {
  if (!soundOn) return;

  let audio;
  switch(action) {
    case 'random':
      audio = new Audio('/sounds/explosion.mp3');
      break;
    case 'reset':
      audio = new Audio('/sounds/reset.mp3');
      break;
    case 'start':
      audio = new Audio('/sounds/start.mp3');
      break;
    default:
      return;
  }
  audio.play();
}

async function loadConfig() {
  const res = await fetch('/api/config');
  const data = await res.json();
  MAX_DRAW_NUMBER = data.maxDrawNumber;
}

async function loadConfig() {
  const res = await fetch('/api/config');
  const data = await res.json();
  MAX_DRAW_NUMBER = data.maxDrawNumber;
}

function computeGridDimensions(n) {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return { cols, rows };
}

function playSound(action) {
  if (!soundOn) return;

  let audio;
  switch(action) {
    case 'random':
      audio = new Audio('/sounds/explosion.mp3');
      break;
    case 'reset':
      audio = new Audio('/sounds/reset.mp3');
      break;
    case 'start':
      audio = new Audio('/sounds/start.mp3');
      break;
    case 'assign':
      audio = new Audio('/sounds/ding.mp3');  // เพิ่มเสียง assign
      break;
    default:
      return;
  }
  audio.play();
}

function updateControls() {
  const isRegister = currentPhase === 'register';
  document.getElementById('randomBtn').disabled = isRegister;
  document.getElementById('resetBtn').disabled = isRegister;
  document.getElementById('startBtn').disabled = !isRegister;
}

function startRandomAnimation() {
  const slots = document.querySelectorAll('.slot');
  slots.forEach(slot => {
    slot.classList.add('random-flash');
  });
}

function stopRandomAnimation() {
  const slots = document.querySelectorAll('.slot');
  slots.forEach(slot => {
    slot.classList.remove('random-flash');
  });
}
