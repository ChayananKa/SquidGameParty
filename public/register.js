let employees = [];
let selectedEmployee = null;
let usedNumbersMap = {};

document.addEventListener('DOMContentLoaded', () => {
  loadEmployees();

  document.getElementById('search').addEventListener('input', handleSearch);
  document.getElementById('assignBtn').addEventListener('click', handleAssign);
  document.getElementById('drawNumber').addEventListener('input', validateDrawNumber);
});

function loadEmployees() {
  fetch('/api/employees')
    .then(res => res.json())
    .then(data => {
      employees = data;
      usedNumbersMap = {};
      data.forEach(emp => {
        if (emp.drawNumber) {
          usedNumbersMap[emp.drawNumber] = emp.name;
        }
      });

      renderAssignedList();
    });
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  const filtered = employees.filter(emp =>
    (!emp.drawNumber) &&
    (emp.name.toLowerCase().includes(query) || emp.employeeId.toLowerCase().includes(query))
  );

  filtered.forEach(emp => {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `
      <img src="${emp.photo}" height="50" alt="" />
      <span>${emp.name} (${emp.employeeId})</span>
    `;
    div.addEventListener('click', () => selectEmployee(emp));
    resultsDiv.appendChild(div);
  });
}

function selectEmployee(emp) {
  selectedEmployee = emp;
  document.getElementById('photo').src = emp.photo;
  document.getElementById('name').textContent = emp.name;
  document.getElementById('employeeId').textContent = emp.employeeId;
  document.getElementById('status').textContent = '';
  document.getElementById('drawNumber').value = '';
  document.getElementById('numberCheck').textContent = '';
}

function validateDrawNumber() {
  const number = parseInt(document.getElementById('drawNumber').value);
  const checkDiv = document.getElementById('numberCheck');
  const assignBtn = document.getElementById('assignBtn');

  if (!number || isNaN(number) || number <= 0) {
    checkDiv.textContent = '❌ Please enter a valid number';
    checkDiv.style.color = 'red';
    assignBtn.disabled = true;
    return;
  }

  if (usedNumbersMap[number]) {
    checkDiv.textContent = `❌ Number ${number} is already assigned to ${usedNumbersMap[number]}`;
    checkDiv.style.color = 'red';
    assignBtn.disabled = true;
  } else {
    checkDiv.textContent = `✅ Number ${number} is available`;
    checkDiv.style.color = 'green';
    assignBtn.disabled = false;
  }
}

function handleAssign() {
  const number = parseInt(document.getElementById('drawNumber').value);
  const statusDiv = document.getElementById('status');

  if (!selectedEmployee) {
    showError("❌ Please select an employee");
    return;
  }

  if (!number || isNaN(number) || number <= 0) {
    showError("❌ Please enter a valid draw number");
    return;
  }

  fetch('/api/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: selectedEmployee.employeeId,
      drawNumber: number
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showError(`❌ ${data.error}`);
      } else {
        showSuccess('✅ Assigned successfully');
        resetForm();
        loadEmployees();
      }
    })
    .catch(() => {
      showError('❌ Error during assign');
    });
}

function renderAssignedList() {
  const assignedDiv = document.getElementById('assignedList');
  assignedDiv.innerHTML = '';

  const assigned = employees.filter(emp => emp.drawNumber);

  if (assigned.length === 0) {
    assignedDiv.innerHTML = '<p>ยังไม่มีใครลงทะเบียน</p>';
    return;
  }

  const reversed = [...assigned].reverse();

  reversed.forEach(emp => {
    const card = document.createElement('div');
    card.className = 'assigned-card';
    card.innerHTML = `
      <img src="${emp.photo}" height="40" alt="" />
      <div class="info">
        <span class="name">${emp.name}</span>
        <span class="number">#${emp.drawNumber}</span>
      </div>
      <button class="unassignBtn">🗑️</button>
    `;
    card.querySelector('.unassignBtn').addEventListener('click', () => unassignEmployee(emp.employeeId));
    assignedDiv.appendChild(card);
  });
}

function unassignEmployee(employeeId) {
  if (!confirm('คุณต้องการล้างหมายเลขของคนนี้จริงหรือไม่?')) return;

  fetch('/api/unassign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId })
  })
    .then(res => res.json())
    .then(() => {
      loadEmployees();
    });
}

function showError(message) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.style.color = 'red';
}

function showSuccess(message) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.style.color = 'green';
}

function resetForm() {
  selectedEmployee = null;
  document.getElementById('photo').src = '';
  document.getElementById('name').textContent = '';
  document.getElementById('employeeId').textContent = '';
  document.getElementById('drawNumber').value = '';
  document.getElementById('numberCheck').textContent = '';
  document.getElementById('status').textContent = '';
  document.getElementById('search').value = '';
  document.getElementById('results').innerHTML = '';
}
