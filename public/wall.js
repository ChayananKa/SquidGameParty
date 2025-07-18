let employees = [];
let soundOn = true;
let MAX_DRAW_NUMBER;
let previousEmployees = [];
let shownEmployeeIds = new Set(); // ✅ ใช้จำว่าใครเคย render ไปแล้ว
let currentPhase = null;
let autoRefreshInterval = null;
let finalWinner = null;
let finalLoser = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();          // โหลด MAX_DRAW_NUMBER
  await loadPhase();          // โหลด Phase ให้ currentPhase มีค่า
  await loadEmployees();      // โหลดข้อมูล
  setupControls();
  updateControls();
  updateStatusText();         // เพิ่มเติม
  startAutoRefreshIfNeeded(); // ✅ เรียกตอนรู้ phase แน่นอนแล้ว
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
  // ✅ [เพิ่ม] ป้องกันกรณีเรียก loadEmployees ก่อน config หรือ phase พร้อม
  if (!MAX_DRAW_NUMBER) {
    await loadConfig();
  }

  if (!currentPhase) {
    await loadPhase();
  }

  updateControls();
  updateStatusText();

  try {
    const res = await fetch('/api/employees');
    const newData = await res.json();

    employees = newData;
    renderGrid(newData, previousEmployees);
    renderFooter(newData);

    previousEmployees = newData;
    updateStatusText(newData); // ✅ ใช้ข้อมูลที่โหลดล่าสุด
  } catch (err) {
    console.error('❌ Failed to load employees:', err);
  }
}

function renderGrid(current, previous) {
  const grid = document.getElementById('gridContainer');
  grid.innerHTML = '';

  const currentShown = new Set(); // ✅ เก็บรอบนี้ไว้ใช้รอบหน้า

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
      slot.setAttribute('data-employee-id', emp.employeeId);

      slot.innerHTML = `
        <div class="slot-content">
          <div class="photo">
            <img src="${emp.photo}" alt="Photo">
          </div>
          <div class="number">${emp.drawNumber}</div>
        </div>
      `;

      // ✅ เฉพาะคนที่ยังไม่เคยแสดงในจอก่อนหน้า → แสดง effect
      const isNewToWall = !shownEmployeeIds.has(emp.employeeId);
      currentShown.add(emp.employeeId);

      if (isNewToWall) {
        requestAnimationFrame(() => {
          slot.classList.add('new-register');
        });
        playSound('assign');
      }

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

  // ✅ เก็บว่า employeeId ไหนเคยแสดงแล้ว (ใช้รอบถัดไป)
  shownEmployeeIds = currentShown;
}

function renderFooter(employees) {
  const footer = document.getElementById('outListScroll');
  const outList = employees
    .filter((emp) => emp.status?.toUpperCase() === "OUT")
    .map((emp) => `${emp.name} #${emp.drawNumber}`)
    .join(" | ");

  footer.textContent = outList ? `OUT: ${outList}` : 'OUT: ไม่มีใครตกรอบตอนนี้';
}

