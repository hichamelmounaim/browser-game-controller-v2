import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const statusPath = path.join(process.cwd(), 'data', 'scrape_all_status.json');
const logPath = path.join(process.cwd(), 'data', 'scrape_all.log');

// Helper to read current status
function getStatus() {
  try {
    if (fs.existsSync(statusPath)) {
      return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    }
  } catch (e) {}
  return { status: 'idle', currentCategory: 'None', processedCategories: 0, totalCategories: 0, scrapedGamesCount: 0, currentAction: 'No active scraping process' };
}

export async function GET() {
  const status = getStatus();
  
  // Also load last 25 lines of log file if it exists
  let logs = '';
  try {
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf8');
      const lines = logContent.split('\n');
      logs = lines.slice(-25).join('\n');
    }
  } catch (e) {
    logs = 'Failed to load logs';
  }

  return NextResponse.json({ success: true, status, logs });
}

export async function POST(req: Request) {
  let resume = false;
  try {
    const body = await req.json();
    resume = !!body.resume;
  } catch (e) {}

  const currentStatus = getStatus();
  if (currentStatus.status === 'running') {
    return NextResponse.json({ success: false, error: 'A scraping process is already running.' }, { status: 400 });
  }

  console.log(resume ? "Resuming autonomous fetch-all scraper in the background..." : "Launching autonomous fetch-all scraper in the background...");
  
  // Initialize status file
  if (resume) {
    fs.writeFileSync(statusPath, JSON.stringify({
      ...currentStatus,
      status: 'running',
      currentAction: 'Resuming background process...'
    }, null, 2));
  } else {
    fs.writeFileSync(statusPath, JSON.stringify({
      status: 'running',
      currentCategory: 'Starting...',
      processedCategories: 0,
      totalCategories: 0,
      scrapedGamesCount: 0,
      completedCategories: [],
      currentAction: 'Spawning child process...'
    }, null, 2));
  }

  // Truncate previous log file if not resuming
  try {
    if (!resume) {
      fs.writeFileSync(logPath, '');
    } else {
      fs.appendFileSync(logPath, `\n--- RESUMING SCRAPER PROCESS ---\n`);
    }
  } catch (e) {}

  // Spawn npx tsx scrape_all_poki_games.ts with Windows compatibility (shell: true)
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  
  try {
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const args = ['tsx', 'scrape_gamemonetize.ts'];
    if (resume) {
      args.push('--resume');
    }
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      detached: true,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Save PID to file for stop capability
    if (child.pid) {
      const pidPath = path.join(process.cwd(), 'data', 'scrape_all_pid.txt');
      fs.writeFileSync(pidPath, child.pid.toString(), 'utf8');
    }

    child.on('error', (err) => {
      console.error('Spawn error:', err);
      try {
        fs.appendFileSync(logPath, `Process spawn error: ${err.message}\n`);
        fs.writeFileSync(statusPath, JSON.stringify({
          status: 'failed',
          currentCategory: 'Error',
          processedCategories: 0,
          totalCategories: 0,
          scrapedGamesCount: 0,
          completedCategories: [],
          currentAction: 'Failed to start background process.',
          error: err.message
        }, null, 2));
      } catch (writeErr) {
        console.error('Failed to log spawn error:', writeErr);
      }
    });

    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);

    // Unref to let it run completely detached in background
    child.unref();
  } catch (err: any) {
    console.error('Synchronous spawn exception:', err);
    try {
      fs.appendFileSync(logPath, `Synchronous spawn error: ${err.message}\n`);
    } catch (e) {}
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Autonomous scraper started successfully.' });
}

export async function DELETE() {
  // Reset scraper status to stopped and kill process group
  try {
    const pidPath = path.join(process.cwd(), 'data', 'scrape_all_pid.txt');
    if (fs.existsSync(pidPath)) {
      const pid = fs.readFileSync(pidPath, 'utf8').trim();
      console.log(`Stopping scraper process with PID: ${pid}`);
      
      const { exec } = require('child_process');
      if (process.platform === 'win32') {
        // Kill process tree on Windows
        exec(`taskkill /F /T /PID ${pid}`, (err: any) => {
          if (err) console.error('Failed to taskkill:', err);
        });
      } else {
        // Kill process group on Linux/macOS
        try {
          process.kill(-parseInt(pid, 10));
        } catch (e) {
          try {
            process.kill(parseInt(pid, 10));
          } catch (e2) {}
        }
      }
      
      try {
        fs.unlinkSync(pidPath);
      } catch (e) {}
    }

    const current = getStatus();
    fs.writeFileSync(statusPath, JSON.stringify({
      ...current,
      status: 'stopped',
      currentAction: 'Process stopped by user'
    }, null, 2));
    
    return NextResponse.json({ success: true, message: 'Scraper status stopped successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
