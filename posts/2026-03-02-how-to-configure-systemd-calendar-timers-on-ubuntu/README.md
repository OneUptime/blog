# How to Configure systemd Calendar Timers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Automation, System Administration, Cron

Description: A thorough guide to configuring systemd calendar timers on Ubuntu, covering OnCalendar expressions, persistent timers, randomized delays, and real-world scheduling examples.

---

systemd timer units are the native scheduling mechanism for systemd-based systems. Calendar timers (those using `OnCalendar=`) fire at specific times or on repeating schedules, much like cron but with better logging, dependency management, and control. This post focuses specifically on the `OnCalendar` expression syntax and practical timer configuration patterns.

## Understanding systemd Calendar Event Expressions

The `OnCalendar=` directive accepts a time specification that can range from simple keywords to precise multi-field expressions.

### Basic Format

```
OnCalendar=DayOfWeek Year-Month-Day Hour:Minute:Second
```

Each field accepts specific values, ranges, or wildcards. Missing fields default to `*` (any).

### Time Zone

```ini
# Use a specific timezone
OnCalendar=America/New_York 2026-*-* 08:00:00

# Use local time (default)
OnCalendar=*-*-* 08:00:00
```

## Shorthand Keywords

systemd provides convenient shorthand expressions:

```ini
# Every minute
OnCalendar=minutely

# Every hour at :00
OnCalendar=hourly

# Every day at 00:00:00
OnCalendar=daily

# Every week on Monday at 00:00:00
OnCalendar=weekly

# Every month on the 1st at 00:00:00
OnCalendar=monthly

# Every year on Jan 1st at 00:00:00
OnCalendar=annually
OnCalendar=yearly
```

## Full Expression Syntax

### Wildcards and Ranges

```ini
# Every minute of every day
OnCalendar=*-*-* *:*:00

# Every 5 minutes
OnCalendar=*:0/5

# Every hour from 9 AM to 5 PM
OnCalendar=*-*-* 9..17:00:00

# Multiple specific times
OnCalendar=*-*-* 09:00:00
OnCalendar=*-*-* 13:00:00
OnCalendar=*-*-* 17:00:00
# Note: you can have multiple OnCalendar= lines in one unit
```

### Day of Week

```ini
# Only on weekdays
OnCalendar=Mon..Fri *-*-* 08:00:00

# Only on weekends
OnCalendar=Sat,Sun *-*-* 10:00:00

# Every Monday
OnCalendar=Mon

# Every Tuesday and Thursday
OnCalendar=Tue,Thu *-*-* 14:00:00
```

Day abbreviations: Mon, Tue, Wed, Thu, Fri, Sat, Sun

### Specific Dates

```ini
# First of every month at 3 AM
OnCalendar=*-*-01 03:00:00

# 15th of every month
OnCalendar=*-*-15 12:00:00

# Last day of month (use -1 for last)
# Note: systemd doesn't support -1 directly, use specific ranges
# Workaround: use a script that checks the date

# Quarterly: 1st of Jan, Apr, Jul, Oct
OnCalendar=*-1,4,7,10-01 00:00:00

# Every year on March 15th
OnCalendar=*-03-15 00:00:00

# Specific year and date
OnCalendar=2026-12-31 23:59:00

# Leap day (when it exists)
OnCalendar=*-02-29 00:00:00
```

### Step Values

Use `/` for step values:

```ini
# Every 6 hours
OnCalendar=*-*-* 0/6:00:00
# Equivalent: 00:00, 06:00, 12:00, 18:00

# Every 15 minutes
OnCalendar=*:0/15

# Every 30 seconds
OnCalendar=*:*:0/30

# Every other day starting from 1st
OnCalendar=*-*-1/2 00:00:00
# Fires on: 1st, 3rd, 5th, 7th...

# Every 3 months starting from January
OnCalendar=*-1/3-01 00:00:00
# Fires in: January, April, July, October
```

## Testing Calendar Expressions

Always test before deploying:

```bash
# Verify an expression and see next scheduled times
systemd-analyze calendar "Mon..Fri *-*-* 08:00:00"

# Output:
#   Original form: Mon..Fri *-*-* 08:00:00
# Normalized form: Mon..Fri *-*-* 08:00:00
#     Next elapse: Mon 2026-03-02 08:00:00 UTC
#        (in UTC): Mon 2026-03-02 08:00:00 UTC
#  From now:       13h left

# Check multiple iterations
systemd-analyze calendar --iterations=5 "0/6:00:00"

# Verify a complex expression
systemd-analyze calendar "*-1,4,7,10-01 00:00:00"
```

## Complete Timer Examples

### Example 1: Log Rotation Timer

```bash
sudo nano /etc/systemd/system/custom-logrotate.service
```

```ini
[Unit]
Description=Custom Log Rotation

[Service]
Type=oneshot
ExecStart=/usr/sbin/logrotate /etc/logrotate.d/custom
```

