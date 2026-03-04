# How to Set Up PM2 Process Manager for Node.js on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Node.js, JavaScript, PM2, Linux

Description: Learn how to set Up PM2 Process Manager for Node.js on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

PM2 is a production process manager for Node.js applications that provides automatic restarts, load balancing, log management, and monitoring. It is the most popular tool for running Node.js in production.

## Prerequisites

- RHEL 9 with Node.js installed
- A Node.js application

## Step 1: Install PM2

```bash
npm install -g pm2
```

## Step 2: Start an Application

```bash
pm2 start app.js --name myapp
```

With additional options:

```bash
pm2 start app.js --name myapp --instances max --exec-mode cluster
```

## Step 3: Common PM2 Commands

```bash
pm2 list                  # List all processes
pm2 status                # Show process status
pm2 logs                  # Stream logs
pm2 logs myapp            # Stream specific app logs
pm2 monit                 # Terminal-based monitoring
pm2 stop myapp            # Stop an app
pm2 restart myapp         # Restart an app
pm2 delete myapp          # Remove from PM2
```

## Step 4: Ecosystem File

Create a configuration file for complex setups:

```bash
vi ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'myapp',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/pm2/myapp-error.log',
    out_file: '/var/log/pm2/myapp-out.log'
  }]
};
```

```bash
pm2 start ecosystem.config.js
```

## Step 5: Auto-Start on Boot

```bash
pm2 startup systemd
# Run the command PM2 outputs
pm2 save
```

This creates a systemd service that restores PM2 processes on reboot.

## Step 6: Log Rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10
```

## Step 7: Zero-Downtime Reload

```bash
pm2 reload myapp
```

In cluster mode, PM2 restarts instances one by one to maintain availability.

## Conclusion

PM2 provides comprehensive process management for Node.js applications on RHEL 9, including cluster mode for multi-core utilization, automatic restarts, log management, and systemd integration for boot persistence.
