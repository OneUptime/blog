# How to Use systemd Timers Instead of Cron on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, systemd, Timers, Scheduling, Cron Alternative, Tutorial

Description: Complete guide to using systemd timers for task scheduling on Ubuntu.

---

Task scheduling is essential for system administration, from running backups to cleaning up temporary files. While cron has been the traditional solution for decades, systemd timers offer a more powerful and flexible alternative. This comprehensive guide will walk you through using systemd timers on Ubuntu, helping you understand when and why to choose them over cron.

## Understanding systemd Timers vs Cron

Before diving into implementation, let's understand the key differences between these two scheduling mechanisms.

### What is Cron?

Cron is the traditional Unix job scheduler that has been around since the 1970s. It uses a simple configuration file (crontab) to schedule recurring tasks based on time expressions.

### What are systemd Timers?

systemd timers are unit files that control when and how systemd service units are activated. They provide more granular control over task scheduling and integrate seamlessly with the systemd ecosystem.

### Key Advantages of systemd Timers

| Feature | Cron | systemd Timers |
|---------|------|----------------|
| Logging | Basic (requires manual setup) | Built-in journald integration |
| Dependencies | Not supported | Full dependency management |
| Resource Control | Limited | cgroups integration |
| Missed Jobs | May be skipped | Persistent option available |
| Calendar Events | Basic syntax | Flexible OnCalendar syntax |
| Randomized Delays | Not available | Built-in support |
| System Integration | Standalone | Full systemd ecosystem |

### When to Use systemd Timers

- When you need detailed logging and monitoring
- When tasks have dependencies on other services
- When you need resource limiting (CPU, memory)
- When you want missed jobs to run after system boot
- When you need randomized execution times to prevent thundering herd

### When to Stick with Cron

- Simple, standalone scripts on legacy systems
- Quick one-off scheduled tasks
- Systems without systemd
- When portability across different Unix systems is required

## Timer Unit File Structure

A systemd timer requires two unit files: a `.timer` file that defines the schedule and a `.service` file that defines the task to execute.

### Basic Timer Unit Structure

Timer files are stored in `/etc/systemd/system/` for system-wide timers or `~/.config/systemd/user/` for user-specific timers.

```ini
# /etc/systemd/system/my-task.timer
# Timer unit file structure breakdown

[Unit]
# Description provides human-readable information about this timer
Description=Run my task periodically

# Documentation links for reference (optional but recommended)
Documentation=https://example.com/docs

# Requires ensures the listed units are started alongside this timer
# Requires=network-online.target

# After specifies ordering - this timer starts after the listed units
# After=network-online.target

[Timer]
# OnCalendar defines when the timer triggers (realtime/wallclock timer)
# This example runs daily at 3:00 AM
OnCalendar=*-*-* 03:00:00

# AccuracySec defines the accuracy of the timer (default is 1 minute)
# Lower values increase precision but may impact system resources
AccuracySec=1min

# Persistent=true means if the timer was missed (system was off),
# it will trigger immediately when the system starts
Persistent=true

# RandomizedDelaySec adds random delay to prevent multiple timers
# from triggering at exactly the same time
RandomizedDelaySec=5min

# Unit specifies which service to activate (defaults to same name as timer)
# Unit=my-task.service

[Install]
# WantedBy determines which target enables this timer
# timers.target is standard for timer units
WantedBy=timers.target
```

### Timer Section Options Explained

| Option | Description |
|--------|-------------|
| `OnCalendar` | Realtime (wallclock) timer specification |
| `OnBootSec` | Time after system boot to trigger |
| `OnStartupSec` | Time after systemd started |
| `OnUnitActiveSec` | Time after the unit was last activated |
| `OnUnitInactiveSec` | Time after the unit became inactive |
| `AccuracySec` | Timer accuracy (affects power consumption) |
| `RandomizedDelaySec` | Random delay added to scheduled time |
| `Persistent` | Catch up on missed runs |
| `Unit` | Service unit to activate |

## Service Unit for Timer

Every timer needs an associated service unit that defines the actual task to execute.

### Basic Service Unit Structure

