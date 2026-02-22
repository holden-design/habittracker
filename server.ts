import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'ps-default-secret-change-in-production';

// Extend Express Request type for auth
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

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
        habit_id VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        scheduled_time VARCHAR(5) NOT NULL,
        actual_time VARCHAR(5),
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `);

    // Migrations for existing databases
    await pool.query(`ALTER TABLE entries ADD COLUMN IF NOT EXISTS notes TEXT`);
    await pool.query(`ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_habit_id_fkey`);

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

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL DEFAULT '',
        name VARCHAR(255) NOT NULL DEFAULT '',
        plan VARCHAR(50) NOT NULL DEFAULT 'free',
        auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
        marketing_consent BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Migrations for OAuth and marketing fields
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) NOT NULL DEFAULT 'email'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false`);

    // Add user_id to all data tables (migration for existing databases)
    await pool.query(`ALTER TABLE habits ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)`);
    await pool.query(`ALTER TABLE entries ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)`);
    await pool.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)`);
    await pool.query(`ALTER TABLE ideas ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)`);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// ==================== AUTH MIDDLEWARE ====================

const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

// ==================== AUTH API ====================

// POST /api/auth/signup
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = await bcrypt.hash(password, 12);
    const marketingConsent = req.body.marketingConsent ?? false;

    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, plan, auth_provider, marketing_consent, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'free', 'email', $5, NOW(), NOW())`,
      [id, email.toLowerCase(), passwordHash, name || '', marketingConsent]
    );

    // If this is the first user, assign all existing orphaned data to them
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 1) {
      await pool.query('UPDATE habits SET user_id = $1 WHERE user_id IS NULL', [id]);
      await pool.query('UPDATE entries SET user_id = $1 WHERE user_id IS NULL', [id]);
      await pool.query('UPDATE notes SET user_id = $1 WHERE user_id IS NULL', [id]);
      await pool.query('UPDATE ideas SET user_id = $1 WHERE user_id IS NULL', [id]);
      console.log('✅ Assigned existing data to first user');
    }

    const token = jwt.sign({ userId: id, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: { id, email: email.toLowerCase(), name: name || '', plan: 'free', authProvider: 'email', marketingConsent, createdAt: new Date() }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        authProvider: user.auth_provider,
        marketingConsent: user.marketing_consent,
        createdAt: new Date(user.created_at),
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, email, name, plan, auth_provider, marketing_consent, created_at FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      authProvider: user.auth_provider,
      marketingConsent: user.marketing_consent,
      createdAt: new Date(user.created_at),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// POST /api/auth/google — Google OAuth
app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { credential, marketingConsent } = req.body;

  if (!credential) {
    res.status(400).json({ error: 'Google credential is required' });
    return;
  }

  try {
    // Verify the Google ID token
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!googleRes.ok) {
      res.status(401).json({ error: 'Invalid Google credential' });
      return;
    }

    const googleUser = await googleRes.json();
    const email = googleUser.email?.toLowerCase();
    const name = googleUser.name || googleUser.given_name || '';

    if (!email) {
      res.status(400).json({ error: 'Could not get email from Google account' });
      return;
    }

    // Check if user already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
    } else {
      // Create new user
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await pool.query(
        `INSERT INTO users (id, email, password_hash, name, plan, auth_provider, marketing_consent, created_at, updated_at)
         VALUES ($1, $2, '', $3, 'free', 'google', $4, NOW(), NOW()) RETURNING *`,
        [id, email, name, marketingConsent ?? false]
      );
      user = result.rows[0];

      // If first user, claim orphaned data
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) === 1) {
        await pool.query('UPDATE habits SET user_id = $1 WHERE user_id IS NULL', [id]);
        await pool.query('UPDATE entries SET user_id = $1 WHERE user_id IS NULL', [id]);
        await pool.query('UPDATE notes SET user_id = $1 WHERE user_id IS NULL', [id]);
        await pool.query('UPDATE ideas SET user_id = $1 WHERE user_id IS NULL', [id]);
      }
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        authProvider: user.auth_provider,
        marketingConsent: user.marketing_consent,
        createdAt: new Date(user.created_at),
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// POST /api/auth/facebook — Facebook OAuth
app.post('/api/auth/facebook', async (req: Request, res: Response) => {
  const { accessToken, marketingConsent } = req.body;

  if (!accessToken) {
    res.status(400).json({ error: 'Facebook access token is required' });
    return;
  }

  try {
    // Verify with Facebook Graph API
    const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    if (!fbRes.ok) {
      res.status(401).json({ error: 'Invalid Facebook access token' });
      return;
    }

    const fbUser = await fbRes.json();
    const email = fbUser.email?.toLowerCase();
    const name = fbUser.name || '';

    if (!email) {
      res.status(400).json({ error: 'Could not get email from Facebook. Make sure email permission is granted.' });
      return;
    }

    // Check if user already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
    } else {
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await pool.query(
        `INSERT INTO users (id, email, password_hash, name, plan, auth_provider, marketing_consent, created_at, updated_at)
         VALUES ($1, $2, '', $3, 'free', 'facebook', $4, NOW(), NOW()) RETURNING *`,
        [id, email, name, marketingConsent ?? false]
      );
      user = result.rows[0];

      // If first user, claim orphaned data
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) === 1) {
        await pool.query('UPDATE habits SET user_id = $1 WHERE user_id IS NULL', [id]);
        await pool.query('UPDATE entries SET user_id = $1 WHERE user_id IS NULL', [id]);
        await pool.query('UPDATE notes SET user_id = $1 WHERE user_id IS NULL', [id]);
        await pool.query('UPDATE ideas SET user_id = $1 WHERE user_id IS NULL', [id]);
      }
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        authProvider: user.auth_provider,
        marketingConsent: user.marketing_consent,
        createdAt: new Date(user.created_at),
      }
    });
  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(500).json({ error: 'Facebook authentication failed' });
  }
});

