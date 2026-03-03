# How to View Cron Logs and Debug Cron Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Logging, Troubleshooting

Description: Learn how to access cron logs on Ubuntu through syslog and journalctl, and use log analysis techniques to debug cron jobs that are not running as expected.

---

When a cron job misbehaves, the first tool you reach for is the log. Cron logs its activity to the system's logging facility, and reading these logs is the primary diagnostic method for understanding what the scheduler is actually doing. This post covers how to access and interpret cron logs on Ubuntu.

## Where Cron Logs Go on Ubuntu

On Ubuntu, cron uses the syslog facility. Depending on your Ubuntu version and logging configuration, cron entries appear in different places:

- **Older Ubuntu with rsyslog**: `/var/log/syslog`
- **Ubuntu with journald**: `journalctl -u cron`
- **Some configurations**: `/var/log/cron.log` (if specifically configured)

Check which logging method is active:

```bash
# Check if syslog exists
ls -la /var/log/syslog

# Check rsyslog configuration for cron-specific logging
grep -i cron /etc/rsyslog.conf /etc/rsyslog.d/*.conf 2>/dev/null
```

## Reading Cron Logs from syslog

```bash
# Show all cron entries in syslog
sudo grep CRON /var/log/syslog

# Show the last 50 cron entries
sudo grep CRON /var/log/syslog | tail -50

# Follow cron log in real time
sudo grep --line-buffered CRON /var/log/syslog | tail -f /var/log/syslog

# Or more cleanly:
sudo tail -f /var/log/syslog | grep CRON
```

A typical cron log entry looks like:

```text
Mar  2 10:00:01 server CRON[12345]: (root) CMD (/usr/local/bin/backup.sh)
Mar  2 10:00:01 server CRON[12346]: (CRON) info (No MTA installed, discarding output)
```

The key fields in a log line:
- **Date/Time**: When the event occurred
- **Hostname**: Server name
- **CRON[PID]**: The cron daemon and process ID
- **(username)**: The user the job ran as
- **CMD**: The command that was executed

## Reading Cron Logs with journalctl

On newer Ubuntu systems or those with systemd journal:

```bash
# Show all cron journal entries
sudo journalctl -u cron

# Show entries from the last boot only
sudo journalctl -u cron -b

# Follow in real time
sudo journalctl -u cron -f

# Show entries from the last hour
sudo journalctl -u cron --since "1 hour ago"

# Show entries between specific times
sudo journalctl -u cron --since "2026-03-02 09:00:00" --until "2026-03-02 10:00:00"

# Show only errors and worse
sudo journalctl -u cron -p err
```

## Enabling a Dedicated Cron Log File

If you find filtering syslog tedious, configure rsyslog to write cron entries to a separate file:

```bash
# Create rsyslog configuration for cron
sudo tee /etc/rsyslog.d/50-cron.conf << 'EOF'
# Log cron entries to a dedicated file
cron.*                          /var/log/cron.log

# Prevent cron entries from appearing in syslog too
& stop
EOF

# Restart rsyslog to apply
sudo systemctl restart rsyslog

# Verify the log file is being created
sudo tail -f /var/log/cron.log
```

Now cron entries go to `/var/log/cron.log` instead of the general syslog.

## Understanding Log Entry Types

Cron generates several types of log entries:

```bash
# CMD entries - a job was executed
Mar  2 10:00:01 server CRON[1234]: (root) CMD (/usr/local/bin/backup.sh)

# ERROR entries - something went wrong
Mar  2 10:00:01 server CRON[1235]: (root) ERROR (grandchild #1234 failed with exit status 1)

# INFO entries - informational messages
Mar  2 10:00:01 server CRON[1236]: (CRON) info (No MTA installed, discarding output)

# Mail-related entries
Mar  2 10:00:05 server CRON[1237]: (root) MAIL (mailed 512 bytes of output; but got status 0x004b)
```

The absence of a CMD entry for your expected job time is the clearest signal that the job was never started - which points to a crontab syntax issue or access control problem.

## Checking if Cron is Actually Running a Job

To watch for a specific job in real time:

```bash
# Find the command pattern in your crontab
crontab -l | grep backup

# Watch the syslog for that pattern
sudo tail -f /var/log/syslog | grep -E "CRON|backup"

# Wait for the scheduled time and watch the output
```

If you see the CMD entry, cron ran the job. If the job had output issues, you may see:

```text
Mar  2 10:00:01 server CRON[1234]: (root) CMD (/usr/local/bin/backup.sh)
Mar  2 10:00:03 server CRON[1234]: (root) MAIL (mailed 289 bytes of output but got status 0x004b)
```