```ini
# /etc/systemd/system/my-task.service
# Service unit that will be triggered by the timer

[Unit]
# Description should clearly explain what this service does
Description=Execute my scheduled task

# Wants specifies units that should be started alongside this one
# but are not strictly required
Wants=network-online.target

# After ensures this service starts after listed units
# Important for tasks that need network or database access
After=network-online.target

[Service]
# Type defines how systemd determines if the service started successfully
# oneshot: systemd waits for the process to exit
# simple: systemd considers it started immediately (default)
# forking: for traditional daemons that fork
Type=oneshot

# User specifies which user account runs this service
# Always use least-privilege principle
User=root

# Group specifies the group context
Group=root

# ExecStart is the command/script to execute
# Use absolute paths for reliability
ExecStart=/usr/local/bin/my-task.sh

# StandardOutput controls where stdout goes
# journal: sends to systemd journal (recommended)
# file:/path/to/file: sends to specific file
StandardOutput=journal

# StandardError controls where stderr goes
StandardError=journal

# Nice adjusts process priority (-20 to 19, lower = higher priority)
# Nice=10

# IOSchedulingClass sets I/O scheduling (0=none, 1=realtime, 2=best-effort, 3=idle)
# IOSchedulingClass=3

# MemoryMax limits memory usage (useful for preventing runaway processes)
# MemoryMax=512M

# CPUQuota limits CPU usage percentage
# CPUQuota=50%

# TimeoutStartSec sets maximum time for service to start
# Useful for long-running tasks
TimeoutStartSec=3600

[Install]
# WantedBy is not typically needed for timer-activated services
# as the timer handles the scheduling
# WantedBy=multi-user.target
```

### Service Types for Timers

For scheduled tasks, the most common service types are:

- **oneshot**: Best for scripts that run and exit. systemd waits for completion.
- **simple**: For commands that stay running or when you don't need to track completion.
- **exec**: Similar to simple but considers the service started only after the binary is executed.

## OnCalendar Syntax

The `OnCalendar` directive uses a powerful and flexible syntax for defining schedules.

### Basic Format

```
DayOfWeek Year-Month-Day Hour:Minute:Second
```

### Common OnCalendar Examples

```ini
# Every minute
OnCalendar=*-*-* *:*:00

# Every hour at minute 0
OnCalendar=*-*-* *:00:00

# Every day at midnight
OnCalendar=*-*-* 00:00:00
# Or simply:
OnCalendar=daily

# Every day at 3:30 AM
OnCalendar=*-*-* 03:30:00

# Every Monday at 9:00 AM
OnCalendar=Mon *-*-* 09:00:00

# First day of every month at noon
OnCalendar=*-*-01 12:00:00

# Every 15 minutes
OnCalendar=*-*-* *:00,15,30,45:00

# Every weekday at 6:00 PM
OnCalendar=Mon..Fri *-*-* 18:00:00

# Twice a day at 8 AM and 8 PM
OnCalendar=*-*-* 08,20:00:00

# Every quarter (Jan, Apr, Jul, Oct) on the 1st at midnight
OnCalendar=*-01,04,07,10-01 00:00:00

# Last day of every month (requires calculation)
# Note: systemd doesn't support "last day" directly
# Use a script that checks the date instead

# Every Saturday and Sunday at 10 AM
OnCalendar=Sat,Sun *-*-* 10:00:00

# Specific date: January 15, 2026 at 3 PM
OnCalendar=2026-01-15 15:00:00
```

### Shorthand Notations

systemd provides convenient shorthand notations:

```ini
# minutely - Every minute
OnCalendar=minutely

# hourly - Every hour at minute 0
OnCalendar=hourly

# daily - Every day at midnight
OnCalendar=daily

# weekly - Every Monday at midnight
OnCalendar=weekly

# monthly - First of every month at midnight
OnCalendar=monthly

# yearly/annually - January 1st at midnight
OnCalendar=yearly

# quarterly - First of Jan, Apr, Jul, Oct at midnight
OnCalendar=quarterly

# semiannually - First of Jan and Jul at midnight
OnCalendar=semiannually
```

### Testing OnCalendar Expressions

Use `systemd-analyze calendar` to validate and understand your expressions:

