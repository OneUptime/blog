# How to Write a systemd Timer as a Cron Alternative on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Automation, Linux, Scheduling

Description: Replace cron jobs with systemd timers on Ubuntu for better logging, dependency management, and scheduling precision with practical examples.

---

Cron has been the standard job scheduler on Linux for decades and still works fine. But systemd timers offer some advantages worth knowing about: automatic integration with journald logging, dependency management, the ability to catch up on missed runs, and more flexible time specifications. This guide shows how to write systemd timers that replace common cron patterns.

## Understanding systemd Timers

A systemd timer consists of two unit files:

1. **A timer unit** (`.timer`): Defines when to run the task
2. **A service unit** (`.service`): Defines what to run

The timer activates the service. The service does the actual work. This separation keeps the scheduling logic separate from the execution logic, which makes both easier to maintain.

## Basic Timer: Run a Script Every Hour

This is the most common replacement for an hourly cron job.

### Step 1: Create the Service Unit

```bash
sudo nano /etc/systemd/system/hourly-cleanup.service
```

```ini
[Unit]
Description=Hourly cleanup task
# After network is available (optional, remove if not needed)
After=network.target

[Service]
Type=oneshot
# Run as a specific user
User=root
Group=root
# The command to execute
ExecStart=/usr/local/bin/cleanup.sh
# Ensure stdout/stderr go to journald
StandardOutput=journal
StandardError=journal
```

`Type=oneshot` is correct for tasks that start, complete, and exit. This is different from `Type=simple`, which is for long-running services.

### Step 2: Create the Timer Unit

```bash
sudo nano /etc/systemd/system/hourly-cleanup.timer
```

```ini
[Unit]
Description=Run cleanup script every hour
# Start the timer after basic system initialization
After=basic.target

[Timer]
# Run 15 minutes after boot (initial delay)
OnBootSec=15min

# Then repeat every hour
OnUnitActiveSec=1h

# Allow 5-minute accuracy window (avoids thundering herd if many timers fire together)
AccuracySec=5min

# If a run was missed (system was off), run it when the system comes back up
Persistent=true

[Install]
WantedBy=timers.target
```

### Step 3: Enable and Start the Timer

```bash
# Reload systemd to pick up new unit files
sudo systemctl daemon-reload

# Enable the timer to start at boot
sudo systemctl enable hourly-cleanup.timer

# Start the timer now
sudo systemctl start hourly-cleanup.timer

# Verify it is running
sudo systemctl status hourly-cleanup.timer
```

## Calendar-Based Timers

For cron-style "run at specific times" scheduling, use `OnCalendar`:

```bash
sudo nano /etc/systemd/system/daily-backup.timer
```

```ini
[Unit]
Description=Daily backup at 2 AM

[Timer]
# Cron equivalent: 0 2 * * *
OnCalendar=*-*-* 02:00:00

# Random delay within 30 minutes to avoid exact simultaneous starts
RandomizedDelaySec=30min

# Run missed jobs when system boots (if it was off at 2 AM)
Persistent=true

# Accuracy of 1 minute
AccuracySec=1min

[Install]
WantedBy=timers.target
```

### Calendar Expression Examples

```ini
# Every day at midnight
OnCalendar=daily

# Every day at 2:30 AM
OnCalendar=*-*-* 02:30:00

# Every Monday at 8 AM
OnCalendar=Mon *-*-* 08:00:00

# Every weekday at 6 PM
OnCalendar=Mon..Fri *-*-* 18:00:00

# First day of every month at midnight
OnCalendar=*-*-01 00:00:00

# Every 15 minutes
OnCalendar=*:0/15

# Every hour at quarter past
OnCalendar=*:15

# Every 6 hours
OnCalendar=0/6:00:00

# Specific dates
OnCalendar=2026-03-15 12:00:00
```

Test your calendar expressions before deploying:

```bash
# Show when the next 10 activations would be
systemd-analyze calendar --iterations=10 "Mon..Fri *-*-* 08:00:00"

# Verify a specific expression
systemd-analyze calendar "0/6:00:00"
```

## Replacing Common Cron Jobs

### @reboot Equivalent

```ini
[Timer]
OnBootSec=30s
# Does not repeat - runs once after boot
```

### @daily Equivalent

```ini
[Timer]
OnCalendar=daily
Persistent=true
```

### @weekly Equivalent

