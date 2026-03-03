# How to Set Up Node.js as a systemd Service on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Node.js, systemd, Service, JavaScript

Description: Configure Node.js applications to run as systemd services on Ubuntu with automatic restarts, logging, and proper user permissions.

---

Running Node.js applications in production means getting them off the terminal and into a proper process manager. systemd is built into Ubuntu and handles process supervision, logging, and startup ordering better than most third-party process managers. Setting up Node.js with systemd directly is more reliable than layering pm2 or forever on top.

## Prerequisites

Have Node.js installed and your application working when run manually. If you need Node.js, install it from NodeSource:

```bash
# Install Node.js 20.x from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Verify
node --version
npm --version
```

## Creating a Dedicated Service User

Run your Node.js application as a non-root user with limited permissions:

```bash
# Create a system user (no home directory, no login shell)
sudo useradd --system --no-create-home --shell /bin/false nodeapp

# If your app needs a home directory for config files
sudo useradd --system --create-home --shell /bin/false nodeapp
```

## Setting Up the Application Directory

```bash
# Create the application directory
sudo mkdir -p /opt/myapp

# Copy your application files there
sudo cp -r /home/youruser/myapp/* /opt/myapp/

# Set ownership to the service user
sudo chown -R nodeapp:nodeapp /opt/myapp

# Install production dependencies
sudo -u nodeapp npm ci --production --prefix /opt/myapp
```

Using `npm ci` instead of `npm install` ensures you get exactly what's in `package-lock.json`, avoiding version drift.

## Writing the systemd Unit File

Create the service unit:

```bash
sudo nano /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=My Node.js Application
Documentation=https://github.com/yourorg/myapp
After=network.target

[Service]
# Run as the dedicated service user
User=nodeapp
Group=nodeapp

# Working directory for the application
WorkingDirectory=/opt/myapp

# Path to node - use the full path to avoid PATH issues
ExecStart=/usr/bin/node /opt/myapp/server.js

# Restart policy
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=3

# Environment variables
Environment=NODE_ENV=production
Environment=PORT=3000

# Or load from a file (keeps secrets out of the unit file)
EnvironmentFile=/opt/myapp/.env

# Resource limits
# Limit memory to 512MB
MemoryLimit=512M

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/myapp/logs /tmp

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
```

The `EnvironmentFile` directive loads key=value pairs from a file, keeping secrets like database passwords out of the unit file itself:

```bash
# /opt/myapp/.env
DATABASE_URL=postgresql://user:password@localhost/mydb
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key-here
```

```bash
# Secure the environment file
sudo chown root:nodeapp /opt/myapp/.env
sudo chmod 640 /opt/myapp/.env
```

## Enabling and Starting the Service

```bash
# Reload systemd to pick up the new unit file
sudo systemctl daemon-reload

# Enable the service to start at boot
sudo systemctl enable myapp.service

# Start the service
sudo systemctl start myapp.service

# Check the status
sudo systemctl status myapp.service
```

You should see output like:

```text
myapp.service - My Node.js Application
     Loaded: loaded (/etc/systemd/system/myapp.service; enabled)
     Active: active (running) since Mon 2026-03-02 10:00:00 UTC; 5s ago
   Main PID: 12345 (node)
      Tasks: 11
     Memory: 45.2M
        CPU: 1.234s
```

## Viewing Logs

```bash
# View logs for the service
journalctl -u myapp.service

# Follow logs in real time
journalctl -u myapp.service -f

# Show logs from the last hour
journalctl -u myapp.service --since "1 hour ago"

# Show only errors
journalctl -u myapp.service -p err

# Show logs since last boot
journalctl -u myapp.service -b
```

## Managing the Service

```bash
# Stop the service
sudo systemctl stop myapp.service

# Restart the service (zero-downtime requires a proxy in front)
sudo systemctl restart myapp.service

# Reload after configuration changes without full restart
# (only works if your app supports SIGHUP for config reload)
sudo systemctl reload myapp.service

# Disable autostart
sudo systemctl disable myapp.service
```

## Deploying Updates

When you push new code, the deployment process looks like:

```bash
#!/bin/bash
# deploy.sh

set -e

APP_DIR="/opt/myapp"
APP_USER="nodeapp"

echo "Pulling latest code..."
sudo -u $APP_USER git -C $APP_DIR pull

echo "Installing dependencies..."
sudo -u $APP_USER npm ci --production --prefix $APP_DIR

echo "Restarting service..."
sudo systemctl restart myapp.service

echo "Checking service status..."
sleep 2
sudo systemctl status myapp.service --no-pager
```

## Handling Port 80 Without Running as Root

Node.js should not run as root just to bind to port 80. Instead, use one of these approaches:

**Option 1: Use a reverse proxy (recommended)**

Put nginx in front of your app and have it listen on port 80:

```nginx
# /etc/nginx/sites-available/myapp
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Option 2: Use authbind**

```bash
sudo apt install authbind
sudo touch /etc/authbind/byport/80
sudo chown nodeapp:nodeapp /etc/authbind/byport/80
sudo chmod 500 /etc/authbind/byport/80
```

Then update ExecStart in the unit file:

```ini
ExecStart=/usr/bin/authbind --deep /usr/bin/node /opt/myapp/server.js
```

**Option 3: Set a capability on the node binary**

```bash
# Allow node to bind to privileged ports
sudo setcap cap_net_bind_service=+ep /usr/bin/node
```

This grants the capability to the binary, not the user, so the process still runs as `nodeapp`.

## Monitoring Service Health

Add a simple HTTP health check to your application and use `systemd-notify` if you want notify-style startup:

```javascript
// server.js - basic health endpoint
const http = require('http');

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
        return;
    }
    // ... rest of your app
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
    // Signal readiness if using Type=notify with a notify library
});
```

With systemd managing your Node.js application, you get automatic restarts on crash, centralized logging via journald, clean startup ordering, and no need for additional process managers.