```bash
# Test a calendar expression
systemd-analyze calendar "Mon..Fri *-*-* 09:00:00"

# Show next 5 trigger times
systemd-analyze calendar --iterations=5 "daily"

# Test with specific timezone
systemd-analyze calendar --timezone=America/New_York "daily"
```

Example output:

```
$ systemd-analyze calendar --iterations=5 "Mon..Fri *-*-* 09:00:00"
  Original form: Mon..Fri *-*-* 09:00:00
Normalized form: Mon..Fri *-*-* 09:00:00
    Next elapse: Mon 2026-01-20 09:00:00 UTC
       (in UTC): Mon 2026-01-20 09:00:00 UTC
       From now: 4 days left
       Iter. #2: Tue 2026-01-21 09:00:00 UTC
       Iter. #3: Wed 2026-01-22 09:00:00 UTC
       Iter. #4: Thu 2026-01-23 09:00:00 UTC
       Iter. #5: Fri 2026-01-24 09:00:00 UTC
```

## Monotonic Timers (OnBootSec, OnUnitActiveSec)

Monotonic timers trigger relative to events rather than wall-clock time.

### OnBootSec

Triggers a specified time after the system boots:

```ini
# /etc/systemd/system/post-boot-cleanup.timer
[Unit]
Description=Run cleanup 5 minutes after boot

[Timer]
# Trigger 5 minutes after system boot
OnBootSec=5min

# Also run every 24 hours after that
OnUnitActiveSec=24h

[Install]
WantedBy=timers.target
```

### OnStartupSec

Similar to OnBootSec but measures from when systemd user instance started (for user timers):

```ini
# ~/.config/systemd/user/user-startup.timer
[Unit]
Description=Run after user login

[Timer]
# Trigger 1 minute after user session starts
OnStartupSec=1min

[Install]
WantedBy=timers.target
```

### OnUnitActiveSec

Triggers repeatedly after each activation of the service:

```ini
# /etc/systemd/system/periodic-check.timer
[Unit]
Description=Periodic health check

[Timer]
# First run 1 minute after boot
OnBootSec=1min

# Then run every 15 minutes after each completion
OnUnitActiveSec=15min

# Ensure accuracy for monitoring tasks
AccuracySec=1s

[Install]
WantedBy=timers.target
```

### OnUnitInactiveSec

Triggers after the unit becomes inactive (useful for ensuring gaps between runs):

```ini
# /etc/systemd/system/resource-intensive.timer
[Unit]
Description=Resource intensive task with cooldown

[Timer]
# First run at boot
OnBootSec=10min

# Run again 2 hours after the previous run completes
OnUnitInactiveSec=2h

[Install]
WantedBy=timers.target
```

### Combining Multiple Triggers

You can combine multiple timer triggers:

```ini
# /etc/systemd/system/flexible-backup.timer
[Unit]
Description=Flexible backup timer

[Timer]
# Run at 2 AM daily
OnCalendar=*-*-* 02:00:00

# Also run 30 minutes after boot (catches missed backups)
OnBootSec=30min

# Persistent ensures we catch up after downtime
Persistent=true

[Install]
WantedBy=timers.target
```

## Persistent Timers

Persistent timers ensure that missed runs are executed after the system comes back online.

### How Persistent Works

```ini
# /etc/systemd/system/critical-backup.timer
[Unit]
Description=Critical daily backup with persistence

[Timer]
# Scheduled for 3 AM daily
OnCalendar=*-*-* 03:00:00

# If the system was off at 3 AM, run immediately on boot
# The timestamp of last trigger is stored in /var/lib/systemd/timers/
Persistent=true

# Accuracy can be relaxed for less time-critical tasks
AccuracySec=1h

[Install]
WantedBy=timers.target
```

### Persistence Storage

systemd stores persistent timer state in `/var/lib/systemd/timers/`. You can view this:

```bash
# List timer state files
ls -la /var/lib/systemd/timers/

# View timer state (shows last trigger time)
cat /var/lib/systemd/timers/stamp-critical-backup.timer
```

### When to Use Persistent

Use `Persistent=true` when:
- The task must run at least once per period (backups, reports)
- Missing a scheduled run could cause problems
- The task is idempotent (safe to run multiple times)

