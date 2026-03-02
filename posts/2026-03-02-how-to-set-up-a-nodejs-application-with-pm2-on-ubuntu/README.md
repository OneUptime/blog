# How to Set Up a Node.js Application with PM2 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Node.js, PM2, Nginx, Web Server

Description: Deploy and manage a Node.js application on Ubuntu using PM2 for process management, with Nginx as a reverse proxy and automatic startup on server reboot.

---

Node.js applications run as long-lived processes. When you start one with `node app.js`, it works until it crashes or you close the terminal. PM2 (Process Manager 2) solves this by keeping your application running, automatically restarting on crashes, managing logs, and integrating with systemd to survive reboots. Nginx then sits in front to handle SSL, load balancing, and static files.

## Installing Node.js

Use NodeSource's repository for a current Node.js version:

```bash
# Install Node.js 20 LTS from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Verify
node --version
npm --version
```

Alternatively, use nvm for development machines where you need multiple Node versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install and use Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

## Installing PM2

Install PM2 globally:

```bash
sudo npm install -g pm2

# Verify
pm2 --version
```

## Setting Up Your Application

This example uses a simple Express application. Adapt the paths and entry point for your own app:

```bash
# Create the application directory
sudo mkdir -p /var/www/myapp
sudo chown $USER:$USER /var/www/myapp
cd /var/www/myapp

# Initialize and install dependencies
npm init -y
npm install express

# Create a simple Express application
cat > app.js << 'EOF'
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ message: 'Hello from Node.js!', pid: process.pid });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on port ${PORT}, PID: ${process.pid}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
EOF
```

Test it runs:

```bash
node app.js
# Press Ctrl+C to stop
```

## Starting Applications with PM2

```bash
# Start the application
pm2 start app.js --name myapp

# Start with a specific number of instances (cluster mode)
# This uses all CPU cores and enables zero-downtime reloads
pm2 start app.js --name myapp --instances max

# Start with specific number of instances
pm2 start app.js --name myapp --instances 4

# Start with environment variables
pm2 start app.js --name myapp --env production

# Check status
pm2 status
pm2 show myapp
```

## The PM2 Ecosystem Configuration File

For production, use an ecosystem file rather than command-line arguments. This makes your configuration version-controllable and reproducible:

```bash
cat > /var/www/myapp/ecosystem.config.js << 'EOF'
// PM2 ecosystem configuration file
module.exports = {
    apps: [
        {
            // Application name in PM2
            name: 'myapp',

            // Entry point
            script: 'app.js',

            // Working directory
            cwd: '/var/www/myapp',

            // Cluster mode: use all CPU cores
            // 'max' = number of CPU cores, or specify a number
            instances: 'max',
            exec_mode: 'cluster',

            // Restart on crash
            autorestart: true,

            // Watch for file changes (disable in production)
            watch: false,

            // Max memory before PM2 restarts the process (prevents memory leaks)
            max_memory_restart: '512M',

            // Time to wait between restarts (ms)
            restart_delay: 1000,

            // Minimum uptime to be considered stable (ms)
            min_uptime: '10s',

            // Maximum restart attempts before giving up
            max_restarts: 10,

            // Environment variables
            env: {
                NODE_ENV: 'development',
                PORT: 3000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
                // Add production-specific variables here
            },

            // Log configuration
            out_file: '/var/log/pm2/myapp-out.log',
            error_file: '/var/log/pm2/myapp-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

            // Rotate logs when they get large
            log_type: 'json',
            max_size: '100M',
            retain: 10,
        }
    ]
};
EOF
```

Start using the ecosystem file:

```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Start with production environment
pm2 start ecosystem.config.js --env production

# Check all processes
pm2 list
pm2 monit  # Real-time monitoring dashboard
```

## Surviving Server Reboots

PM2 can generate a systemd service to restart automatically after a reboot:

```bash
# Generate and install startup script
pm2 startup

# This will output a command like:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
# Run that exact command

# After starting your applications, save the process list
pm2 save

# Verify the systemd service was created
sudo systemctl status pm2-ubuntu  # or pm2-$USER
```

Now after a reboot, your applications will start automatically.

## Managing Application Lifecycle

```bash
# Restart (brief downtime)
pm2 restart myapp

# Reload (zero-downtime, only works in cluster mode)
pm2 reload myapp

# Stop
pm2 stop myapp

# Delete from PM2 (stops and removes)
pm2 delete myapp

# Restart all applications
pm2 restart all

# Zero-downtime deploy: reload cluster with updated code
git pull && pm2 reload myapp
```

## Deploying Code Updates

For zero-downtime deployments in cluster mode:

```bash
# Pull new code
cd /var/www/myapp
git pull

# Install any new dependencies
npm ci --production

# Reload PM2 (sends SIGINT to workers one by one, then starts replacement)
pm2 reload ecosystem.config.js --env production

# Verify no errors in logs
pm2 logs myapp --lines 50
```

## Configuring Nginx as Reverse Proxy

```nginx
# /etc/nginx/sites-available/myapp
upstream nodejs_cluster {
    # If running on a single port in cluster mode, one entry is fine
    server 127.0.0.1:3000;

    # If running multiple instances on different ports:
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
    # server 127.0.0.1:3003;

    keepalive 64;
}

server {
    listen 80;
    server_name example.com;

    # Serve static files directly
    location /static/ {
        alias /var/www/myapp/public/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        gzip_static on;
    }

    # Proxy to Node.js
    location / {
        proxy_pass http://nodejs_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_read_timeout 30;
        proxy_connect_timeout 30;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Monitoring and Logs

```bash
# Live log streaming
pm2 logs myapp

# Show last 100 lines
pm2 logs myapp --lines 100

# Real-time metrics dashboard
pm2 monit

# JSON status output (useful for scripts)
pm2 jlist

# Flush logs
pm2 flush myapp

# Process details
pm2 describe myapp
```

Set up log rotation to prevent logs from filling the disk:

```bash
# Install log rotation module
pm2 install pm2-logrotate

# Configure it
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # Daily at midnight
```

PM2 cluster mode combined with Nginx gives you a production-grade Node.js deployment that scales across all CPU cores and handles deployments without dropping a single request.