```bash
sudo nano /etc/systemd/system/custom-logrotate.timer
```

```ini
[Unit]
Description=Custom Log Rotation Timer

[Timer]
# Run at 3:15 AM every day
OnCalendar=*-*-* 03:15:00

# Also run if the system was down when the timer should have fired
Persistent=true

# Spread load by up to 5 minutes
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

### Example 2: Certificate Renewal Check

```bash
sudo nano /etc/systemd/system/ssl-renewal.service
```

```ini
[Unit]
Description=SSL Certificate Renewal Check
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --no-self-upgrade
ExecStartPost=/bin/systemctl reload nginx
```

```bash
sudo nano /etc/systemd/system/ssl-renewal.timer
```

```ini
[Unit]
Description=Twice-daily SSL certificate renewal check

[Timer]
# Run at 3 AM and 3 PM
OnCalendar=*-*-* 03,15:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
```

### Example 3: Weekly Report Generation

```bash
sudo nano /etc/systemd/system/weekly-report.service
```

```ini
[Unit]
Description=Weekly Summary Report

[Service]
Type=oneshot
User=www-data
ExecStart=/usr/local/bin/generate-report.sh
# Ensure the report generates within 2 hours
TimeoutStartSec=7200
```

```bash
sudo nano /etc/systemd/system/weekly-report.timer
```

```ini
[Unit]
Description=Weekly Report Timer

[Timer]
# Every Monday morning at 6 AM
OnCalendar=Mon *-*-* 06:00:00
RandomizedDelaySec=1800
Persistent=true

[Install]
WantedBy=timers.target
```

### Example 4: Multiple Schedule Points

A single timer can have multiple `OnCalendar=` entries to fire at different times:

```bash
sudo nano /etc/systemd/system/health-check.timer
```

```ini
[Unit]
Description=Health Check Timer

[Timer]
# Run at the start of business hours
OnCalendar=Mon..Fri *-*-* 08:00:00
# Run at lunch
OnCalendar=Mon..Fri *-*-* 12:00:00
# Run at end of business hours
OnCalendar=Mon..Fri *-*-* 17:00:00
# Run once on weekends
OnCalendar=Sat,Sun *-*-* 10:00:00

[Install]
WantedBy=timers.target
```

## Persistent Timers

The `Persistent=true` setting is important for tasks that must not be skipped:

```ini
[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
```

With `Persistent=true`:
- If the system was off during the scheduled time, the job runs at the next opportunity after boot
- The last execution time is stored in `/var/lib/systemd/timers/`

```bash
# View timer state files
ls /var/lib/systemd/timers/
# stamp-db-backup.timer

# View stored timestamp
cat /var/lib/systemd/timers/stamp-db-backup.timer
```

## RandomizedDelaySec - Avoiding Thundering Herd

When many timers fire simultaneously (e.g., at midnight), they can overload the system:

```ini
[Timer]
OnCalendar=daily
# Randomize by up to 1 hour
RandomizedDelaySec=3600
```

This spreads the actual trigger time uniformly over the specified range. A timer set to midnight with `RandomizedDelaySec=3600` will actually fire sometime between 00:00 and 01:00.

```bash
# See the jitter added to the next trigger
systemctl list-timers | grep your-timer
# The "NEXT" column shows the actual next trigger time
```

## AccuracySec - Power Saving

`AccuracySec=` controls timer accuracy vs. power efficiency. A higher value groups timers together to avoid unnecessary wakeups:

```ini
[Timer]
OnCalendar=hourly
# Allow up to 10 minutes of jitter to merge wakeups
AccuracySec=10min
```

Default is 1 minute. For laptop/battery systems or non-critical tasks, increase this to reduce power consumption.

## Monitoring Timers

```bash
# List all timers - shows last and next run times
systemctl list-timers

# List including inactive timers
systemctl list-timers --all

# Check a specific timer
systemctl status db-backup.timer

# View timer trigger history
journalctl -u db-backup.timer --since "7 days ago"

# View the service run history
journalctl -u db-backup.service --since "7 days ago"

# Check if a timer is enabled
systemctl is-enabled db-backup.timer

# Check if a timer is currently active
systemctl is-active db-backup.timer
```

## Disabling and Removing Timers

```bash
# Disable (stops automatic start at boot)
sudo systemctl disable db-backup.timer

# Stop the currently running timer
sudo systemctl stop db-backup.timer

# Remove the timer unit files
sudo rm /etc/systemd/system/db-backup.timer
sudo rm /etc/systemd/system/db-backup.service

# Reload systemd
sudo systemctl daemon-reload

# Clean up leftover runtime state
sudo systemctl reset-failed db-backup.timer
```

systemd calendar timers provide a reliable and transparent way to schedule recurring tasks. The `systemd-analyze calendar` command makes verifying complex expressions easy, and the `Persistent=true` flag ensures jobs don't silently skip when systems are rebooted. Combined with journald logging, you always have a clear record of when a job ran and what it produced.