Avoid persistence when:
- The task is time-sensitive (must run at exact time)
- Running a delayed task could cause issues
- The task has external dependencies that may not be available

## Timer Dependencies

systemd timers can express dependencies on other units for complex scheduling scenarios.

### Basic Dependencies

```ini
# /etc/systemd/system/database-backup.timer
[Unit]
Description=Database backup timer

# Only run if these units are present
Requires=postgresql.service

# Start after these units are active
After=postgresql.service network-online.target

# Don't run if database is stopped
BindsTo=postgresql.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Service Dependencies

More commonly, dependencies are expressed in the service file:

```ini
# /etc/systemd/system/database-backup.service
[Unit]
Description=Database backup service

# Require database to be running
Requires=postgresql.service

# Start after database and network
After=postgresql.service network-online.target

# If database stops, stop this service
BindsTo=postgresql.service

# Specify what happens on failure
OnFailure=backup-failure-notify.service

[Service]
Type=oneshot
User=postgres
ExecStart=/usr/local/bin/backup-database.sh
TimeoutStartSec=3600

# Ensure clean state
PrivateTmp=true
```

### Conditional Execution

Use conditions to control when timers trigger:

```ini
# /etc/systemd/system/laptop-backup.timer
[Unit]
Description=Backup when on AC power

# Only activate if on AC power (for laptops)
ConditionACPower=true

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

### Available Conditions

```ini
# Check if path exists
ConditionPathExists=/etc/myapp/config.yaml

# Check if path is a directory
ConditionPathIsDirectory=/var/lib/myapp

# Check if file is not empty
ConditionFileNotEmpty=/var/lib/myapp/data.db

# Check if running in virtual machine
ConditionVirtualization=yes

# Check if specific user exists
ConditionUser=myuser

# Check if running as root
ConditionUser=root

# Check AC power status
ConditionACPower=true

# Check system capability
ConditionCapability=CAP_NET_ADMIN
```

## Managing Timers

### Enabling and Starting Timers

```bash
# Reload systemd to recognize new timer files
sudo systemctl daemon-reload

# Enable timer to start on boot
sudo systemctl enable my-task.timer

# Start timer immediately
sudo systemctl start my-task.timer

# Enable and start in one command
sudo systemctl enable --now my-task.timer
```

### Stopping and Disabling Timers

```bash
# Stop a running timer
sudo systemctl stop my-task.timer

# Disable timer from starting on boot
sudo systemctl disable my-task.timer

# Stop and disable in one command
sudo systemctl disable --now my-task.timer
```

### Checking Timer Status

```bash
# View status of a specific timer
sudo systemctl status my-task.timer

# List all timers (active and inactive)
sudo systemctl list-timers --all

# List only active timers
sudo systemctl list-timers

# Show detailed timer information
sudo systemctl show my-task.timer
```

Example `list-timers` output:

```
NEXT                        LEFT          LAST                        PASSED       UNIT                         ACTIVATES
Wed 2026-01-15 03:00:00 UTC 5h 23min left Tue 2026-01-14 03:00:00 UTC 18h ago      daily-backup.timer           daily-backup.service
Wed 2026-01-15 00:00:00 UTC 2h 23min left Tue 2026-01-14 00:00:00 UTC 21h ago      logrotate.timer              logrotate.service
Wed 2026-01-15 06:00:00 UTC 8h 23min left Mon 2026-01-13 06:00:00 UTC 1 day 15h ago apt-daily.timer             apt-daily.service
```

### Manually Triggering a Timer's Service

```bash
# Run the associated service immediately (without waiting for timer)
sudo systemctl start my-task.service

# This is useful for testing or forcing immediate execution
```

### Reloading Timer Configuration

```bash
# After editing timer files, reload systemd configuration
sudo systemctl daemon-reload

# Then restart the timer to apply changes
sudo systemctl restart my-task.timer
```

## Viewing Timer Logs

systemd timers integrate with journald for comprehensive logging.

### Basic Log Viewing

```bash
# View logs for a specific service
sudo journalctl -u my-task.service

# View logs for the timer itself
sudo journalctl -u my-task.timer

# Follow logs in real-time
sudo journalctl -u my-task.service -f

# View logs since last boot
sudo journalctl -u my-task.service -b

# View logs from today
sudo journalctl -u my-task.service --since today
```

