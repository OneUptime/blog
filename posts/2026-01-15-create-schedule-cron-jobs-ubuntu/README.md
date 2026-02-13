# How to Create and Schedule Cron Jobs on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Cron, Automation, Scheduling, System Administration, Tutorial

Description: Master cron job scheduling on Ubuntu with this comprehensive guide covering syntax, examples, logging, and troubleshooting common issues.

---

Cron is the time-based job scheduler in Unix-like systems. It runs commands or scripts automatically at specified intervals-perfect for backups, log rotation, system maintenance, and automated tasks. This guide covers everything from basic syntax to advanced scheduling techniques.

## Understanding Cron

Cron runs as a daemon (`crond`) and checks scheduled jobs every minute. Jobs are defined in crontab files, which specify when and what to run.

### Cron Components

- **crontab**: The file containing scheduled jobs
- **crond**: The daemon that executes jobs
- **cron.d**: Directory for system cron jobs

## Crontab Syntax

Each cron job follows this format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
│ │ │ │ │
* * * * * command_to_execute
```

### Special Characters

| Character | Meaning | Example |
|-----------|---------|---------|
| `*` | Any value | `* * * * *` runs every minute |
| `,` | List of values | `0,30 * * * *` runs at :00 and :30 |
| `-` | Range of values | `0-5 * * * *` runs minutes 0 through 5 |
| `/` | Step values | `*/15 * * * *` runs every 15 minutes |

## Managing Crontab

### View Current Crontab

```bash
# List current user's cron jobs
crontab -l

# View another user's crontab (requires root)
sudo crontab -u username -l
```

### Edit Crontab

```bash
# Edit current user's crontab
crontab -e

# Edit root's crontab
sudo crontab -e

# Edit another user's crontab
sudo crontab -u username -e
```

The first time you run `crontab -e`, you'll be asked to choose an editor.

### Remove Crontab

```bash
# Remove all cron jobs for current user (use with caution!)
crontab -r

# Prompt before removing
crontab -i -r
```

## Common Cron Schedule Examples

### Time-Based Schedules

```bash
# Run every minute
* * * * * /path/to/script.sh

# Run every 5 minutes
*/5 * * * * /path/to/script.sh

# Run every hour at minute 0
0 * * * * /path/to/script.sh

# Run every day at midnight
0 0 * * * /path/to/script.sh

# Run every day at 3:30 AM
30 3 * * * /path/to/script.sh

# Run twice daily at 6 AM and 6 PM
0 6,18 * * * /path/to/script.sh

# Run every Monday at 9 AM
0 9 * * 1 /path/to/script.sh

# Run on the 1st of every month at midnight
0 0 1 * * /path/to/script.sh

# Run every weekday (Monday-Friday) at 8 AM
0 8 * * 1-5 /path/to/script.sh

# Run every 15 minutes during business hours (9 AM - 5 PM)
*/15 9-17 * * * /path/to/script.sh
```

### Special Strings

Cron supports readable shortcuts:

```bash
# Run once at startup
@reboot /path/to/script.sh

# Run once a year (midnight, Jan 1)
@yearly /path/to/script.sh
@annually /path/to/script.sh

# Run once a month (midnight, 1st of month)
@monthly /path/to/script.sh

# Run once a week (midnight on Sunday)
@weekly /path/to/script.sh

# Run once a day at midnight
@daily /path/to/script.sh
@midnight /path/to/script.sh

# Run once an hour at the beginning of the hour
@hourly /path/to/script.sh
```

## Practical Cron Job Examples

### Database Backup

```bash
# Backup MySQL database every day at 2 AM
0 2 * * * /usr/bin/mysqldump -u backup_user -p'password' mydb > /backups/mydb_$(date +\%Y\%m\%d).sql

# Backup PostgreSQL daily at 3 AM
0 3 * * * /usr/bin/pg_dump -U postgres mydb > /backups/mydb_$(date +\%Y\%m\%d).sql
```

**Note**: Escape `%` with `\%` in crontab, as `%` is a special character.

### Log Cleanup

```bash
# Delete logs older than 30 days every Sunday at 1 AM
0 1 * * 0 /usr/bin/find /var/log/myapp -name "*.log" -mtime +30 -delete
```

### System Maintenance

```bash
# Update package lists daily at 4 AM
0 4 * * * /usr/bin/apt update

# Clear temp files every hour
0 * * * * /usr/bin/find /tmp -type f -mmin +60 -delete

# Sync time with NTP server daily
0 0 * * * /usr/sbin/ntpdate pool.ntp.org
```

### Health Checks

```bash
# Check if web server is running every 5 minutes
*/5 * * * * /usr/bin/systemctl is-active --quiet nginx || /usr/bin/systemctl restart nginx

# Check disk space and alert if above 80%
0 */6 * * * /path/to/disk_check.sh
```

### Custom Script Example

Create a monitoring script:

```bash
# Create the monitoring script
sudo nano /usr/local/bin/disk_check.sh
```

Script content:

```bash
#!/bin/bash
# Disk usage monitoring script
# Sends alert if any partition exceeds threshold

THRESHOLD=80
ALERT_EMAIL="admin@example.com"

# Check disk usage and extract percentage
df -H | grep -vE '^Filesystem|tmpfs|cdrom' | awk '{ print $5 " " $1 }' | while read output; do
    # Extract usage percentage (remove % sign)
    usage=$(echo $output | awk '{ print $1}' | cut -d'%' -f1)
    partition=$(echo $output | awk '{ print $2 }')

    # Alert if usage exceeds threshold
    if [ $usage -ge $THRESHOLD ]; then
        echo "Warning: $partition is ${usage}% full on $(hostname)" | \
        mail -s "Disk Space Alert: $(hostname)" $ALERT_EMAIL
    fi