// ==================== HABITS API ====================

// GET all habits
app.get('/api/habits', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

// POST new habit
app.post('/api/habits', authMiddleware, async (req: Request, res: Response) => {
  const { id, name, color, frequency, customDays, targetDurationMinutes, createdAt } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO habits (id, name, color, frequency, custom_days, target_duration_minutes, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, name, color, frequency, customDays || null, targetDurationMinutes || null, req.userId, createdAt, createdAt]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

// DELETE habit (and its entries)
app.delete('/api/habits/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM entries WHERE habit_id = $1 AND user_id = $2', [req.params.id, req.userId]);
    await pool.query('DELETE FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

// ==================== ENTRIES API ====================

// GET entries by date
app.get('/api/entries/date/:date', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM entries WHERE date = $1 AND user_id = $2 ORDER BY scheduled_time',
      [req.params.date, req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// GET entries by date range
app.get('/api/entries/range/:start/:end', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM entries WHERE date >= $1 AND date <= $2 AND user_id = $3 ORDER BY date, scheduled_time',
      [req.params.start, req.params.end, req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// POST/UPDATE entry
app.post('/api/entries', authMiddleware, async (req: Request, res: Response) => {
  const { id, habitId, date, scheduledTime, actualTime, completed, completedAt, notes, createdAt } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO entries (id, habit_id, date, scheduled_time, actual_time, completed, completed_at, notes, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET scheduled_time = $4, actual_time = $5, completed = $6, completed_at = $7, notes = $8, updated_at = NOW()
       RETURNING *`,
      [id, habitId, date, scheduledTime, actualTime || null, completed, completedAt || null, notes || null, req.userId, createdAt, createdAt]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// DELETE entry
app.delete('/api/entries/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM entries WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// ==================== NOTES API ====================

// GET all notes
app.get('/api/notes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST note
app.post('/api/notes', authMiddleware, async (req: Request, res: Response) => {
  const { id, title, content, pinned, createdAt } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notes (id, title, content, pinned, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET title = $2, content = $3, pinned = $4, updated_at = NOW()
       RETURNING *`,
      [id, title, content || null, pinned || false, req.userId, createdAt, createdAt]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// DELETE note
app.delete('/api/notes/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ==================== IDEAS API ====================

// GET all ideas
app.get('/api/ideas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM ideas WHERE user_id = $1 ORDER BY updated_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

// POST idea
app.post('/api/ideas', authMiddleware, async (req: Request, res: Response) => {
  const { id, title, description, category, pinned, createdAt } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO ideas (id, title, description, category, pinned, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET title = $2, description = $3, category = $4, pinned = $5, updated_at = NOW()
       RETURNING *`,
      [id, title, description || null, category || null, pinned || false, req.userId, createdAt, createdAt]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save idea' });
  }
});

// DELETE idea
app.delete('/api/ideas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM ideas WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

// ==================== STATIC FILES ====================

// Serve React build in production  
let buildDir = path.join(process.cwd(), 'build');
if (!require('fs').existsSync(buildDir)) {
  buildDir = path.join(__dirname, '../build');
}
if (!require('fs').existsSync(buildDir)) {
  buildDir = path.join(__dirname, '../../build');
}

const buildExists = require('fs').existsSync(buildDir);
console.log(`📁 Build directory: ${buildDir}`);
console.log(`   Exists: ${buildExists}`);

if (buildExists) {
  app.use(express.static(buildDir));
} else {
  console.warn('⚠️  Build folder not found, serving minimal HTML');
  // Fallback: serve minimal HTML from server if build folder missing
  app.get('/', (req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Personal Systems</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fafafa; color: #333; }
          .sidebar { width: 280px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; min-height: 100vh; }
          .sidebar h1 { font-size: 1.5rem; margin-bottom: 2rem; }
          .main { flex: 1; padding: 2rem; }
          .app { display: flex; min-height: 100vh; }
          h2 { color: #667eea; margin: 2rem 0 1rem; }
          p { margin: 1rem 0; }
          .error { color: #d32f2f; padding: 1rem; background: #ffebee; border-radius: 4px; margin: 1rem 0; }
          .code { background: #f5f5f5; padding: 0.5rem 1rem; border-radius: 4px; font-family: monospace; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="app">
          <div class="sidebar">
            <h1>Personal Systems</h1>
            <p>Habit Tracker</p>
          </div>
          <div class="main">
            <h2>⚠️ Build Issue Detected</h2>
            <p>The React app build folder was not found, but the server is running!</p>
            <div class="error">
              <p><strong>Status:</strong> Server is online and API is working</p>
              <p><strong>Problem:</strong> Static React app not found at: <code class="code">${buildDir}</code></p>
            </div>
            <h2>Next Steps:</h2>
            <ol style="margin: 1rem 0 1rem 2rem;">
              <li>Make sure <code class="code">npm run build</code> completes successfully</li>
              <li>Verify <code class="code">build/</code> folder exists locally</li>
              <li>Check Railway deployment logs</li>
              <li>Rebuild the deployment</li>
            </ol>
            <h2>Check API:</h2>
            <p><a href="/api/health" style="color: #667eea;">Test API Health</a></p>
            <p><a href="/api/health/db" style="color: #667eea;">Test Database Connection</a></p>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}

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

// ==================== AI / CLAUDE API ====================

// Analyze a plan/note and break it into calendar tasks
app.post('/api/ai/analyze-plan', authMiddleware, async (req: Request, res: Response) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set. Add it to your .env file.' });
  }

  const { content, startDate } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'No content provided' });
  }

  const today = startDate || new Date().toISOString().split('T')[0];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `You are a productivity assistant. Analyze this plan and break it into specific, actionable calendar tasks.

Today's date is ${today}. Schedule tasks starting from today, spreading them out reasonably (not everything on one day). Consider task dependencies — things that need to happen first should be scheduled first.

For each task, provide:
- title: short actionable title (e.g. "Research venue options")
- date: YYYY-MM-DD format
- time: suggested time in HH:MM 24h format (spread throughout the day reasonably — mornings for focus work, afternoons for calls/meetings)
- durationMinutes: estimated duration (15, 30, 45, 60, 90, 120)
- notes: brief context or tip

Respond ONLY with valid JSON in this exact format, no other text:
{
  "summary": "Brief one-line summary of the plan",
  "tasks": [
    { "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "durationMinutes": 60, "notes": "..." }
  ]
}

Here is the plan to analyze:

${content}`
        }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      return res.status(response.status).json({ error: `Claude API error: ${response.statusText}` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Parse the JSON from Claude's response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse AI response' });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (error) {
    console.error('AI analyze-plan error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'AI request failed' });
  }
});

// Get habit nudges — which habits haven't been done today
app.post('/api/ai/habit-nudge', authMiddleware, async (req: Request, res: Response) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set. Add it to your .env file.' });
  }

  const { habits, completedToday, currentTime } = req.body;
  if (!habits || !Array.isArray(habits)) {
    return res.status(400).json({ error: 'No habits provided' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You are a supportive habit coach. The current time is ${currentTime || 'afternoon'}.

Here are all my habits: ${JSON.stringify(habits.map((h: any) => ({ name: h.name, id: h.id })))}

These ones are already completed today: ${JSON.stringify(completedToday || [])}

For each UNCOMPLETED habit, give a brief encouraging nudge with a suggested time to do it (considering the current time of day). Be warm but concise — 1 sentence max per habit.

Respond ONLY with valid JSON array, no other text:
[
  { "habitName": "...", "habitId": "...", "suggestedTime": "HH:MM", "message": "..." }
]`
        }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      return res.status(response.status).json({ error: `Claude API error: ${response.statusText}` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse AI response' });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (error) {
    console.error('AI habit-nudge error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'AI request failed' });
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