### Advanced Log Filtering

```bash
# View logs from specific time range
sudo journalctl -u my-task.service --since "2026-01-14 00:00:00" --until "2026-01-15 00:00:00"

# View only error messages
sudo journalctl -u my-task.service -p err

# View logs with full output (no truncation)
sudo journalctl -u my-task.service --no-pager

# View logs in JSON format (for parsing)
sudo journalctl -u my-task.service -o json-pretty

# View last 50 lines
sudo journalctl -u my-task.service -n 50

# View logs with timestamps in UTC
sudo journalctl -u my-task.service --utc
```

### Log Priority Levels

```bash
# Priority levels (from highest to lowest):
# 0: emerg   - System is unusable
# 1: alert   - Action must be taken immediately
# 2: crit    - Critical conditions
# 3: err     - Error conditions
# 4: warning - Warning conditions
# 5: notice  - Normal but significant condition
# 6: info    - Informational
# 7: debug   - Debug-level messages

# View warnings and above
sudo journalctl -u my-task.service -p warning

# View info and above
sudo journalctl -u my-task.service -p info
```

### Combining Timer and Service Logs

```bash
# View both timer and service logs together
sudo journalctl -u my-task.timer -u my-task.service

# This helps correlate when the timer triggered with what the service did
```

## Migration from Cron

### Converting Cron Expressions

Here's how to convert common cron expressions to systemd timer syntax:

| Cron Expression | Cron Meaning | systemd OnCalendar |
|-----------------|--------------|-------------------|
| `0 * * * *` | Every hour | `*-*-* *:00:00` or `hourly` |
| `0 0 * * *` | Daily at midnight | `*-*-* 00:00:00` or `daily` |
| `0 3 * * *` | Daily at 3 AM | `*-*-* 03:00:00` |
| `*/15 * * * *` | Every 15 minutes | `*-*-* *:00,15,30,45:00` |
| `0 0 * * 0` | Weekly on Sunday | `Sun *-*-* 00:00:00` or `weekly` |
| `0 0 1 * *` | Monthly on 1st | `*-*-01 00:00:00` or `monthly` |
| `0 0 1 1 *` | Yearly on Jan 1st | `*-01-01 00:00:00` or `yearly` |
| `0 9-17 * * 1-5` | Weekdays 9-5 hourly | `Mon..Fri *-*-* 09..17:00:00` |

### Migration Steps

1. **Identify existing cron jobs**:

```bash
# List current user's crontab
crontab -l

# List root's crontab
sudo crontab -l

# Check system cron directories
ls -la /etc/cron.d/
ls -la /etc/cron.daily/
ls -la /etc/cron.hourly/
ls -la /etc/cron.weekly/
ls -la /etc/cron.monthly/
```

2. **Create timer and service files for each cron job**

3. **Test the new timers**:

```bash
# Verify calendar expression
systemd-analyze calendar "your-expression"

# Run service manually to test
sudo systemctl start my-task.service

# Check logs for errors
sudo journalctl -u my-task.service -n 50
```

4. **Enable timers and disable cron jobs**:

```bash
# Enable new timer
sudo systemctl enable --now my-task.timer

# Comment out or remove cron job
crontab -e
```

### Migration Example

**Original crontab entry**:
```
# Backup database every day at 2 AM
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

**Converted to systemd**:

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Daily backup timer

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Daily backup service
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
StandardOutput=journal
StandardError=journal
```

Benefits of migration:
- Logs automatically go to journal (no manual redirection)
- Persistent ensures backup runs after downtime
- Better integration with system services

## Practical Examples

### Example 1: System Backup Timer

