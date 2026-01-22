# How to Use PM2 for Process Management in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, PM2, Process Management, Production, Deployment

Description: Learn how to use PM2 to manage Node.js applications in production including clustering, monitoring, log management, and zero-downtime deployments.

---

PM2 is a production-grade process manager for Node.js applications. It keeps your app running forever, handles automatic restarts, provides load balancing, and includes monitoring tools.

## Installation

```bash
# Install globally
npm install -g pm2

# Verify installation
pm2 --version
```

## Basic Usage

### Start an Application

```bash
# Start a simple script
pm2 start app.js

# Start with a name
pm2 start app.js --name "my-api"

# Start with npm script
pm2 start npm --name "app" -- start

# Start with arguments
pm2 start app.js -- --port 3000
```

### Basic Commands

```bash
# List all processes
pm2 list
pm2 ls
pm2 status

# Stop a process
pm2 stop app-name
pm2 stop 0           # By ID
pm2 stop all         # Stop all

# Restart a process
pm2 restart app-name
pm2 restart all

# Delete a process
pm2 delete app-name
pm2 delete all

# Show process details
pm2 describe app-name
pm2 show app-name
```

## Ecosystem Configuration

Create a configuration file for consistent deployments.

### ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'api-server',
    script: './src/server.js',
    instances: 'max',           // Use all CPU cores
    exec_mode: 'cluster',       // Enable cluster mode
    watch: false,               // Watch for file changes
    max_memory_restart: '1G',   // Restart if memory exceeds 1GB
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080,
    },
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Advanced options
    max_restarts: 10,
    min_uptime: '5s',
    restart_delay: 4000,
    autorestart: true,
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
  }],
};
```

### Start with Ecosystem File

```bash
# Start all apps in config
pm2 start ecosystem.config.js

# Start in production mode
pm2 start ecosystem.config.js --env production

# Start specific app
pm2 start ecosystem.config.js --only api-server
```

## Cluster Mode

PM2 can run your app in cluster mode to utilize multiple CPU cores.

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './server.js',
    instances: 'max',        // Number of CPU cores
    exec_mode: 'cluster',
    
    // Or specify exact number
    // instances: 4,
  }],
};
```

### In-App Cluster Check

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
} else {
  console.log(`Worker ${process.pid} started`);
}

// Your app code runs in workers
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ pid: process.pid });
});

app.listen(3000);
```

## Zero-Downtime Reload

```bash
# Graceful reload (zero downtime)
pm2 reload app-name
pm2 reload all

# Standard restart (brief downtime)
pm2 restart app-name
```

### Graceful Shutdown Handler

```javascript
const express = require('express');
const app = express();

const server = app.listen(3000, () => {
  // Signal that app is ready
  process.send?.('ready');
});

// Handle graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

