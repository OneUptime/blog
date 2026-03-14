# How to Use systemd-cron for Modern Cron Replacement on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Cron, Automation, System Administration

Description: Learn how to use systemd-cron on Ubuntu as a modern replacement for traditional cron, leveraging systemd timer syntax and service units for reliable job scheduling.

---

Traditional cron has served Linux systems well for decades, but it has limitations: jobs run in a minimal environment, there's no built-in dependency handling, failed jobs often go unnoticed, and there's no logging integration with journald. systemd-cron bridges the gap between cron syntax and systemd's service and timer infrastructure, running crontab entries as systemd transient units while providing proper logging and monitoring.

## What is systemd-cron?

systemd-cron is a package that reads traditional cron files (`/etc/crontab`, `/etc/cron.d/*`, user crontabs) and executes jobs via systemd transient service units. Each job gets proper systemd supervision with:

- Full journald logging
- Exit code tracking
- CPU and memory accounting
- Resource limits
- systemd dependency handling

## Installation

```bash
# Install systemd-cron
sudo apt install systemd-cron

# This replaces cron daemon with a systemd-based implementation
# It stops and disables cron/cron daemon automatically

# Verify the service is running
systemctl status cron.target
```

After installation, existing crontab entries continue to work because systemd-cron reads the same files.

## How systemd-cron Works

systemd-cron installs:
- A generator at `/usr/lib/systemd/system-generators/systemd-crontab-generator`
- This generator reads all crontab files at boot and creates transient timer units

```bash
# View generated timer units
systemctl list-timers --all | grep cron

# View a specific generated unit
systemctl cat "cron-daily@.service"

# See jobs from /etc/crontab
systemctl list-timers --all | grep crontab
```

## Comparing Traditional Cron vs systemd Timers

For new jobs, you can write native systemd timer units instead of crontab entries. This gives you more control.

| Feature | crontab | systemd timer |
|---------|---------|---------------|
| Logging | syslog/mail | journald |
| Retry on failure | No | Yes (configurable) |
| Dependencies | No | Full systemd dependencies |
| Resource limits | No | Full cgroup integration |
| Distributed locking | No | Requires external tool |
| Monitoring | Limited | systemctl, journalctl |

## Writing Native systemd Timer Units

Instead of adding a crontab entry, create a service + timer pair.

### Example: Daily Database Backup

**Step 1: Create the service unit**

```bash
sudo nano /etc/systemd/system/db-backup.service
```

```ini
[Unit]
Description=Daily PostgreSQL Database Backup
Wants=network-online.target
After=network-online.target postgresql.service

[Service]
Type=oneshot
User=postgres
ExecStart=/usr/local/bin/backup-postgres.sh
StandardOutput=journal
StandardError=journal

# Resource limits
CPUQuota=50%
MemoryMax=512M
Nice=10

# Timeout
TimeoutStartSec=3600

# Notify on failure
OnFailure=service-failure-notify@%n.service
```

**Step 2: Create the backup script**

```bash
sudo nano /usr/local/bin/backup-postgres.sh
```

```bash
#!/bin/bash
# backup-postgres.sh - Daily database backup

BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="production"

mkdir -p "$BACKUP_DIR"

# Perform the backup
pg_dump "$DB_NAME" | gzip > "${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.sql.gz"
```

```bash
sudo chmod +x /usr/local/bin/backup-postgres.sh
```

**Step 3: Create the timer unit**

```bash
sudo nano /etc/systemd/system/db-backup.timer
```

```ini
[Unit]
Description=Daily PostgreSQL Database Backup Timer
Requires=db-backup.service

[Timer]
# Run at 2:00 AM every day
OnCalendar=*-*-* 02:00:00

# Run even if the last run was missed (e.g., system was down)
Persistent=true

# Randomize start by up to 10 minutes (avoids thundering herd)
RandomizedDelaySec=600

[Install]
WantedBy=timers.target
```

**Step 4: Enable and start the timer**

```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable --now db-backup.timer

# Verify the timer is loaded
systemctl status db-backup.timer

# See when it will next run
systemctl list-timers db-backup.timer
```

## Timer Expressions

systemd timer expressions (`OnCalendar=`) are more readable than cron syntax:

