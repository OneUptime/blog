# How to Set Up PM2 Process Manager for Node.js on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PM2, Node.js, Process Manager, Deployments

Description: Learn how to install and configure PM2 on RHEL to manage Node.js applications with automatic restarts, clustering, and log management.

---

PM2 is a production process manager for Node.js applications. It provides process monitoring, automatic restarts, load balancing through clustering, and log management.

## Installing PM2

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

## Starting an Application

```bash
# Start a Node.js application
pm2 start app.js --name myapp

# Start with specific options
pm2 start app.js \
  --name myapp \
  --instances 4 \
  --max-memory-restart 500M \
  --log /var/log/myapp/app.log
```

## Cluster Mode

PM2 can run multiple instances of your application for load balancing:

```bash
# Start in cluster mode using all available CPU cores
pm2 start app.js --name myapp -i max

# Start with a specific number of instances
pm2 start app.js --name myapp -i 4

# Scale up or down
pm2 scale myapp 8
pm2 scale myapp +2
```

## Using an Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'myapp',
    script: './app.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/myapp/error.log',
    out_file: '/var/log/myapp/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

```bash
# Start using the ecosystem file
pm2 start ecosystem.config.js

# Reload with zero downtime
pm2 reload ecosystem.config.js
```

## Auto-Start on Boot

```bash
# Generate the startup script for systemd
pm2 startup systemd

# This outputs a command to run with sudo, e.g.:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u myuser --hp /home/myuser

# Save the current process list
pm2 save
```

## Managing Processes

```bash
# List all processes
pm2 list

# Monitor processes in real-time
pm2 monit

# View logs
pm2 logs myapp
pm2 logs myapp --lines 100

# Restart / stop / delete
pm2 restart myapp
pm2 stop myapp
pm2 delete myapp

# Graceful reload (zero downtime for cluster mode)
pm2 reload myapp
```

## Log Management

```bash
# Install the log rotation module
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
```

## Health Monitoring

```bash
# View detailed process info
pm2 show myapp

# Get JSON output for automation
pm2 jlist
```

PM2's cluster mode uses Node.js built-in cluster module to distribute connections across worker processes. Use `pm2 reload` instead of `pm2 restart` in production for zero-downtime deployments.
