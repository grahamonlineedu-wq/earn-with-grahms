// index.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'grahms_super_secret_key_123';

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// -------------------------------------------------------------------
// 1. USER REGISTRATION ENDPOINT
// -------------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  const { email, password, full_name, role } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userRole = role === 'requester' ? 'requester' : 'worker';

    const newUser = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, full_name, role, balance_cents, created_at`,
      [email, hashedPassword, full_name, userRole]
    );

    const token = jwt.sign(
      { id: newUser.rows[0].id, role: newUser.rows[0].role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser.rows[0],
      token
    });
  } catch (err) {
    if (err.code === '23505') { // Postgres unique violation error
      return res.status(409).json({ error: 'Email is already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// -------------------------------------------------------------------
// 2. TASK CREATION ENDPOINT (Requesters only)
// -------------------------------------------------------------------
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, reward_cents, max_submissions } = req.body;

  if (req.user.role !== 'requester') {
    return res.status(403).json({ error: 'Only requesters can create tasks' });
  }

  if (!title || !description || !reward_cents || reward_cents <= 0) {
    return res.status(400).json({ error: 'Valid title, description, and reward amount are required' });
  }

  try {
    const newTask = await db.query(
      `INSERT INTO tasks (requester_id, title, description, reward_cents, max_submissions) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [req.user.id, title, description, reward_cents, max_submissions || 1]
    );

    res.status(201).json({
      message: 'Task created successfully',
      task: newTask.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// -------------------------------------------------------------------
// 3. TASK SUBMISSION ENDPOINT (Workers only)
// -------------------------------------------------------------------
app.post('/api/submissions', authenticateToken, async (req, res) => {
  const { task_id, proof_data } = req.body;

  if (!task_id || !proof_data) {
    return res.status(400).json({ error: 'Task ID and proof data are required' });
  }

  try {
    // Verify task exists and is active
    const taskCheck = await db.query('SELECT * FROM tasks WHERE id = $1', [task_id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (taskCheck.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'Task is no longer active' });
    }

    // Insert submission
    const newSubmission = await db.query(
      `INSERT INTO submissions (task_id, worker_id, proof_data) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [task_id, req.user.id, proof_data]
    );

    res.status(201).json({
      message: 'Task submitted successfully for review',
      submission: newSubmission.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation (unique_worker_task)
      return res.status(409).json({ error: 'You have already submitted proof for this task' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to submit task proof' });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Earn with Grahm API running on port ${PORT}`);
});

