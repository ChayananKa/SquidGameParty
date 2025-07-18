const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;
const MAX_DRAW_NUMBER = 90;

let CURRENT_PHASE = 'register';


// เปิดไฟล์ staff.db
const db = new sqlite3.Database('./staff.db');

// Middleware
app.use(express.json());

// ดูพนักงานทั้งหมด
app.get('/api/employees', (req, res) => {
  db.all('SELECT * FROM employees', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Start server
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// เพิ่มหมายเลขให้พนักงาน
app.post('/api/assign', (req, res) => {
  const { employeeId, drawNumber } = req.body;

  if (CURRENT_PHASE !== 'register') {
    return res.status(400).json({ error: 'Assign is not allowed. Registration is closed.' });
  }
  
  if (!employeeId || drawNumber == null) {
    return res.status(400).json({ error: 'employeeId and drawNumber are required' });
  }

  if (drawNumber < 1 || drawNumber > MAX_DRAW_NUMBER) {
    return res.status(400).json({ error: `Draw number must be between 1 and ${MAX_DRAW_NUMBER}.` });
  }

  // 1️⃣ เช็คว่าพนักงานนี้ assign ไปแล้วหรือยัง
  const sqlCheckEmployee = 'SELECT drawNumber FROM employees WHERE employeeId = ?';
  db.get(sqlCheckEmployee, [employeeId], (err, empRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!empRow) return res.status(404).json({ error: 'Employee not found' });
    if (empRow.drawNumber !== null) {
      return res.status(400).json({ error: 'This employee has already been assigned a number.' });
    }

    // 2️⃣ เช็คว่า drawNumber นี้มีใครใช้แล้ว
    const sqlCheckNumber = 'SELECT employeeId FROM employees WHERE drawNumber = ?';
    db.get(sqlCheckNumber, [drawNumber], (err, numRow) => {
      if (err) return res.status(500).json({ error: err.message });
      if (numRow) {
        return res.status(400).json({ error: `Number ${drawNumber} has already been assigned to another employee.` });
      }

      // 3️⃣ Assign ได้จริง
      const sqlUpdate = 'UPDATE employees SET drawNumber = ? WHERE employeeId = ?';
      db.run(sqlUpdate, [drawNumber, employeeId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Assigned successfully' });
      });
    });
  });
});



// สุ่มคัดออก
app.post('/api/randomOut', (req, res) => {
  const { count } = req.body;
  if (!count || count <= 0) {
    return res.status(400).json({ error: 'Count is required and must be > 0' });
  }

  // 1️⃣ ดึงคนที่ยัง IN
  db.all(`
    SELECT employeeId 
    FROM employees 
    WHERE (status IS NULL OR UPPER(status) = 'IN') 
      AND drawNumber IS NOT NULL`, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No IN employees available' });
    }

    // 2️⃣ สุ่มเลือก
    const shuffled = rows.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    // 3️⃣ อัปเดต DB
    const ids = selected.map(row => row.employeeId);
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE employees SET status = 'OUT' WHERE employeeId IN (${placeholders})`;

    db.run(sql, ids, function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ out: ids });
    });
  });
});

// ดู result ที่เหลือ
app.get('/api/results', (req, res) => {
  db.all('SELECT employeeId, name, status, drawNumber FROM employees', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// reset
app.post('/api/reset', (req, res) => {
  const sql = `UPDATE employees SET status = NULL, drawNumber = NULL`;
  db.run(sql, [], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }

    CURRENT_PHASE = 'register'; // ✅ 
    res.json({ message: 'Reset completed' });
  });
});

// ยกเลิกหมายเลข (Unassign)
app.post('/api/unassign', (req, res) => {
  const { employeeId } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId is required' });
  }

  const sql = 'UPDATE employees SET drawNumber = NULL WHERE employeeId = ?';
  db.run(sql, [employeeId], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: 'Unassigned successfully' });
  });
});

app.get('/api/config', (req, res) => {
  res.json({ maxDrawNumber: MAX_DRAW_NUMBER });
});

app.get('/api/state', (req, res) => {
  res.json({ phase: CURRENT_PHASE });
});

app.post('/api/start', (req, res) => {
  CURRENT_PHASE = 'random';
  res.json({ message: 'Phase changed to random' });
});

app.post('/api/openRegister', (req, res) => {
  CURRENT_PHASE = 'register';
  res.json({ message: 'Phase changed to register' });
});