```ini
# /etc/systemd/system/system-backup.timer
# Comprehensive system backup timer with multiple safeguards

[Unit]
Description=Daily system backup timer
Documentation=man:rsync(1)

[Timer]
# Run at 2:30 AM every day
OnCalendar=*-*-* 02:30:00

# If system was off at 2:30 AM, run on next boot
Persistent=true

# Add random delay up to 30 minutes to avoid disk I/O spikes
RandomizedDelaySec=30min

# 1-minute accuracy is sufficient for backups
AccuracySec=1min

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/system-backup.service
# Service unit that performs the actual backup

[Unit]
Description=Daily system backup
Documentation=man:rsync(1)

# Wait for network if backing up to remote location
Wants=network-online.target
After=network-online.target

# Send notification on failure
OnFailure=backup-failed@%n.service

[Service]
Type=oneshot

# Run as root for full system access
User=root

# Main backup command using rsync
# -a: archive mode (preserves permissions, timestamps, etc.)
# -v: verbose output for logging
# --delete: remove files from destination not in source
# --exclude: skip specified directories
ExecStart=/usr/bin/rsync -av --delete \
    --exclude='/proc/*' \
    --exclude='/sys/*' \
    --exclude='/tmp/*' \
    --exclude='/run/*' \
    --exclude='/mnt/*' \
    --exclude='/media/*' \
    --exclude='/lost+found' \
    / /backup/system/

# Log output to journal
StandardOutput=journal
StandardError=journal

# Give backup up to 4 hours to complete
TimeoutStartSec=14400

# Limit CPU and I/O impact on running system
Nice=19
IOSchedulingClass=idle
CPUQuota=50%
```

### Example 2: Log Cleanup Timer

```ini
# /etc/systemd/system/log-cleanup.timer
# Clean up old log files weekly

[Unit]
Description=Weekly log cleanup timer

[Timer]
# Run every Sunday at 4 AM
OnCalendar=Sun *-*-* 04:00:00

# Not critical if missed
Persistent=false

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/log-cleanup.service
# Service to clean up old log files

[Unit]
Description=Clean up old log files

[Service]
Type=oneshot
User=root

# Remove log files older than 30 days
# find: locate files matching criteria
# -type f: only regular files
# -name "*.log": files ending in .log
# -mtime +30: modified more than 30 days ago
# -delete: remove matching files
ExecStart=/usr/bin/find /var/log -type f -name "*.log" -mtime +30 -delete

# Also clean up rotated logs older than 90 days
ExecStart=/usr/bin/find /var/log -type f -name "*.gz" -mtime +90 -delete

# Clean up journal logs older than 2 weeks
ExecStart=/usr/bin/journalctl --vacuum-time=2weeks

StandardOutput=journal
StandardError=journal
```

### Example 3: Health Check Timer

```ini
# /etc/systemd/system/health-check.timer
# Frequent health check for monitoring

[Unit]
Description=System health check timer

[Timer]
# Run every 5 minutes
OnCalendar=*-*-* *:00,05,10,15,20,25,30,35,40,45,50,55:00

# High accuracy for monitoring
AccuracySec=10s

# Start checking 1 minute after boot
OnBootSec=1min

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/health-check.service
# Perform system health checks

[Unit]
Description=System health check

[Service]
Type=oneshot
User=root

# Run health check script
ExecStart=/usr/local/bin/health-check.sh

# Short timeout for health checks
TimeoutStartSec=60

StandardOutput=journal
StandardError=journal
```

```bash
#!/bin/bash
# /usr/local/bin/health-check.sh
# Comprehensive system health check script

set -euo pipefail

# Log function with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check disk usage
log "Checking disk usage..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    log "WARNING: Disk usage is at ${DISK_USAGE}%"
    exit 1
fi
log "Disk usage: ${DISK_USAGE}%"

# Check memory usage
log "Checking memory usage..."
MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -gt 95 ]; then
    log "WARNING: Memory usage is at ${MEM_USAGE}%"
    exit 1
fi
log "Memory usage: ${MEM_USAGE}%"

# Check load average
log "Checking load average..."
LOAD=$(cat /proc/loadavg | awk '{print $1}')
CPU_COUNT=$(nproc)
LOAD_INT=${LOAD%.*}
if [ "$LOAD_INT" -gt "$CPU_COUNT" ]; then
    log "WARNING: Load average ($LOAD) exceeds CPU count ($CPU_COUNT)"
fi
log "Load average: $LOAD"

# Check critical services
log "Checking critical services..."
for service in ssh nginx postgresql; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        log "Service $service: running"
    else
        log "Service $service: not running or not installed"
    fi
done

log "Health check completed successfully"
exit 0
```