This means the job produced output and cron tried to mail it. The "status 0x004b" indicates no MTA is configured.

## Adding Logging to Your Cron Jobs

The most reliable way to debug cron jobs is to add explicit logging within the job:

```bash
# In your crontab, redirect all output to a log file
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup-cron.log 2>&1

# Or include timestamps in the output
0 2 * * * { echo "=== $(date) ==="; /usr/local/bin/backup.sh; } >> /var/log/backup-cron.log 2>&1
```

Add logging inside the script itself:

```bash
#!/bin/bash
# /usr/local/bin/backup.sh

LOG="/var/log/backup.log"
exec >> "$LOG" 2>&1  # Redirect all output to log from this point on

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup"

# Your backup commands here
rsync -az /var/data/ /backup/data/

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed successfully"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup FAILED with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
```

## Checking Job Execution History

When you need to know the history of when a job ran:

```bash
# Show all cron executions in the past 24 hours
sudo journalctl -u cron --since "24 hours ago" | grep CMD

# Count how many times a specific job ran today
sudo grep "CMD.*backup.sh" /var/log/syslog | grep "$(date +'%b %e')" | wc -l

# Show the last 10 times a job ran
sudo grep "CMD.*backup.sh" /var/log/syslog | tail -10
```

## Debugging a Job That Ran but Produced No Output

If cron ran the job (you see the CMD entry) but the expected output does not exist:

```bash
# Check if the job is redirecting output to /dev/null
crontab -l | grep your_script

# If it redirects to /dev/null, temporarily change it:
# Instead of:
# 0 2 * * * /script.sh > /dev/null 2>&1

# Use:
# 0 2 * * * /script.sh >> /tmp/script-debug.log 2>&1
```

Then check `/tmp/script-debug.log` after the next run.

## Debugging the Environment

Cron's minimal environment causes many silent failures. Log the environment your script sees:

```bash
# Add this to the beginning of your crontab to log the cron environment
* * * * * env > /tmp/cron-environment.txt

# Check the captured environment
cat /tmp/cron-environment.txt
```

Compare this with your interactive shell environment:

```bash
# In your interactive shell
env > /tmp/shell-environment.txt

# Compare
diff /tmp/shell-environment.txt /tmp/cron-environment.txt
```

Variables that exist in your shell but not in cron (like `PATH`, custom variables, `HOME`) may be causing issues.

## Log Rotation for Cron Log Files

If you have application logs from cron jobs growing large, set up rotation:

```bash
# Create a logrotate configuration for your cron log
sudo tee /etc/logrotate.d/myapp-cron << 'EOF'
/var/log/myapp-cron.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

# Test the logrotate configuration
sudo logrotate -d /etc/logrotate.d/myapp-cron

# Force rotation immediately for testing
sudo logrotate -f /etc/logrotate.d/myapp-cron
```

## Searching Archived Logs

Log files rotate over time. For older cron entries:

```bash
# Search through compressed log archives
sudo zgrep "CRON.*backup.sh" /var/log/syslog.*.gz

# Show the date of the archives available
ls -la /var/log/syslog*

# Search all syslog files (current and archived)
sudo grep -h "CRON.*backup" /var/log/syslog /var/log/syslog.1 2>/dev/null
sudo zgrep "CRON.*backup" /var/log/syslog.*.gz 2>/dev/null
```

## Quick Debug Workflow

When a cron job is not working as expected:

```bash
# Step 1: Verify the job is even being run
sudo grep "CMD.*your_script" /var/log/syslog | tail -5

# Step 2: If CMD entries exist, check for errors
sudo grep "ERROR.*your_script" /var/log/syslog | tail -5

# Step 3: If no CMD entries, check cron is running
systemctl status cron

# Step 4: Check the crontab syntax
crontab -l

# Step 5: Add output capture and run a test
crontab -e
# Change: 0 2 * * * /your_script.sh
# To:     * * * * * /your_script.sh >> /tmp/test.log 2>&1

# Step 6: Wait one minute and check the log
cat /tmp/test.log

# Step 7: Restore the original schedule
crontab -e
```

## Summary

Cron logging on Ubuntu flows through syslog or journald. The primary commands for reading cron logs are `grep CRON /var/log/syslog` and `journalctl -u cron`. The presence or absence of `CMD` entries tells you whether cron attempted to run your job. For jobs that run but produce wrong results, add explicit logging inside the script using output redirection. When debugging environment issues, log the `env` output from inside cron to compare with your interactive shell. A dedicated cron log file configured through rsyslog makes log analysis easier on busy systems.