```ini
# Every hour
OnCalendar=hourly
OnCalendar=*-*-* *:00:00   # equivalent

# Every day at midnight
OnCalendar=daily
OnCalendar=*-*-* 00:00:00

# Every Monday at 9 AM
OnCalendar=Mon *-*-* 09:00:00

# Every 15 minutes
OnCalendar=*:0/15

# First day of every month at 3:30 AM
OnCalendar=*-*-01 03:30:00

# Every 6 hours
OnCalendar=0/6:00:00

# Weekdays at 8 AM
OnCalendar=Mon..Fri *-*-* 08:00:00

# Quarterly (1st of Jan, Apr, Jul, Oct)
OnCalendar=*-1,4,7,10-1 00:00:00
```

```bash
# Test a timer expression before using it
systemd-analyze calendar "Mon..Fri *-*-* 08:00:00"
# Shows next trigger times
```

## Converting Crontab Entries to systemd Timers

```bash
# Traditional crontab entry:
# 30 2 * * * /usr/local/bin/cleanup.sh

# Equivalent systemd timer:
```

```bash
sudo nano /etc/systemd/system/cleanup.service
```

```ini
[Unit]
Description=Run cleanup script

[Service]
Type=oneshot
ExecStart=/usr/local/bin/cleanup.sh
```

```bash
sudo nano /etc/systemd/system/cleanup.timer
```

```ini
[Unit]
Description=Daily cleanup timer

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

## Monotonic Timers (Interval-Based)

Monotonic timers run relative to system events rather than wall clock time:

```ini
[Timer]
# Run 5 minutes after this unit starts
OnActiveSec=5min

# Run 15 minutes after system boot
OnBootSec=15min

# Run 1 hour after last successful run
OnUnitActiveSec=1h

# Run 30 minutes after last run (even if failed)
OnUnitInactiveSec=30min
```

## Failure Notification Pattern

```bash
# Create a notification service for failures
sudo nano /etc/systemd/system/service-failure-notify@.service
```

```ini
[Unit]
Description=Notify on service failure for %I

[Service]
Type=oneshot
ExecStart=/usr/local/bin/notify-failure.sh %I
```

```bash
sudo nano /usr/local/bin/notify-failure.sh
```

```bash
#!/bin/bash
# notify-failure.sh - Send alert when a service fails

SERVICE="$1"
HOSTNAME=$(hostname)

# Get the last few log lines
LOGS=$(journalctl -u "$SERVICE" -n 10 --no-pager)

# Send notification (adjust to your alerting method)
echo "Service $SERVICE failed on $HOSTNAME

Last log entries:
$LOGS" | mail -s "Service Failed: $SERVICE on $HOSTNAME" admin@example.com
```

```bash
sudo chmod +x /usr/local/bin/notify-failure.sh
sudo systemctl daemon-reload
```

## Viewing Job Output and History

This is where systemd timers shine compared to cron - full logging with timestamps:

```bash
# View all output from the last run of a service
journalctl -u db-backup.service

# Follow output in real time
journalctl -u db-backup.service -f

# View output from the N most recent runs
journalctl -u db-backup.service -n 100

# View only the last run
journalctl -u db-backup.service --since "$(systemctl show db-backup.service --property=ExecMainStartTimestamp | cut -d= -f2)"

# Check exit status of the last run
systemctl show db-backup.service --property=Result
# Result=success or Result=failed or Result=exit-code

# View all timer runs
journalctl -u db-backup.timer
```

## Manually Triggering a Timer's Service

```bash
# Run the service immediately without waiting for the timer
sudo systemctl start db-backup.service

# Check status immediately after
systemctl status db-backup.service

# View output
journalctl -u db-backup.service -n 50
```

## Migrating Existing Crontabs

If you're running systemd-cron (which reads crontabs), or want to convert:

```bash
# View current crontabs
crontab -l
sudo crontab -l
sudo cat /etc/crontab
sudo ls /etc/cron.d/

# For each job, decide: keep in crontab (systemd-cron handles it)
# or convert to native timer for better control

# To see how systemd-cron has already converted crontab entries
systemctl list-timers | grep cron
```

systemd timers are a strict improvement over cron for scheduled tasks. The learning curve is the slightly more verbose unit file format, but the payoff is proper logging, monitoring, resource control, and dependency handling. For new jobs, write service+timer pairs. For existing cron jobs, systemd-cron provides a transparent bridge that requires no changes to your crontab files.
