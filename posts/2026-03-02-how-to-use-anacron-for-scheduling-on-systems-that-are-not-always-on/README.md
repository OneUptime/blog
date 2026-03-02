# How to Use anacron for Scheduling on Systems That Are Not Always On

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Anacron, Scheduling

Description: Learn how anacron solves the problem of missed cron jobs on laptops and servers that are not always running, ensuring periodic tasks execute even after downtime.

---

Regular cron has a significant limitation: if the system is powered off or sleeping when a job is scheduled, the job simply does not run. For servers that reboot or laptops that get closed, this means your "daily" backup or "weekly" cleanup might never actually happen on schedule. anacron was created specifically to solve this problem.

## How anacron Works

Unlike cron, which runs jobs at specific clock times, anacron runs jobs based on how long it has been since they last ran. If you configure a job to run daily and the system was off for three days, anacron will run that job shortly after the next boot.

anacron checks its timestamp files to see when each job last ran. If the elapsed time exceeds the configured period, the job runs. This makes it ideal for:

- Laptops that sleep or power off
- Servers that have maintenance windows with reboots
- Systems where "run once per day" is more important than "run at exactly 3 AM"

## How anacron is Integrated on Ubuntu

On Ubuntu, anacron is already installed and integrated with the standard cron system. The system cron directories (`/etc/cron.daily`, `/etc/cron.weekly`, `/etc/cron.monthly`) are typically managed by anacron rather than cron directly.

Check the installation:

```bash
# Verify anacron is installed
which anacron
dpkg -l anacron

# Install if missing
sudo apt update
sudo apt install anacron
```

## The anacron Configuration File

anacron is configured in `/etc/anacrontab`:

```bash
cat /etc/anacrontab
```

The default content looks like:

```
# /etc/anacrontab: configuration file for anacron

# See anacron(8) and anacrontab(5) for details.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
HOME=/root
LOGNAME=root

# These replace cron's entries in /etc/crontab:
1       5       cron.daily    run-parts --report /etc/cron.daily
7       10      cron.weekly   run-parts --report /etc/cron.weekly
@monthly 15     cron.monthly  run-parts --report /etc/cron.monthly
```

The format of each job line:

```
period  delay  job-identifier  command
```

- **period**: How many days between runs (or `@monthly` for monthly)
- **delay**: How many minutes to wait after anacron starts before running this job (staggers jobs to avoid overloading the system at boot)
- **job-identifier**: A unique name, used for the timestamp file
- **command**: The command to run

## Adding Your Own anacron Jobs

Edit `/etc/anacrontab` to add jobs:

```bash
sudo nano /etc/anacrontab
```

```
# Run a backup every day, with a 10-minute delay after boot
1       10      daily-backup    /usr/local/bin/backup.sh

# Run database optimization weekly, with a 20-minute delay
7       20      weekly-db-opt   /usr/local/bin/optimize-db.sh

# Run monthly report generation, with a 30-minute delay
30      30      monthly-report  /usr/local/bin/generate-report.sh
```

The delay is important for systems with anacron running at boot - staggering jobs prevents multiple resource-intensive tasks from starting simultaneously.

## Understanding Timestamp Files

anacron tracks when jobs last ran using timestamp files:

```bash
# Timestamp files location
ls /var/spool/anacron/

# View a timestamp file (contains the date of last run)
cat /var/spool/anacron/cron.daily

# Example output:
# 20260302
```

The date format is YYYYMMDD. anacron compares this to today's date to determine if the job needs to run.

## Running anacron Manually

```bash
# Run anacron and execute all overdue jobs
sudo anacron -f

# Run a specific job (by identifier)
sudo anacron -f -t /etc/anacrontab cron.daily

# Test mode - show what would run without actually running it
sudo anacron -n -s

# Run all jobs immediately, ignoring timestamps
sudo anacron -f -s -n

# Show what anacron would do (verbose)
sudo anacron -d -s
```

Flags:
- `-f`: Force execution even if the job ran recently
- `-n`: No delays (ignores the delay field)
- `-s`: Serialize jobs (run one at a time)
- `-d`: Debug mode (verbose output)

## Checking When Jobs Last Ran