```ini
[Timer]
OnCalendar=weekly
Persistent=true
```

### Every 5 minutes

```ini
[Timer]
OnBootSec=5min
OnUnitActiveSec=5min
```

### Cron: "30 4 1,15 * 5" (4:30 AM on 1st, 15th, and Fridays)

This cannot be expressed as a single `OnCalendar` entry in systemd because systemd calendar entries do not support the OR logic across different fields that cron provides. Use two timers instead:

```ini
# Timer 1: 1st and 15th of the month
OnCalendar=*-*-01,15 04:30:00

# Timer 2: Every Friday
OnCalendar=Fri *-*-* 04:30:00
```

## A Complete Working Example

A timer that generates a daily report:

```bash
# Create the script
sudo nano /usr/local/bin/daily-report.sh
```

```bash
#!/bin/bash
# Generate daily system report

REPORT_DIR="/var/reports"
DATE=$(date '+%Y-%m-%d')
REPORT_FILE="$REPORT_DIR/report-$DATE.txt"

mkdir -p "$REPORT_DIR"

{
    echo "Daily System Report - $DATE"
    echo "================================"
    echo ""
    echo "=== Disk Usage ==="
    df -h

    echo ""
    echo "=== Memory Usage ==="
    free -h

    echo ""
    echo "=== Top Processes by CPU ==="
    ps aux --sort=-%cpu | head -10

    echo ""
    echo "=== Failed Services ==="
    systemctl --failed --no-legend

    echo ""
    echo "=== Recent Auth Failures ==="
    journalctl -u sshd --since "24 hours ago" | grep "Failed password" | tail -20
} > "$REPORT_FILE"

echo "Report written to $REPORT_FILE"
```

```bash
sudo chmod +x /usr/local/bin/daily-report.sh
```

```bash
sudo nano /etc/systemd/system/daily-report.service
```

```ini
[Unit]
Description=Generate Daily System Report
After=syslog.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/daily-report.sh
StandardOutput=journal
StandardError=journal
# Send logs under this identifier in journald
SyslogIdentifier=daily-report
```

```bash
sudo nano /etc/systemd/system/daily-report.timer
```

```ini
[Unit]
Description=Daily System Report Timer

[Timer]
OnCalendar=*-*-* 07:00:00
RandomizedDelaySec=5min
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable daily-report.timer
sudo systemctl start daily-report.timer
```

## Checking Timer Status

```bash
# List all active timers
systemctl list-timers

# Output shows:
# NEXT         LEFT        LAST         PASSED   UNIT                ACTIVATES
# Mon 2026-03-02 07:00:00 UTC  10h left  Sun 2026-03-01 07:00:00 UTC  14h ago  daily-report.timer  daily-report.service

# Show all timers including inactive
systemctl list-timers --all

# Show timer details
sudo systemctl status daily-report.timer

# See recent timer activations
journalctl -u daily-report.timer
```

## Viewing Timer Logs

Unlike cron, where you need to configure mail or redirect output manually, systemd timer output goes to journald automatically:

```bash
# View logs for the service activated by the timer
sudo journalctl -u daily-report.service

# See the last run's output
sudo journalctl -u daily-report.service -n 50

# Follow logs from the next run
sudo journalctl -u daily-report.service -f

# View logs from a specific time range
sudo journalctl -u daily-report.service --since "2026-03-01" --until "2026-03-02"
```

## Running a Timer-Activated Service Immediately

To test or force a run without waiting for the timer:

```bash
# Run the service now (bypasses the timer)
sudo systemctl start daily-report.service

# Check if it ran successfully
sudo systemctl status daily-report.service

# View the output
sudo journalctl -u daily-report.service -n 20
```

## Transient Timers with systemd-run

For one-off scheduled tasks without creating unit files, use `systemd-run`:

```bash
# Run a command in 5 minutes
sudo systemd-run --on-active=5min /usr/local/bin/cleanup.sh

# Run at a specific time
sudo systemd-run --on-calendar="2026-03-02 15:00:00" /usr/local/bin/report.sh

# See scheduled transient units
systemctl list-timers
```

This is useful for scheduling one-time tasks during a maintenance window.

systemd timers are not universally better than cron - cron is simpler for basic use cases and does not require learning new unit file syntax. But for anything that needs proper logging, dependency ordering, or the ability to catch up on missed runs, timers are worth the extra setup.
