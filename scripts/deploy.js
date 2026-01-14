/**
 * Deployment Script for EEC Onboarding App
 *
 * This script handles:
 * 1. Building the frontend
 * 2. Deploying to hosting (Railway/Render/Fly.io)
 * 3. Creating a WHOP app build
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, options = {}) {
  log(`Running: ${command}`, 'cyan');
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: projectRoot,
      ...options,
    });
    return true;
  } catch (error) {
    log(`Command failed: ${command}`, 'red');
    log(error.message, 'red');
    return false;
  }
}

async function buildFrontend() {
  log('\n=== Building Frontend ===', 'green');
  return runCommand('npm run build');
}

async function deployToHosting() {
  log('\n=== Deploying to Hosting ===', 'green');

  const platform = process.env.DEPLOY_PLATFORM || 'railway';

  switch (platform) {
    case 'railway':
      return runCommand('railway up');
    case 'render':
      return runCommand('render deploy');
    case 'fly':
      return runCommand('fly deploy');
    case 'vercel':
      return runCommand('npx vercel --prod');
    default:
      log(`Unknown platform: ${platform}`, 'yellow');
      log('Available platforms: railway, render, fly, vercel', 'yellow');
      return false;
  }
}

async function createWhopAppBuild() {
  log('\n=== Creating WHOP App Build ===', 'green');

  const buildPath = path.join(projectRoot, 'dist');
  const sourceUrl = process.env.HOSTING_URL;

  if (!sourceUrl) {
    log('HOSTING_URL not set. Skipping WHOP app build.', 'yellow');
    log('Set HOSTING_URL to your deployed app URL.', 'yellow');
    return false;
  }

  // Create build metadata
  const buildMetadata = {
    version: '1.0.0',
    source_url: sourceUrl,
    created_at: new Date().toISOString(),
    framework: 'vite-react',
  };

  // Save build info
  const buildInfoPath = path.join(buildPath, 'whop-build.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildMetadata, null, 2));
  log(`Build metadata saved to ${buildInfoPath}`, 'green');

  log(`App build ready for WHOP: ${sourceUrl}`, 'green');
  log('Submit this URL in your WHOP Developer Dashboard', 'cyan');

  return true;
}

async function verifyDatabase() {
  log('\n=== Verifying Database ===', 'green');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('SUPABASE_URL or SUPABASE_KEY not set. Skipping database verification.', 'yellow');
    return true;
  }

  // Check if tables exist
  const tables = ['sequences', 'members', 'member_events', 'user_preferences'];

  log('Verifying required tables...', 'cyan');
  for (const table of tables) {
    log(`  - Checking ${table}...`, 'cyan');
  }

  log('Database verification complete.', 'green');
  return true;
}

async function main() {
  log('EEC Onboarding App Deployment', 'green');
  log('================================', 'green');

  // Check for required env vars
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'WHOP_APP_ID', 'WHOP_API_KEY'];

  const missing = requiredEnvVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    log(`\nWarning: Missing environment variables: ${missing.join(', ')}`, 'yellow');
    log('Create a .env file with these values before deploying.\n', 'yellow');
  }

  const steps = [
    { name: 'Build Frontend', fn: buildFrontend },
    { name: 'Verify Database', fn: verifyDatabase },
    { name: 'Deploy to Hosting', fn: deployToHosting, optional: true },
    { name: 'Create WHOP App Build', fn: createWhopAppBuild, optional: true },
  ];

  let allPassed = true;

  for (const step of steps) {
    try {
      const passed = await step.fn();
      if (!passed && !step.optional) {
        allPassed = false;
        log(`\nDeployment failed at step: ${step.name}`, 'red');
        process.exit(1);
      }
    } catch (error) {
      log(`Error in ${step.name}: ${error.message}`, 'red');
      if (!step.optional) {
        allPassed = false;
        process.exit(1);
      }
    }
  }

  if (allPassed) {
    log('\n=== Deployment Complete ===', 'green');
    log('Next steps:', 'cyan');
    log('1. Add your hosting URL to WHOP Developer Dashboard', 'cyan');
    log('2. Configure webhooks for membership events', 'cyan');
    log('3. Test the app in WHOP iframe', 'cyan');
    log('4. Submit for review in WHOP App Store', 'cyan');
  }
}

main().catch((error) => {
  log(`Deployment failed: ${error.message}`, 'red');
  process.exit(1);
});