done
```

Make it executable and schedule:

```bash
# Make script executable
sudo chmod +x /usr/local/bin/disk_check.sh

# Add to crontab - run every 6 hours
crontab -e
# Add: 0 */6 * * * /usr/local/bin/disk_check.sh
```

## Environment Variables in Cron

Cron runs with a minimal environment. Set variables at the top of your crontab:

```bash
# Set environment variables for all jobs in this crontab
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
MAILTO=admin@example.com
HOME=/home/username

# Jobs below will use these settings
0 * * * * /path/to/script.sh
```

### Common Environment Issues

Cron doesn't load `.bashrc` or `.profile`. If your script needs environment variables:

```bash
# Option 1: Source profile in crontab
0 * * * * source ~/.bashrc && /path/to/script.sh

# Option 2: Use full paths in scripts
0 * * * * /usr/bin/python3 /path/to/script.py

# Option 3: Set PATH in crontab
PATH=/home/user/.local/bin:/usr/local/bin:/usr/bin:/bin
0 * * * * python3 /path/to/script.py
```

## Cron Output and Logging

### Email Output

By default, cron emails output to the user. Control this with MAILTO:

```bash
# Send output to specific email
MAILTO=admin@example.com

# Disable email (discard output)
MAILTO=""

# Per-job email control
0 * * * * /path/to/script.sh 2>&1 | mail -s "Script Output" admin@example.com
```

### Redirect to Log File

```bash
# Log stdout and stderr to file
0 * * * * /path/to/script.sh >> /var/log/myscript.log 2>&1

# Log with timestamp
0 * * * * echo "$(date): Starting script" >> /var/log/myscript.log && /path/to/script.sh >> /var/log/myscript.log 2>&1

# Discard all output (silent)
0 * * * * /path/to/script.sh > /dev/null 2>&1
```

### View Cron Logs

```bash
# View cron daemon logs
sudo grep CRON /var/log/syslog

# Follow cron logs in real-time
sudo tail -f /var/log/syslog | grep CRON

# View cron logs with journalctl
sudo journalctl -u cron
```

## System Cron Directories

For system-wide jobs, use these directories:

```bash
# List system cron directories
ls -la /etc/cron.*
```

| Directory | Schedule |
|-----------|----------|
| `/etc/cron.hourly/` | Every hour |
| `/etc/cron.daily/` | Every day |
| `/etc/cron.weekly/` | Every week |
| `/etc/cron.monthly/` | Every month |
| `/etc/cron.d/` | Custom schedules |

### Add System Cron Job

```bash
# Create a daily cleanup script
sudo nano /etc/cron.daily/cleanup-temp
```

```bash
#!/bin/bash
# Daily cleanup of temporary files older than 7 days
find /tmp -type f -mtime +7 -delete
```

```bash
# Make executable (required for cron.daily scripts)
sudo chmod +x /etc/cron.daily/cleanup-temp
```

### Custom Schedule in /etc/cron.d

```bash
# Create custom cron file
sudo nano /etc/cron.d/myapp-backup
```

```bash
# /etc/cron.d/myapp-backup
# Backup application data every 6 hours
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Note: cron.d files require username field
0 */6 * * * root /opt/myapp/backup.sh
```

## Troubleshooting Cron Jobs

### Job Not Running

1. **Check cron is running**:
```bash
sudo systemctl status cron
```

2. **Verify crontab syntax**:
```bash
# List jobs and check for errors
crontab -l
```

3. **Check permissions**:
```bash
# Script must be executable
ls -la /path/to/script.sh
chmod +x /path/to/script.sh
```

4. **Test the command manually**:
```bash
# Run the exact command from crontab
/bin/bash -c '/path/to/script.sh'
```

5. **Check cron logs**:
```bash
sudo grep CRON /var/log/syslog | tail -20
```

### Permission Issues

```bash
# Check if user is allowed to use cron
cat /etc/cron.allow
cat /etc/cron.deny

# If cron.allow exists, user must be listed
# If only cron.deny exists, user must NOT be listed
```

### Path Issues

```bash
# Find full path of commands
which python3
which mysqldump

# Use full paths in crontab
0 * * * * /usr/bin/python3 /path/to/script.py
```

### Script Works Manually But Not in Cron

Usually an environment issue:

```bash
# Debug by capturing environment
* * * * * env > /tmp/cron_env.txt

# Compare with your shell environment
env > /tmp/shell_env.txt
diff /tmp/shell_env.txt /tmp/cron_env.txt
```

## Security Considerations

1. **Don't store passwords in crontab**: Use environment files or credential stores
2. **Use least privilege**: Run jobs as unprivileged users when possible
3. **Secure scripts**: Set proper permissions (700 or 750)
4. **Audit cron jobs**: Regularly review `/etc/cron.d/` and user crontabs

```bash
# List all cron jobs on system
for user in $(cut -f1 -d: /etc/passwd); do
    crontab -u $user -l 2>/dev/null | grep -v '^#' | grep -v '^$' && echo "--- $user ---"
done
```

---

Cron is a powerful tool for automating system tasks. Start with simple jobs and gradually add complexity. Always test commands manually before scheduling, and monitor your logs to catch issues early. For more sophisticated scheduling needs, consider systemd timers as a modern alternative.
