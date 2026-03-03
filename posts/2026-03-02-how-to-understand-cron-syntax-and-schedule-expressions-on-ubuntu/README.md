# How to Understand Cron Syntax and Schedule Expressions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Scheduling, Automation

Description: A thorough explanation of cron syntax and schedule expression fields on Ubuntu, with practical examples covering common scheduling patterns from simple to complex.

---

Cron is the standard job scheduler on Linux systems. You define what to run and when using a compact expression format. The format trips up a lot of people because the fields are not in the obvious order, and there are several special characters that change how each field behaves. This post breaks down the syntax with clear examples.

## The Five Fields of a Cron Expression

A cron schedule is defined by five space-separated fields, followed by the command to run:

```text
* * * * * command_to_run
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, where both 0 and 7 = Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

A `*` in any field means "every valid value for this field."

## Basic Examples

```bash
# Run at midnight every day
0 0 * * * /usr/local/bin/daily-backup.sh

# Run at 2:30 AM every day
30 2 * * * /usr/local/bin/maintenance.sh

# Run every hour (at minute 0)
0 * * * * /usr/local/bin/hourly-check.sh

# Run every minute (all stars except a command)
* * * * * /usr/local/bin/monitor.sh

# Run at 9 AM every Monday
0 9 * * 1 /usr/local/bin/weekly-report.sh

# Run on the 1st of every month at 3 AM
0 3 1 * * /usr/local/bin/monthly-cleanup.sh
```

## Step Values with /

The `/` character specifies step intervals. `*/n` means "every n units":

```bash
# Run every 5 minutes
*/5 * * * * /usr/local/bin/heartbeat.sh

# Run every 2 hours
0 */2 * * * /usr/local/bin/sync.sh

# Run every 15 minutes
*/15 * * * * /usr/local/bin/poll.sh

# Run every 6 hours starting at midnight
0 0,6,12,18 * * * /usr/local/bin/sync.sh
# OR equivalently:
0 */6 * * * /usr/local/bin/sync.sh

# Run every 10 minutes between 8 AM and 6 PM
*/10 8-18 * * * /usr/local/bin/check.sh
```

## Ranges with -

Use a hyphen to specify a range:

```bash
# Run every minute from minute 0 to 30 of each hour
0-30 * * * * /usr/local/bin/script.sh

# Run at midnight from Monday through Friday
0 0 * * 1-5 /usr/local/bin/weekday-job.sh

# Run every hour between 9 AM and 5 PM on weekdays
0 9-17 * * 1-5 /usr/local/bin/business-hours.sh
```

## Lists with ,

Commas separate multiple specific values:

```bash
# Run at 6 AM and 6 PM every day
0 6,18 * * * /usr/local/bin/twice-daily.sh

# Run on Monday, Wednesday, and Friday
0 8 * * 1,3,5 /usr/local/bin/mwf-job.sh

# Run at minutes 0, 15, 30, 45 of every hour
0,15,30,45 * * * * /usr/local/bin/quarter-hour.sh

# Run in January, April, July, October (quarterly)
0 0 1 1,4,7,10 * /usr/local/bin/quarterly-report.sh
```

## Combining Ranges, Steps, and Lists

You can combine these in a single field:

```bash
# Minute field: 0, 5, 10, 15, 20, ... 55 (every 5 minutes)
# but also explicit values like 0,15,30,45 is equivalent to */15
*/5 * * * * command

# Run at 8 AM and 2 PM on weekdays AND on the 1st and 15th
0 8,14 1,15 * 1-5 command
# WARNING: when both day-of-month and day-of-week are specified,
# cron runs the job when EITHER condition is true, not both

# Hours 9-12 and 14-17 (skipping 13:00 lunch)
0 9-12,14-17 * * 1-5 /usr/local/bin/work-hours.sh
```

## The Day-of-Week vs Day-of-Month Quirk

When you specify both a day-of-month and a day-of-week, cron uses OR logic, not AND. The job runs when either condition matches:

```bash
# This does NOT mean "the first Monday of every month"
# It runs on every Monday AND on the 1st of every month
0 9 1 * 1 /usr/local/bin/job.sh

# To truly run only on the first Monday, you need additional logic in the script:
0 9 * * 1 [ "$(date +\%d)" -le 07 ] && /usr/local/bin/first-monday.sh
```

## Special Strings

Most cron implementations on Ubuntu support special strings as shortcuts:

```bash
# Run at system reboot
@reboot /usr/local/bin/startup-task.sh