```bash
# Check all anacron timestamps
for f in /var/spool/anacron/*; do
    echo "$(basename $f): $(cat $f)"
done

# You can also reset a timestamp to force a job to run next time
echo "19700101" | sudo tee /var/spool/anacron/cron.daily
# Next time anacron runs, it will execute the daily jobs
```

## Environment Variables in anacrontab

Unlike user crontabs, `/etc/anacrontab` runs as root by default. Set environment variables at the top:

```bash
sudo tee -a /etc/anacrontab << 'EOF'

# Custom environment settings
MAILTO=admin@example.com
HOME=/root
EOF
```

All jobs in the file inherit these variables.

## Practical Examples

### Daily Backup with Anacron

```bash
sudo tee /usr/local/bin/daily-backup.sh << 'EOF'
#!/bin/bash
# Daily backup script managed by anacron

BACKUP_DIR="/var/backups/myapp"
DATE=$(date +%Y-%m-%d)
LOG="/var/log/backup.log"

echo "[$(date)] Starting daily backup" >> "$LOG"

# Create backup
tar -czf "${BACKUP_DIR}/backup-${DATE}.tar.gz" /var/lib/myapp/ >> "$LOG" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed successfully" >> "$LOG"
else
    echo "[$(date)] Backup FAILED" >> "$LOG"
    exit 1
fi

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +30 -delete

echo "[$(date)] Old backups cleaned up" >> "$LOG"
EOF

chmod +x /usr/local/bin/daily-backup.sh

# Add to anacrontab
echo "1  15  myapp-backup  /usr/local/bin/daily-backup.sh" | sudo tee -a /etc/anacrontab
```

### Weekly System Cleanup

```bash
sudo tee /usr/local/bin/weekly-cleanup.sh << 'EOF'
#!/bin/bash
# Weekly cleanup tasks

# Clean package cache
apt-get autoremove -y
apt-get autoclean

# Clean old logs
find /var/log -name "*.log.gz" -mtime +30 -delete

# Clean /tmp of old files
find /tmp -mtime +7 -delete 2>/dev/null

echo "Weekly cleanup completed at $(date)"
EOF

chmod +x /usr/local/bin/weekly-cleanup.sh

# Add to anacrontab
echo "7   30  weekly-cleanup  /usr/local/bin/weekly-cleanup.sh" | sudo tee -a /etc/anacrontab
```

## Combining anacron with cron

On Ubuntu, cron calls anacron. The typical setup is:

1. `cron` runs at specific times (via `/etc/crontab`)
2. `/etc/crontab` has an entry like `07 6 * * * root anacron -s`
3. This means anacron runs daily at 6:07 AM, checking if any periodic jobs are overdue
4. If the machine was off at 6:07 AM, anacron runs when the machine next boots

This hybrid approach gives you:
- Reliable scheduling for machines that are always on (jobs run at the scheduled time)
- Catch-up execution for machines that were off (anacron runs missed jobs on next boot)

## When to Use anacron vs cron

**Use anacron when:**
- The machine may be off when the job would normally run
- The job needs to run "at least once per day/week/month" rather than "at exactly this time"
- You want automatic retry on next boot for missed jobs

**Use cron when:**
- The job must run at a specific time (3 AM nightly backup)
- The machine is always on
- You need sub-daily intervals (every 5 minutes)
- You need per-user scheduling

**Note:** anacron only supports daily or longer intervals. It cannot schedule sub-daily jobs.

## Logging anacron Activity

anacron sends output to syslog. Check its activity:

```bash
# View anacron messages in syslog
sudo grep anacron /var/log/syslog | tail -30

# Using journalctl
sudo journalctl | grep anacron | tail -30

# Add logging to your anacron jobs directly
echo "7   30  weekly-cleanup  /usr/local/bin/weekly-cleanup.sh >> /var/log/weekly-cleanup.log 2>&1" | sudo tee -a /etc/anacrontab
```

## Summary

anacron is the right tool when cron's "run at a specific time" model does not fit. For laptops, desktop systems, and servers with planned downtime, anacron ensures periodic tasks actually happen rather than being silently skipped. The configuration is in `/etc/anacrontab`, the format is simple (period in days, delay in minutes, identifier, command), and timestamp files in `/var/spool/anacron/` track when jobs last ran. On Ubuntu, the system's daily, weekly, and monthly cron directories are already managed through anacron, so the infrastructure is already in place.
