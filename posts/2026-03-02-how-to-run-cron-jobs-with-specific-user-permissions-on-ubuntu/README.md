# How to Run Cron Jobs with Specific User Permissions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, User Permissions, Security

Description: Learn how to run cron jobs as specific users on Ubuntu using system crontabs, sudo, and service account configuration for secure, properly permissioned scheduled tasks.

---

Running cron jobs with appropriate user permissions is important both for security and for ensuring the job can access the files and resources it needs. A backup job that runs as root when it only needs read access to user files is a security issue. A web deployment job that needs to write to the web root but runs as a limited user will fail. This post covers the options for controlling which user a cron job runs as.

## User Crontabs vs System Crontabs

There are two fundamentally different ways to schedule cron jobs:

**User crontabs** (`crontab -e`): Jobs always run as the user who owns the crontab. You cannot specify a different user in the job line itself.

**System crontabs** (`/etc/crontab` and `/etc/cron.d/*`): These have an extra field for the username. The job runs as that specified user, regardless of who created the crontab file.

## Running Jobs as a Specific User in System Crontab

The system crontab format adds a user field:

```text
# /etc/crontab format:
# Minute Hour Day Month Weekday User Command

# Run backup as the 'backup' user
0 2 * * * backup /usr/local/bin/backup.sh

# Run web cleanup as www-data
0 3 * * * www-data /var/www/html/cleanup.sh

# Run database maintenance as postgres
30 1 * * * postgres /usr/local/bin/db-maintenance.sh

# Run system cleanup as root
0 4 * * * root /usr/local/bin/system-cleanup.sh
```

Files in `/etc/cron.d/` use the same format:

```bash
sudo tee /etc/cron.d/myapp << 'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=admin@example.com

# Web application jobs
*/5 * * * * www-data /var/www/html/queue-worker.php
0 2 * * * www-data /var/www/html/daily-cleanup.php

# Database jobs
0 3 * * * postgres /usr/local/bin/db-backup.sh

# System maintenance as root
0 4 * * * root /usr/local/bin/system-maintenance.sh
EOF
```

## Creating a Dedicated Service Account for Cron Jobs

For application-specific jobs, create a dedicated user:

```bash
# Create a system user for the application (no login shell, no home directory creation)
sudo useradd -r -s /sbin/nologin -d /var/lib/myapp myapp

# Create the home/data directory
sudo mkdir -p /var/lib/myapp
sudo chown myapp:myapp /var/lib/myapp

# Create log directory
sudo mkdir -p /var/log/myapp
sudo chown myapp:myapp /var/log/myapp
```

Now the cron job in `/etc/cron.d/myapp` can safely run as `myapp` with access only to the files it needs:

```bash
sudo tee /etc/cron.d/myapp-jobs << 'EOF'
0 2 * * * myapp /usr/local/bin/myapp-backup.sh
*/10 * * * * myapp /usr/local/bin/myapp-healthcheck.sh
EOF
```

## Using sudo for Privilege Escalation

Sometimes a low-privilege user needs to run a specific command as root or as another user. Configure this through sudo's `NOPASSWD` option:

```bash
# Edit sudoers (always use visudo, never edit /etc/sudoers directly)
sudo visudo -f /etc/sudoers.d/cron-permissions
```

Add rules like:

```text
# Allow www-data to restart nginx without a password
www-data ALL=(root) NOPASSWD: /usr/sbin/service nginx restart
www-data ALL=(root) NOPASSWD: /usr/sbin/service php8.1-fpm restart

# Allow myapp user to clear specific system cache
myapp ALL=(root) NOPASSWD: /usr/bin/sync, /proc/sys/vm/drop_caches
```

In the cron job:

```bash
# /usr/local/bin/deploy.sh (runs as www-data)
#!/bin/bash

# Pull the latest code
git -C /var/www/html pull origin main

# Restart services with sudo
sudo service nginx restart
sudo service php8.1-fpm restart

echo "Deployment completed at $(date)"
```

## Running a Cron Job from a User Account as Another User

If you manage cron through a personal crontab but need to run a job as a different user:

```bash
crontab -e
```

```bash
# Run script as www-data (requires appropriate sudo configuration)
0 2 * * * sudo -u www-data /var/www/html/cleanup.sh

# Run as postgres with specific environment
0 3 * * * sudo -u postgres /usr/local/bin/db-vacuum.sh
```

Add the necessary sudo rule:

```bash
sudo visudo -f /etc/sudoers.d/myuser-cron
```