# Run once per year (January 1 at midnight)
@yearly /usr/local/bin/annual-report.sh
# Equivalent to: 0 0 1 1 *

# Run once per month (first day at midnight)
@monthly /usr/local/bin/monthly-cleanup.sh
# Equivalent to: 0 0 1 * *

# Run once per week (Sunday at midnight)
@weekly /usr/local/bin/weekly-backup.sh
# Equivalent to: 0 0 * * 0

# Run once per day (midnight)
@daily /usr/local/bin/daily-job.sh
# Equivalent to: 0 0 * * *

# Run once per hour (on the hour)
@hourly /usr/local/bin/hourly-task.sh
# Equivalent to: 0 * * * *
```

## Editing the Crontab

```bash
# Edit your personal crontab
crontab -e

# View your current crontab
crontab -l

# Edit the crontab for a specific user (requires root)
sudo crontab -u www-data -e

# Remove your crontab entirely
crontab -r
```

## System-Wide Cron Locations

For system tasks, Ubuntu provides several pre-existing directories:

```bash
# Drop scripts here to run at the specified frequency
/etc/cron.hourly/    # Run every hour
/etc/cron.daily/     # Run daily
/etc/cron.weekly/    # Run weekly
/etc/cron.monthly/   # Run monthly

# Example: adding a daily maintenance script
sudo tee /etc/cron.daily/cleanup-logs << 'EOF'
#!/bin/bash
find /var/log/myapp -name "*.log" -mtime +30 -delete
EOF

sudo chmod +x /etc/cron.daily/cleanup-logs
```

The system-wide crontab at `/etc/crontab` and files in `/etc/cron.d/` have an extra field for the user to run as:

```bash
# Format in /etc/crontab and /etc/cron.d/* files:
# Minute Hour Day Month Weekday User Command

# Run as www-data user
30 2 * * * www-data /usr/local/bin/web-cleanup.sh

# Run as the myapp user
0 */4 * * * myapp /usr/local/bin/sync-data.sh
```

## Testing Schedule Expressions

Before adding a cron job, verify the expression calculates the right times. A useful tool is `croniter` for Python:

```bash
# Install croniter
pip3 install croniter

# Test a schedule expression
python3 << 'EOF'
from croniter import croniter
from datetime import datetime

# Show the next 5 runs of "every 15 minutes during business hours"
cron = croniter("*/15 9-17 * * 1-5", datetime.now())
for _ in range(5):
    print(cron.get_next(datetime))
EOF
```

Or use the online tool at crontab.guru to verify expressions interactively.

## Practical Scheduling Patterns

### Database backup at low-traffic time:

```bash
# Run at 3 AM every day
0 3 * * * /usr/local/bin/backup-database.sh

# Run at 3 AM with email on failure
0 3 * * * /usr/local/bin/backup-database.sh || echo "Backup failed" | mail -s "Backup Failure" admin@example.com
```

### Log rotation and cleanup:

```bash
# Run every night at 11:55 PM
55 23 * * * /usr/sbin/logrotate /etc/logrotate.conf

# Weekly cleanup on Sunday at 1 AM
0 1 * * 0 /usr/local/bin/weekly-cleanup.sh
```

### API polling with rate limiting:

```bash
# Poll every 10 minutes during business hours, weekdays only
*/10 8-18 * * 1-5 /usr/local/bin/poll-api.sh
```

### End of month reporting:

```bash
# Run on the last day of each month is tricky; a common approach:
55 23 28-31 * * [ "$(date +\%d -d tomorrow)" = "01" ] && /usr/local/bin/end-of-month.sh
```

## Common Mistakes to Avoid

1. Forgetting that `%` characters must be escaped as `\%` in crontab
2. Assuming day-of-month and day-of-week combine with AND logic (they use OR)
3. Using relative paths in cron commands (cron runs with a minimal PATH)
4. Forgetting to make scripts executable
5. Not redirecting output, causing silent failures

```bash
# Good practice: redirect output explicitly
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# Set PATH explicitly in the crontab
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 2 * * * backup.sh >> /var/log/backup.log 2>&1
```

## Summary

Cron expressions consist of five fields: minute, hour, day-of-month, month, and day-of-week. The special characters `*` (any), `/` (step), `-` (range), and `,` (list) give you flexible scheduling control. Use special strings like `@daily` and `@reboot` for common patterns. Always redirect output to a log file or `/dev/null`, and use absolute paths for commands and files within cron scripts.