function gracefulShutdown() {
  console.log('Received shutdown signal');
  
  server.close((err) => {
    if (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
    
    // Close database connections
    // Close Redis connections
    // etc.
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
}
```

### Ecosystem Config for Graceful Shutdown

```javascript
module.exports = {
  apps: [{
    name: 'api',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    wait_ready: true,          // Wait for process.send('ready')
    listen_timeout: 10000,     // Max time to wait for ready
    kill_timeout: 5000,        // Time to wait before SIGKILL
  }],
};
```

## Monitoring

### Built-in Monitoring

```bash
# Real-time monitoring dashboard
pm2 monit

# Web-based monitoring
pm2 plus
```

### Custom Metrics

```javascript
const io = require('@pm2/io');

// Counter
const requestCounter = io.counter({
  name: 'Request Counter',
  id: 'app/requests',
});

// Meter (events per second)
const reqMeter = io.meter({
  name: 'Requests/sec',
  id: 'app/reqps',
});

// Histogram
const responseHistogram = io.histogram({
  name: 'Response Time',
  id: 'app/response-time',
  measurement: 'mean',
});

// Gauge
const cpuGauge = io.metric({
  name: 'CPU Usage',
  id: 'app/cpu',
});

// Usage in app
app.use((req, res, next) => {
  const start = Date.now();
  
  requestCounter.inc();
  reqMeter.mark();
  
  res.on('finish', () => {
    responseHistogram.update(Date.now() - start);
  });
  
  next();
});

// Update gauge periodically
setInterval(() => {
  cpuGauge.set(process.cpuUsage().user / 1000);
}, 5000);
```

## Log Management

### View Logs

```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs app-name

# View last 100 lines
pm2 logs --lines 100

# View only errors
pm2 logs --err

# Flush logs
pm2 flush
pm2 flush app-name
```

### Log Rotation

```bash
# Install log rotation module
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # Daily at midnight
```

### Custom Log Format

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './server.js',
    log_file: '/var/log/pm2/combined.log',
    out_file: '/var/log/pm2/out.log',
    error_file: '/var/log/pm2/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
    merge_logs: true,  // Combine logs from all instances
  }],
};
```

## Startup Script

Configure PM2 to start on system boot.

```bash
# Generate startup script
pm2 startup

# This outputs a command to run, e.g.:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username

# Save current process list
pm2 save

# To remove startup script
pm2 unstartup systemd
```

## Deployment

### Deployment Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './src/server.js',
  }],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['192.168.1.100', '192.168.1.101'],
      ref: 'origin/main',
      repo: 'git@github.com:user/repo.git',
      path: '/var/www/api',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
    staging: {
      user: 'deploy',
      host: '192.168.1.50',
      ref: 'origin/develop',
      repo: 'git@github.com:user/repo.git',
      path: '/var/www/api-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
```

### Deploy Commands

```bash
# Initial setup (first time only)
pm2 deploy production setup

# Deploy latest code
pm2 deploy production

# Deploy specific commit
pm2 deploy production commit abc123

# Revert to previous deployment
pm2 deploy production revert 1

# Execute remote command
pm2 deploy production exec "pm2 reload all"
```

## Environment Management

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './server.js',
    
    // Default environment
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      DB_HOST: 'localhost',
    },
    
    // Production environment
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080,
      DB_HOST: 'prod-db.example.com',
    },
    
    // Staging environment
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 8080,
      DB_HOST: 'staging-db.example.com',
    },
  }],
};
```

```bash
# Start with specific environment
pm2 start ecosystem.config.js --env production
pm2 start ecosystem.config.js --env staging
```

## Watch Mode

Auto-restart on file changes (for development).

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './server.js',
    watch: true,
    watch_delay: 1000,
    ignore_watch: [
      'node_modules',
      'logs',
      '.git',
      '*.log',
    ],
  }],
};
```

```bash
# Or via command line
pm2 start app.js --watch --ignore-watch "node_modules"
```

## Multiple Applications

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      script: './api/server.js',
      instances: 4,
      exec_mode: 'cluster',
    },
    {
      name: 'worker',
      script: './worker/index.js',
      instances: 2,
      exec_mode: 'cluster',
    },
    {
      name: 'scheduler',
      script: './scheduler/index.js',
      instances: 1,  // Only one scheduler
      cron_restart: '0 0 * * *',  // Restart daily at midnight
    },
  ],
};
```

## Actions and Commands

Remote actions from PM2:

```javascript
const io = require('@pm2/io');

// Define action
io.action('clear-cache', (reply) => {
  cache.clear();
  reply({ success: true });
});

io.action('get-status', async (reply) => {
  const status = await getAppStatus();
  reply(status);
});
```

```bash
# Trigger action
pm2 trigger app-name clear-cache
pm2 trigger app-name get-status
```

## Summary

| Command | Description |
|---------|-------------|
| `pm2 start` | Start application |
| `pm2 stop` | Stop application |
| `pm2 restart` | Restart application |
| `pm2 reload` | Zero-downtime reload |
| `pm2 delete` | Remove from PM2 |
| `pm2 list` | Show all processes |
| `pm2 logs` | View logs |
| `pm2 monit` | Real-time monitoring |
| `pm2 save` | Save process list |
| `pm2 startup` | Generate startup script |

| Config Option | Description |
|---------------|-------------|
| `instances` | Number of instances (or 'max') |
| `exec_mode` | 'cluster' or 'fork' |
| `watch` | Auto-restart on changes |
| `max_memory_restart` | Memory limit |
| `env_*` | Environment-specific vars |
| `wait_ready` | Wait for process.send('ready') |
| `kill_timeout` | Grace period for shutdown |