```text
# Allow myuser to run specific scripts as other users without password
myuser ALL=(www-data) NOPASSWD: /var/www/html/cleanup.sh
myuser ALL=(postgres) NOPASSWD: /usr/local/bin/db-vacuum.sh
```

## Principle of Least Privilege in Cron Jobs

Each cron job should run as the user with the minimum permissions needed:

```bash
# Bad: running everything as root
0 2 * * * root /usr/local/bin/sync-uploads.sh
0 3 * * * root /usr/local/bin/generate-reports.sh
0 4 * * * root /usr/local/bin/cleanup-sessions.sh

# Better: appropriate users for each task
# sync-uploads needs to read user upload dirs and write to processed dir
0 2 * * * www-data /usr/local/bin/sync-uploads.sh

# generate-reports only needs to read database and write to reports dir
0 3 * * * reports /usr/local/bin/generate-reports.sh

# cleanup-sessions needs to write to session storage
0 4 * * * myapp /usr/local/bin/cleanup-sessions.sh
```

To set up this correctly, ensure each script is owned by or at least readable by the user it will run as:

```bash
# Set appropriate ownership and permissions
sudo chown root:root /usr/local/bin/sync-uploads.sh
sudo chmod 755 /usr/local/bin/sync-uploads.sh

# Verify the www-data user can execute it
sudo -u www-data /usr/local/bin/sync-uploads.sh --dry-run
```

## Debugging Permission Issues

When a cron job fails due to permission problems, replicate the exact environment:

```bash
# Test the command as the cron user
sudo -u www-data /usr/local/bin/sync-uploads.sh

# Test with minimal environment (like cron provides)
sudo -u www-data env -i HOME=/var/www SHELL=/bin/sh PATH=/usr/bin:/bin \
    /usr/local/bin/sync-uploads.sh

# Check if the script can read the files it needs
sudo -u www-data ls -la /var/uploads/
sudo -u www-data cat /etc/myapp/config.yaml
```

Common permission fixes:

```bash
# Script not executable
sudo chmod +x /usr/local/bin/myscript.sh

# Script owned by wrong user
sudo chown root:root /usr/local/bin/myscript.sh

# Directory not accessible by cron user
sudo chown www-data:www-data /var/www/html/cache/
sudo chmod 755 /var/www/html/cache/

# Config file not readable
sudo chmod 640 /etc/myapp/config.yaml
sudo chown root:myapp /etc/myapp/config.yaml
```

## Working with setuid and setgid for Cron

For scripts that always need to run as a specific user regardless of who calls them:

```bash
# Set the setuid bit (run as the file owner regardless of who executes it)
# Note: this does not work for shell scripts on Linux, only compiled binaries
sudo chown root /usr/local/bin/privileged-task
sudo chmod 4755 /usr/local/bin/privileged-task

# A safer alternative: use sudo with NOPASSWD
```

For shell scripts needing elevated permissions, sudo with NOPASSWD is more appropriate than setuid.

## Logging Which User Jobs Run As

Add identity information to your cron job logs to make auditing easier:

```bash
#!/bin/bash
# Add user context to all log entries

LOG=/var/log/myapp-cron.log
SCRIPT_USER=$(id -un)
SCRIPT_UID=$(id -u)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting job - User: ${SCRIPT_USER} (UID: ${SCRIPT_UID})" >> "$LOG"

# Run the actual task
/usr/local/bin/actual-task.sh >> "$LOG" 2>&1
EXIT_CODE=$?

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Job completed - Exit: ${EXIT_CODE}" >> "$LOG"
exit $EXIT_CODE
```

## Using systemd Timers for Better User Control

systemd timers offer a cleaner alternative for user management:

```ini
# /etc/systemd/system/myapp-backup.service
[Unit]
Description=MyApp Backup

[Service]
Type=oneshot

# Run as this user
User=myapp
Group=myapp

# Supplementary groups if needed
SupplementaryGroups=backup

ExecStart=/usr/local/bin/backup.sh
```

systemd handles user switching without requiring sudo configuration, making it slightly simpler for complex permission scenarios.

## Summary

Controlling which user a cron job runs as is primarily done through system crontabs (`/etc/crontab` and `/etc/cron.d/*`), where the user field in each job line specifies the runtime user. For user crontabs, jobs always run as the crontab owner - use sudo with NOPASSWD rules if elevation is needed. Create dedicated service accounts for application jobs rather than running everything as root or www-data. Always test your script manually as the intended cron user using `sudo -u username script.sh` before relying on the scheduled job.