### Example 4: Certificate Renewal Timer

```ini
# /etc/systemd/system/certbot-renew.timer
# Renew Let's Encrypt certificates

[Unit]
Description=Certbot certificate renewal timer
Documentation=https://certbot.eff.org/

[Timer]
# Run twice daily as recommended by Let's Encrypt
OnCalendar=*-*-* 00,12:00:00

# Add randomization to spread load on Let's Encrypt servers
RandomizedDelaySec=3600

# Catch up if server was down
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/certbot-renew.service
# Service to renew Let's Encrypt certificates

[Unit]
Description=Certbot certificate renewal
Documentation=https://certbot.eff.org/
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot

# Run certbot renew
# --quiet: suppress output unless there are errors
# --deploy-hook: run command after successful renewal
ExecStart=/usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"

StandardOutput=journal
StandardError=journal
```

### Example 5: Database Maintenance Timer

```ini
# /etc/systemd/system/db-maintenance.timer
# Weekly database maintenance (vacuum, analyze)

[Unit]
Description=Weekly PostgreSQL maintenance timer

[Timer]
# Run every Sunday at 3 AM
OnCalendar=Sun *-*-* 03:00:00

# Run if missed
Persistent=true

# Add some randomization
RandomizedDelaySec=15min

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/db-maintenance.service
# PostgreSQL maintenance service

[Unit]
Description=PostgreSQL database maintenance
Requires=postgresql.service
After=postgresql.service

[Service]
Type=oneshot
User=postgres

# Run VACUUM ANALYZE on all databases
# This reclaims storage and updates query planner statistics
ExecStart=/usr/bin/psql -c "VACUUM ANALYZE;"

# Reindex if needed (commented out as it can be slow)
# ExecStart=/usr/bin/psql -c "REINDEX DATABASE mydb;"

StandardOutput=journal
StandardError=journal

# Give maintenance up to 2 hours
TimeoutStartSec=7200
```

### Example 6: Monitoring Data Collection Timer

```ini
# /etc/systemd/system/metrics-collector.timer
# Collect system metrics every minute

[Unit]
Description=System metrics collection timer

[Timer]
# Run every minute
OnCalendar=*-*-* *:*:00

# High precision for metrics
AccuracySec=1s

# Start immediately after boot
OnBootSec=30s

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/metrics-collector.service
# Service to collect and store system metrics

[Unit]
Description=Collect system metrics
After=network-online.target

[Service]
Type=oneshot
User=root

ExecStart=/usr/local/bin/collect-metrics.sh

# Quick timeout for metrics collection
TimeoutStartSec=30

# Minimal resource usage
Nice=15
```

## Troubleshooting

### Common Issues and Solutions

#### Timer Not Starting

**Symptom**: Timer shows as inactive or doesn't trigger.

**Diagnostic steps**:
```bash
# Check if timer is enabled
systemctl is-enabled my-task.timer

# Check timer status for errors
systemctl status my-task.timer

# Verify timer file syntax
systemd-analyze verify /etc/systemd/system/my-task.timer

# Check for configuration errors
journalctl -u my-task.timer -n 50
```

**Common causes**:
- Timer file not in correct location (`/etc/systemd/system/`)
- Syntax error in timer file
- Missing `[Install]` section
- `daemon-reload` not run after changes

**Solution**:
```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Re-enable and start timer
sudo systemctl enable --now my-task.timer
```

#### Service Fails to Execute

**Symptom**: Timer triggers but service fails.

**Diagnostic steps**:
```bash
# Check service status
systemctl status my-task.service

# View service logs
journalctl -u my-task.service -n 100

# Try running service manually
sudo systemctl start my-task.service
```

**Common causes**:
- Script permission issues
- Missing dependencies
- Incorrect paths in ExecStart
- User/group permission problems

**Solution**:
```bash
# Verify script is executable
ls -la /usr/local/bin/my-task.sh
chmod +x /usr/local/bin/my-task.sh

# Test script manually
sudo -u <service-user> /usr/local/bin/my-task.sh
```

#### Timer Triggers at Wrong Time

**Symptom**: Timer runs at unexpected times.

