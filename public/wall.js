let employees = [];
let soundOn = true;
let MAX_DRAW_NUMBER;
let previousEmployees = [];
let currentPhase = 'register';
let autoRefreshInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await loadPhase();  
  await loadEmployees();
  setupControls();
  updateControls();
  startAutoRefreshIfNeeded();
});

function startAutoRefreshIfNeeded() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  if (currentPhase === 'register') {
    autoRefreshInterval = setInterval(() => {
      loadEmployees();
    }, 5000);
  }
}

function setupControls() {
  document.getElementById('randomBtn').addEventListener('click', handleRandom);
  document.getElementById('resetBtn').addEventListener('click', handleReset);
  document.getElementById('soundToggle').addEventListener('click', toggleSound);
  document.getElementById('startBtn').addEventListener('click', handleStart);
  document.getElementById('openRegisterBtn').addEventListener('click', handleOpenRegister);
}

async function loadEmployees() {
  await loadPhase();  // ✅ ดึง phase สดๆ จาก server ด้วย

  const res = await fetch('/api/employees');
  const newData = await res.json();

  employees = newData;
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
      const slotStatus = (emp.status || 'IN').toUpperCase();
      slot.classList.add(`status-${slotStatus}`);

      // Check new registration
      const prev = prevMap.get(emp.employeeId);
      if (!prev) {
        slot.classList.add('new-register');
        playSound('assign');
      }

      slot.setAttribute('data-employee-id', emp.employeeId);

      slot.innerHTML = `
        <div class="slot-content">
          <div class="photo">
            <img src="${emp.photo}" alt="Photo">
          </div>
          <div class="number">${emp.drawNumber}</div>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <div class="slot-content">
          <div class="photo">
            <img src="/images/logo_nct.png" alt="Waiting" class="placeholder">
          </div>
          <div class="number">${i}</div>
        </div>
      `;
    }

    grid.appendChild(slot);
  }
}

function renderFooter(employees) {
  const footer = document.getElementById('outListScroll');
  const outList = employees
    .filter((emp) => emp.status.toUpperCase() === "OUT")
    .map((emp) => `${emp.name} #${emp.drawNumber}`)
    .join(" | ");

  footer.textContent = outList ? `OUT: ${outList}` : 'OUT: ไม่มีใครตกรอบตอนนี้';
}

function updateStatusText() {
  const statusDiv = document.getElementById('statusText');

  if (currentPhase === 'register') {
    statusDiv.textContent = '📥 Waiting for Registration';
    return;
  }

  if (currentPhase === 'random') {
    const inCount = employees.filter(e => !e.status || e.status.toUpperCase() === 'IN').length;

    if (inCount === 0) {
      statusDiv.textContent = '✅ งานจบแล้ว 🎉';
    } else {
      statusDiv.textContent = `🎲 กำลังสุ่มคัดออก - เหลือ ${inCount} คน`;
    }
  }
}

async function handleRandom() {

  const countValue = document.getElementById('countSelect').value;
    if (!countValue) {
    alert('❌ กรุณาเลือกจำนวนคนที่จะสุ่มออก');
    return;
  }
  console.log('countSelect.value =', countValue);

  const count = parseInt(countValue);
  if (!count || isNaN(count) || count <= 0) {
    alert('❌ โปรดเลือกจำนวนคนที่จะสุ่มออก (เช่น 1 คน)');
    return;
  }

  console.log('🔥 handleRandom running with count:', count);
  await runLightAnimationAndRandom(count);
}


async function runLightAnimationAndRandom(count) {
  // 💥 เลือกเฉพาะ slot ที่ยัง IN
  const slots = Array.from(document.querySelectorAll('.slot.status-IN'));
  if (!slots.length) {
    alert('❌ ไม่มีใครเหลืออยู่ในเกมแล้ว');
    return;
  }

  let index = 0;
  let totalSteps = 40;
  let delay = 50;

  for (let step = 0; step < totalSteps; step++) {
    slots.forEach(s => s.classList.remove('highlight'));
    slots[index % slots.length].classList.add('highlight');

    playSound('tick');

    await new Promise(res => setTimeout(res, delay));
    delay += 10;
    index++;
  }

  // ล้างไฟ
  slots.forEach(s => s.classList.remove('highlight'));

  // ✅ Call API จริง
  const res = await fetch('/api/randomOut', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count })
  });
  const data = await res.json();

  await loadEmployees();

  // ✅ แสดง Popup
  showEliminatedPopup(data.out);
}

function showEliminatedPopup(outIds) {
  if (!outIds || outIds.length === 0) return;

  const eliminated = employees.find(e => e.employeeId === outIds[0]);
  if (!eliminated) return;

  document.getElementById('popup-photo').src = eliminated.photo;
  document.getElementById('popup-name').textContent = eliminated.name;
  document.getElementById('popup-number').textContent = `#${eliminated.drawNumber}`;
  document.getElementById('popup-message').innerHTML = `
    ❌ คุณถูกเชิญออกแล้ว!<br>
    ❌ You are eliminated!
  `;

  document.getElementById('popup').classList.remove('hidden');
  playSound('eliminated');
}

function closePopup() {
  document.getElementById('popup').classList.add('hidden');
}

async function handleReset() {
  if (!confirm('⚠️ ยืนยันจะ Reset ข้อมูลทั้งหมด?')) return;

  await fetch('/api/reset', { method: 'POST' });
  playSound('reset');
  await loadEmployees();
  startAutoRefreshIfNeeded();
}

async function handleStart() {
  if (!confirm('⚠️ จะเริ่มงานแล้วนะ ปิดลงทะเบียนและเปิดการสุ่ม?')) return;

  await fetch('/api/start', { method: 'POST' });
  await loadPhase();
  updateControls();
  await loadEmployees(); // ✅ NEW
  startAutoRefreshIfNeeded();

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
    case 'assign':
      audio = new Audio('/sounds/ding.mp3');
      break;
    case 'tick':
      audio = new Audio('/sounds/tick.mp3');
      break;
    case 'eliminated':
      audio = new Audio('/sounds/eliminated.mp3');
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

function updateControls() {
  console.log('updateControls phase:', currentPhase);

  const isRegister = currentPhase === 'register';
  const registeredCount = employees.filter(e => e.drawNumber != null).length;

  document.getElementById('randomBtn').disabled = currentPhase !== 'random';
  document.getElementById('resetBtn').disabled = isRegister;
  document.getElementById('startBtn').disabled = !isRegister || registeredCount === 0;
  document.getElementById('openRegisterBtn').disabled = isRegister;
  console.log('employees.length =', employees.length);
}


async function handleOpenRegister() {
  const pw = prompt('🔑 Enter admin password:');
  if (pw == null) return;

  try {
    const res = await fetch('/api/openRegister', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(`❌ Error: ${err.error}`);
      return;
    }

    alert('✅ Registration phase re-opened!');
    currentPhase = 'register';
    updateControls();
    await loadEmployees();
    startAutoRefreshIfNeeded();
    
  } catch (err) {
    console.error(err);
    alert('❌ Failed to reconnect to server');
  }
}

async function loadPhase() {
  const res = await fetch('/api/state');
  const data = await res.json();
  currentPhase = data.phase;
}