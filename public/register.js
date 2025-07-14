let employees = [];
let selectedEmployee = null;


document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/employees')
    .then(res => res.json())
    .then(data => {
      employees = data;
    });

  document.getElementById('search').addEventListener('input', handleSearch);
  document.getElementById('assignBtn').addEventListener('click', handleAssign);
});

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  const filtered = employees.filter(emp =>
    emp.name.toLowerCase().includes(query) ||
    emp.employeeId.toLowerCase().includes(query)
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

    // ✅ Animate each item
    gsap.from(div, { opacity: 0, y: 20, duration: 0.4 });
  });
}

function selectEmployee(emp) {
  selectedEmployee = emp;
  document.getElementById('photo').src = emp.photo;
  document.getElementById('name').textContent = emp.name;
  document.getElementById('employeeId').textContent = emp.employeeId;
  document.getElementById('status').textContent = '';

  // ✅ Animate Preview Card
  gsap.from("#employee-card", { scale: 0.8, opacity: 0, duration: 0.5 });
}

function handleAssign() {
  const number = document.getElementById('drawNumber').value;
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
      drawNumber: parseInt(number)
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showError(`❌ ${data.error}`);
      } else {
        showSuccess('✅ Assigned successfully');
        resetForm();
      }
    })
    .catch(() => {
      showError('❌ Error during assign');
    });
}

function showError(message) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.style.color = 'red';

  // ✅ Shake Animation
  gsap.fromTo(statusDiv, { x: -5 }, { x: 5, duration: 0.1, yoyo: true, repeat: 5 });
}

function showSuccess(message) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.style.color = 'green';

  // ✅ Flash Animation
  gsap.fromTo(statusDiv, 
    { backgroundColor: 'var(--gold)' }, 
    { backgroundColor: 'transparent', duration: 1 });
}

function resetForm() {
  document.getElementById('drawNumber').value = '';
  document.getElementById('search').value = '';
  document.getElementById('results').innerHTML = '';
  document.getElementById('photo').src = '';
  document.getElementById('name').textContent = '';
  document.getElementById('employeeId').textContent = '';
  selectedEmployee = null;
}
