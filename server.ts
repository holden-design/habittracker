import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/personalsystems',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database tables
const initDB = async () => {
  try {
    // Check if we can connect
    await pool.query('SELECT 1');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(7) NOT NULL,
        frequency VARCHAR(50) NOT NULL,
        custom_days INTEGER[],
        target_duration_minutes INTEGER,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id VARCHAR(255) PRIMARY KEY,
        habit_id VARCHAR(255) NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        scheduled_time VARCHAR(5) NOT NULL,
        actual_time VARCHAR(5),
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ideas (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// ==================== HABITS API ====================

// GET all habits
app.get('/api/habits', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM habits ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

// POST new habit
app.post('/api/habits', async (req: Request, res: Response) => {
  const { id, name, color, frequency, customDays, targetDurationMinutes, createdAt } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO habits (id, name, color, frequency, custom_days, target_duration_minutes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, name, color, frequency, customDays || null, targetDurationMinutes || null, createdAt, createdAt]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

// DELETE habit
app.delete('/api/habits/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM habits WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

// ==================== ENTRIES API ====================

// GET entries by date
app.get('/api/entries/date/:date', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM entries WHERE date = $1 ORDER BY scheduled_time',
      [req.params.date]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// GET entries by date range
app.get('/api/entries/range/:start/:end', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM entries WHERE date >= $1 AND date <= $2 ORDER BY date, scheduled_time',
      [req.params.start, req.params.end]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// POST/UPDATE entry
app.post('/api/entries', async (req: Request, res: Response) => {
  const { id, habitId, date, scheduledTime, actualTime, completed, completedAt, createdAt } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO entries (id, habit_id, date, scheduled_time, actual_time, completed, completed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET actual_time = $5, completed = $6, completed_at = $7, updated_at = NOW()
       RETURNING *`,
      [id, habitId, date, scheduledTime, actualTime || null, completed, completedAt || null, createdAt, createdAt]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// DELETE entry
app.delete('/api/entries/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM entries WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// ==================== NOTES API ====================

// GET all notes
app.get('/api/notes', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM notes ORDER BY updated_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST note
app.post('/api/notes', async (req: Request, res: Response) => {
  const { id, title, content, pinned, createdAt } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notes (id, title, content, pinned, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET title = $2, content = $3, pinned = $4, updated_at = NOW()
       RETURNING *`,
      [id, title, content || null, pinned || false, createdAt, createdAt]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// DELETE note
app.delete('/api/notes/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM notes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ==================== IDEAS API ====================

// GET all ideas
app.get('/api/ideas', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM ideas ORDER BY updated_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

// POST idea
app.post('/api/ideas', async (req: Request, res: Response) => {
  const { id, title, description, category, pinned, createdAt } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO ideas (id, title, description, category, pinned, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET title = $2, description = $3, category = $4, pinned = $5, updated_at = NOW()
       RETURNING *`,
      [id, title, description || null, category || null, pinned || false, createdAt, createdAt]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save idea' });
  }
});

// DELETE idea
app.delete('/api/ideas/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM ideas WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

// ==================== STATIC FILES ====================

// Serve React build in production  
// Try multiple path variations to handle different environments
let buildDir = path.join(process.cwd(), 'build');
if (!require('fs').existsSync(buildDir)) {
  buildDir = path.join(__dirname, '../build');
}
if (!require('fs').existsSync(buildDir)) {
  buildDir = path.join(__dirname, '../../build');
}
console.log(`📁 Serving static files from: ${buildDir}`);
console.log(`   Exists: ${require('fs').existsSync(buildDir)}`);
app.use(express.static(buildDir));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Database health check
app.get('/api/health/db', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'connected',
      database: 'PostgreSQL',
      timestamp: result.rows[0].now,
      message: 'Database connection successful'
    });
  } catch (error) {
    res.status(500).json({
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database connection failed'
    });
  }
});

// For any other route, serve index.html (for React routing)
app.use((req: Request, res: Response) => {
  const buildPath = path.join(process.cwd(), 'build/index.html');
  console.log(`Serving: ${buildPath}`);
  res.sendFile(buildPath);
});

// ==================== START SERVER ====================

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Access at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.warn(`⚠️  Database connection failed, but server starting anyway:`);
    console.warn(`   ${err.message}`);
    console.log(`🚀 Server running on port ${PORT} (database offline)`);
    app.listen(PORT, () => {
      console.log(`📍 Access at http://localhost:${PORT}`);
    });
  });