function updateStatusText(dataSource) {
  const statusDiv = document.getElementById('statusText');
  const data = dataSource || employees;

  if (currentPhase === 'register') {
    statusDiv.textContent = '📥 Waiting for Registration';
    return;
  }

  if (currentPhase === 'random') {
    const inCount = data.filter(e =>
      e.drawNumber != null && e.status?.toUpperCase() !== 'OUT'
    ).length;

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
  const slots = Array.from(document.querySelectorAll('.slot.status-IN'));
  if (slots.length === 0) {
    alert('❌ ไม่มีใครเหลืออยู่ในเกมแล้ว');
    return;
  }

  const remaining = slots.length;
  if (count >= remaining - 1) {
    alert(`❌ ไม่สามารถสุ่มออก ${count} คนได้ — เหลือแค่ ${remaining} คนในเกม!\nต้องเหลืออย่างน้อย 2 คนไว้สำหรับรอบสุดท้าย`);
    return;
  }

  // 🔀 สุ่มลำดับ slots ล่วงหน้า (แสดง animation วิ่ง)
  const flashOrder = [];
  const totalSteps = 40;
  for (let i = 0; i < totalSteps; i++) {
    const randomIndex = Math.floor(Math.random() * slots.length);
    flashOrder.push(slots[randomIndex]);
  }

  let delay = 50;
  for (let i = 0; i < flashOrder.length; i++) {
    slots.forEach(s => s.classList.remove('highlight'));
    flashOrder[i].classList.add('highlight');

    playSound('tick');
    await new Promise(res => setTimeout(res, delay));
    delay += 10;
  }

  // ✅ เรียก API เพื่อสุ่มคนออกจริง
  const res = await fetch('/api/randomOut', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count })
  });
  const data = await res.json();
  const outIds = data.out;

  // 🎯 highlight ทุกคนที่โดนสุ่มออก
  const allSlots = Array.from(document.querySelectorAll('.slot'));
  allSlots.forEach(s => s.classList.remove('highlight'));

  outIds.forEach(id => {
    const slot = allSlots.find(slot => slot.getAttribute('data-employee-id') === id);
    if (slot) {
      slot.classList.add('highlight');
    }
  });

  await new Promise(res => setTimeout(res, 1000));

  updateStatusText(employees); // อัปเดตจำนวนก่อน

  // 🧠 ✅ ตรวจว่าเหลือ 2 คน → แสดง popup คู่ชิง
  const remainingPlayers = employees.filter(
    e => e.drawNumber != null && e.status?.toUpperCase() !== 'OUT'
  );
  if (remainingPlayers.length === 2) {
    const [a, b] = remainingPlayers;
    showFinalistsPopup(a, b);   // ✅ แสดง popup คู่ชิงก่อน
    await loadEmployees();      // ✅ ค่อยโหลดข้อมูลอัปเดตหลังจาก popup แล้ว
    return;
  }

  // ✅ กรณีทั่วไป → โหลดข้อมูล + แสดง popup คนที่ออก
  await loadEmployees();
  showEliminatedPopup(outIds);
}

function showEliminatedPopup(outIds) {
  if (!outIds || outIds.length === 0) return;

  const popup = document.getElementById('popup');
  const grid = document.getElementById('popup-grid');
  const title = document.getElementById('popup-title');

  grid.innerHTML = ''; // เคลียร์ก่อนแสดงรอบใหม่

  outIds.forEach(id => {
    const emp = employees.find(e => e.employeeId === id);
    if (!emp) return;

    const card = document.createElement('div');
    card.classList.add('person');
    card.innerHTML = `
      <img src="${emp.photo}" alt="${emp.name}">
      <p>${emp.name}</p>
      <p>#${emp.drawNumber}</p>
    `;
    grid.appendChild(card);
  });

  // เปลี่ยน title ถ้าออกมากกว่า 1 คน
  title.textContent = outIds.length > 1
    ? `❌ ผู้ที่ถูกเชิญออกแล้ว ❌`
    : `❌ คุณถูกเชิญออกแล้ว ❌`;

  popup.classList.remove('hidden');
  playSound('eliminated');
}

function closePopup() {
  document.getElementById('popup').classList.add('hidden');
}