**Diagnostic steps**:
```bash
# Verify calendar expression
systemd-analyze calendar "your-expression"

# Check system timezone
timedatectl

# View when timer will next trigger
systemctl list-timers my-task.timer
```

**Common causes**:
- Timezone mismatch
- Incorrect OnCalendar syntax
- RandomizedDelaySec adding unexpected delays

**Solution**:
```bash
# Set correct timezone
sudo timedatectl set-timezone America/New_York

# Or use UTC explicitly in timer
# OnCalendar=*-*-* 03:00:00 UTC
```

#### Persistent Timer Running Multiple Times

**Symptom**: Timer runs multiple times after boot.

**Cause**: Persistent timer catching up on missed runs.

**Solution**:
```ini
# Option 1: Reduce accuracy to batch catch-up runs
AccuracySec=1h

# Option 2: Disable persistence if not needed
Persistent=false

# Option 3: Design your script to be idempotent
# (safe to run multiple times)
```

#### Timer Not Found After Reboot

**Symptom**: Timer disappears after system restart.

**Cause**: Timer not enabled.

**Solution**:
```bash
# Enable timer to persist across reboots
sudo systemctl enable my-task.timer

# Verify it's enabled
systemctl is-enabled my-task.timer
```

### Debugging Commands Summary

```bash
# Verify timer syntax
systemd-analyze verify /etc/systemd/system/my-task.timer

# Test calendar expressions
systemd-analyze calendar "Mon..Fri *-*-* 09:00:00"

# List all timers with next/last trigger times
systemctl list-timers --all

# View timer properties
systemctl show my-task.timer

# View service properties
systemctl show my-task.service

# Check timer file location
systemctl cat my-task.timer

# View recent timer events in journal
journalctl -u my-task.timer --since today

# View service execution logs
journalctl -u my-task.service --since today

# Real-time log following
journalctl -u my-task.service -f

# Check for failed timers
systemctl --failed --type=timer

# Check for failed services
systemctl --failed --type=service
```

### Best Practices for Avoiding Issues

1. **Always test calendar expressions** before deployment:
   ```bash
   systemd-analyze calendar --iterations=5 "your-expression"
   ```

2. **Use absolute paths** in service files:
   ```ini
   ExecStart=/usr/local/bin/script.sh  # Good
   ExecStart=script.sh                  # Bad
   ```

3. **Set appropriate timeouts** for long-running tasks:
   ```ini
   TimeoutStartSec=3600  # 1 hour
   ```

4. **Make scripts idempotent** so they're safe to run multiple times

5. **Use journald logging** instead of redirecting to files:
   ```ini
   StandardOutput=journal
   StandardError=journal
   ```

6. **Test services manually** before enabling timers:
   ```bash
   sudo systemctl start my-task.service
   ```

7. **Monitor timer health** as part of your infrastructure monitoring

## Summary

systemd timers provide a powerful, modern alternative to cron for task scheduling on Ubuntu. Key advantages include:

- **Integrated logging** through journald
- **Dependency management** with other systemd units
- **Resource controls** via cgroups
- **Persistent timers** that catch up on missed runs
- **Flexible scheduling** with OnCalendar and monotonic timers
- **Randomized delays** to prevent thundering herd

While cron remains useful for simple, standalone tasks, systemd timers are the better choice for production systems where reliability, monitoring, and integration matter.

## Monitoring Your Scheduled Tasks with OneUptime

While systemd timers provide excellent scheduling capabilities, monitoring these tasks across multiple servers can be challenging. [OneUptime](https://oneuptime.com) offers comprehensive infrastructure monitoring that helps you track the health and performance of your scheduled tasks.

With OneUptime, you can:

- **Monitor timer execution**: Track whether your scheduled tasks run successfully
- **Set up alerts**: Get notified when timers fail or take longer than expected
- **Visualize trends**: See historical data on task execution times and success rates
- **Centralize logging**: Aggregate logs from multiple servers in one dashboard
- **Create status pages**: Keep stakeholders informed about scheduled maintenance

By combining systemd timers with OneUptime's monitoring capabilities, you can ensure your scheduled tasks run reliably and catch issues before they impact your systems.
