# How to Understand /etc/crontab vs User Crontabs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Scheduling, Linux, System Administration

Description: Understand the differences between /etc/crontab, /etc/cron.d/, and user crontabs on Ubuntu, with practical examples for managing scheduled tasks effectively.

---

Cron is the standard task scheduler on Ubuntu, and it's used for everything from rotating log files to running database backups. But Ubuntu actually has multiple places where cron jobs can be defined, and which one you use depends on whether the job needs to run as a specific user, whether it's a system-wide task, and how you want to organize it. Understanding the differences between `/etc/crontab`, `/etc/cron.d/`, and user crontabs prevents common pitfalls like jobs running as the wrong user or conflicting with system jobs.

## The Different Cron Locations on Ubuntu

Ubuntu has several places cron reads from:

| Location | Owned By | User Field Required | Purpose |
|---|---|---|---|
| `/etc/crontab` | root | Yes | System-wide scheduled tasks |
| `/etc/cron.d/` | root | Yes | Drop-in system cron files |
| `/var/spool/cron/crontabs/` | Individual users | No | User crontabs |
| `/etc/cron.hourly/`, `/etc/cron.daily/`, `/etc/cron.weekly/`, `/etc/cron.monthly/` | root | N/A | Script directories |

## /etc/crontab - The System Crontab

The `/etc/crontab` file is the system-wide crontab. Unlike user crontabs, it has an extra field specifying which user the command runs as.

```bash
cat /etc/crontab
```

```text
# /etc/crontab: system-wide crontab
# Unlike any other crontab you don't have to run the `crontab'
# command to install the new version when you edit this file
# and files in /etc/cron.d. These files also have a username
# field that none of the other crontabs do.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Example of job definition:
# .---------------- minute (0 - 59)
# |  .------------- hour (0 - 23)
# |  |  .---------- day of month (1 - 31)
# |  |  |  .------- month (1 - 12) OR jan,feb,mar,apr ...
# |  |  |  |  .---- day of week (0 - 7) (Sunday=0 or 7) OR sun,mon,tue,wed,thu,fri,sat
# |  |  |  |  |
# *  *  *  *  * user-name command to be executed
17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly
25 6    * * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6    * * 7   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6    1 * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
```

The format has six time/date fields plus the username before the command:

```text
minute  hour  day-of-month  month  day-of-week  username  command
```

### Adding a Job to /etc/crontab

```bash
sudo nano /etc/crontab
```

```text
# Run database backup as the postgres user every day at 2am
0 2 * * * postgres /usr/local/bin/pg_backup.sh

# Run a system cleanup script as root every Sunday at 3am
0 3 * * 0 root /usr/local/sbin/weekly-cleanup.sh
```

Changes to `/etc/crontab` take effect immediately - you do not need to reload the cron daemon.

## /etc/cron.d/ - Drop-in System Cron Files

The `/etc/cron.d/` directory works exactly like `/etc/crontab` in terms of syntax (username field required), but lets different packages and administrators add cron jobs without touching the main file. This is the preferred approach for system services.

```bash
# List existing cron.d files
ls /etc/cron.d/

# Example output might show
# anacron  e2scrub_all  popularity-contest
```

Creating a file in `/etc/cron.d/`:

```bash
sudo nano /etc/cron.d/myapp-maintenance
```

```text
# Cron job for myapp maintenance tasks
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Clean up old session files every hour
0 * * * * www-data /var/www/myapp/bin/cleanup-sessions.php

# Generate daily reports at midnight
0 0 * * * myapp /opt/myapp/scripts/generate-report.sh
```

File naming matters: files in `/etc/cron.d/` must not have a dot or extension in their name (cron ignores files with dots), and they should be owned by root with restrictive permissions:

```bash
# Set proper ownership and permissions
sudo chown root:root /etc/cron.d/myapp-maintenance
sudo chmod 644 /etc/cron.d/myapp-maintenance
```

## User Crontabs

Every user can have their own crontab. User crontabs are stored in `/var/spool/cron/crontabs/` and are managed with the `crontab` command. The format is the same as `/etc/crontab` except there is no username field - the job runs as the user who owns the crontab.

### Managing User Crontabs

```bash
# Edit your own crontab
crontab -e