function showFinalistsPopup(a, b) {
  finalWinner = Math.random() < 0.5 ? a : b;
  finalLoser = finalWinner === a ? b : a;

  const popup = document.getElementById('popupFinalists');
  const grid = document.getElementById('finalists-grid');
  popup.classList.remove('hidden');

  grid.innerHTML = [finalWinner, finalLoser].map(emp => `
    <div class="person">
      <img src="${emp.photo}" alt="${emp.name}">
      <p>${emp.name}</p>
      <p>#${emp.drawNumber}</p>
    </div>
  `).join('');
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
  await loadEmployees();             // ✅ โหลดคนใหม่
  updateStatusText(employees);      // ✅ แสดงจำนวนที่ถูกต้อง
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
    case 'winner':
      setTimeout(() => {
        new Audio('/sounds/winner.mp3').play(); // มี delay 1 วิ
      }, 1000);
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

async function showCountdown() {
  const el = document.getElementById('countdown');
  const sequence = ['3', '2', '1'];
  el.classList.remove('hidden');

  for (let num of sequence) {
    el.textContent = num;
    await new Promise(res => setTimeout(res, 1000));
  }

  el.classList.add('hidden');
}

function dimExcept(finalTwoIds) {
  const allSlots = document.querySelectorAll('.slot');
  allSlots.forEach(slot => {
    const id = slot.getAttribute('data-employee-id');
    if (!finalTwoIds.includes(id)) {
      slot.classList.add('fade-out');
    }
  });
}

async function declareWinner(employeeId) {
  await fetch('/api/winner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId })
  });

  await loadEmployees();

  const winner = employees.find(e => e.employeeId === employeeId);
  if (!winner) return;

  const popup = document.getElementById('popup');
  const grid = document.getElementById('popup-grid');
  const title = document.getElementById('popup-title');

  grid.innerHTML = `
    <div class="person" style="box-shadow: 0 0 25px gold;">
      <img src="${winner.photo}">
      <p>${winner.name}</p>
      <p>#${winner.drawNumber}</p>
    </div>
  `;
  title.textContent = `👑 ขอแสดงความยินดีกับผู้ชนะ!`;
  popup.classList.remove('hidden');
  playSound('winner');
}

async function finalDuel(winnerId, loserId) {
  dimExcept([winnerId, loserId]);      // ปิดไฟช่องอื่น
  await showCountdown();               // 3..2..1

  const winnerSlot = document.querySelector(`.slot[data-employee-id="${winnerId}"]`);
  const loserSlot = document.querySelector(`.slot[data-employee-id="${loserId}"]`);

  // Highlight ไปมาระหว่าง 2 คน
  for (let i = 0; i < 6; i++) {
    winnerSlot.classList.toggle('highlight');
    loserSlot.classList.toggle('highlight');
    playSound('tick');
    await new Promise(res => setTimeout(res, 300));
  }

  await new Promise(res => setTimeout(res, 1000)); // silence 1 วิ

  // ลบ highlight
  winnerSlot.classList.remove('highlight');
  loserSlot.classList.remove('highlight');

  // แพ้ → fade out
  loserSlot.style.opacity = '0.1';

  // ชนะ → zoom + glow
  winnerSlot.classList.add('zoom');
  winnerSlot.classList.add('status-WINNER');

  playSound('winner');
  await new Promise(res => setTimeout(res, 1000));

  declareWinner(winnerId);
}

async function startFinalDuel() {
  document.getElementById('popupFinalists').classList.add('hidden');

  dimExcept([finalWinner.employeeId, finalLoser.employeeId]);
  await showCountdown();

  const winnerSlot = document.querySelector(`.slot[data-employee-id="${finalWinner.employeeId}"]`);
  const loserSlot = document.querySelector(`.slot[data-employee-id="${finalLoser.employeeId}"]`);

  for (let i = 0; i < 6; i++) {
    winnerSlot.classList.toggle('highlight');
    loserSlot.classList.toggle('highlight');
    playSound('tick');
    await new Promise(res => setTimeout(res, 300));
  }

  await new Promise(res => setTimeout(res, 1000)); // silence ก่อน

  winnerSlot.classList.remove('highlight');
  loserSlot.classList.remove('highlight');

  loserSlot.style.opacity = '0.1';
  winnerSlot.classList.add('zoom');
  winnerSlot.classList.add('status-WINNER');

  playSound('winner');
  await new Promise(res => setTimeout(res, 1000));

  await declareWinner(finalWinner.employeeId);
}