# List your current crontab
crontab -l

# Remove your crontab entirely
crontab -r

# Edit another user's crontab (requires root)
sudo crontab -u username -e

# List another user's crontab
sudo crontab -u username -l
```

### User Crontab Format

```text
# minute  hour  day-of-month  month  day-of-week  command

# Backup home directory every day at 1am
0 1 * * * /home/alice/scripts/backup-home.sh

# Check disk space every 15 minutes and send alert if low
*/15 * * * * /home/alice/scripts/check-disk.sh | mail -s "Disk Alert" alice@example.com

# Run a Python script every weekday at 8am
0 8 * * 1-5 /usr/bin/python3 /home/alice/daily-report.py
```

### Common User Crontab Pitfalls

The most common problem with user crontabs is environment differences. Cron runs jobs with a minimal environment - your shell aliases, PATH modifications from `.bashrc`, and other customizations don't apply. Always use absolute paths in cron jobs:

```bash
# Wrong - relies on PATH being set
0 * * * * python3 /home/alice/script.py

# Right - explicit Python path
0 * * * * /usr/bin/python3 /home/alice/script.py

# Also right - set PATH explicitly in the crontab
PATH=/usr/local/bin:/usr/bin:/bin
0 * * * * python3 /home/alice/script.py
```

## /etc/cron.daily/, cron.weekly/, cron.hourly/, cron.monthly/

These directories contain scripts (not crontab-format files) that get executed at the named intervals. Drop an executable script into the appropriate directory and cron runs it automatically.

```bash
# List daily cron scripts
ls /etc/cron.daily/

# Create a daily maintenance script
sudo nano /etc/cron.daily/app-maintenance
```

```bash
#!/bin/bash
# /etc/cron.daily/app-maintenance
# Runs as root via run-parts

# Clean temporary files older than 7 days
find /tmp -type f -mtime +7 -delete

# Rotate application logs
/usr/local/bin/rotate-app-logs.sh

echo "Daily maintenance completed at $(date)"
```

```bash
# Make it executable
sudo chmod +x /etc/cron.daily/app-maintenance

# Test that run-parts will pick it up
sudo run-parts --test /etc/cron.daily
```

Scripts in these directories must be executable and must not have file extensions (`.sh`, `.py`, etc.) - `run-parts` ignores files with dots in their names.

## Choosing the Right Location

Use this as a guide for where to put your cron jobs:

- **System service or daemon maintenance** - Use `/etc/cron.d/` with a descriptive filename. This keeps package-related jobs organized and easy to remove if the package is uninstalled.
- **System-wide tasks managed by root** - Either `/etc/crontab` for a few jobs, or `/etc/cron.d/` to keep things organized.
- **Simple recurring system tasks** - Drop scripts into `/etc/cron.daily/` etc. for zero-configuration scheduling.
- **User-specific tasks** - User crontab via `crontab -e`. The job runs as that user with their file permissions.

## Monitoring and Troubleshooting

### Checking If Jobs Are Running

```bash
# Watch syslog for cron activity
sudo grep CRON /var/log/syslog | tail -20

# Real-time cron log monitoring
sudo tail -f /var/log/syslog | grep CRON
```

### Capturing Cron Job Output

By default, cron emails job output to the user. On servers without mail configured, output is lost. Redirect it explicitly:

```bash
# Redirect both stdout and stderr to a log file
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# Discard all output (only do this for well-tested jobs)
0 2 * * * /usr/local/bin/backup.sh > /dev/null 2>&1
```

### Testing Cron Job Environment

When a job works on the command line but fails in cron, the environment difference is almost always the cause:

```bash
# Create a script to dump the cron environment
cat > /tmp/cron-env-test.sh << 'EOF'
#!/bin/bash
env > /tmp/cron-environment.txt
date >> /tmp/cron-environment.txt
EOF
chmod +x /tmp/cron-env-test.sh

# Add to crontab temporarily
# * * * * * /tmp/cron-env-test.sh
```

Then compare `/tmp/cron-environment.txt` with the output of `env` in your normal shell to spot differences.

Understanding these different cron mechanisms and their appropriate use cases saves a lot of time debugging why jobs run at the wrong time, as the wrong user, or not at all.
