# How to Troubleshoot Cron Jobs Not Running on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Troubleshooting, Automation

Description: A systematic approach to diagnosing why cron jobs fail to run on Ubuntu, covering common causes from syntax errors to environment and permission issues.

---

Cron jobs that silently do nothing are a common frustration. The scheduler gives no interactive feedback - if a job is configured wrong or fails, you often find out only when you notice the expected output or side effect never appeared. This post covers the systematic approach to finding out why a cron job is not running.

## Step 1: Verify the Cron Daemon is Running

The very first thing to check is whether cron is actually running:

```bash
# Check if cron daemon is running
sudo systemctl status cron

# If it is stopped, start it
sudo systemctl start cron

# Enable it to start on boot
sudo systemctl enable cron
```

On Ubuntu, the cron daemon is in the `cron` package. If for some reason it is not installed:

```bash
sudo apt update
sudo apt install cron
```

## Step 2: Verify the Crontab Syntax

A syntax error in the crontab will silently prevent jobs from running. View the current crontab:

```bash
# View your crontab
crontab -l

# View another user's crontab (as root)
sudo crontab -u username -l

# View the system crontab
cat /etc/crontab

# List files in cron.d
ls -la /etc/cron.d/
```

Common syntax mistakes:
- Wrong number of fields (must be exactly 5 time fields + user (for /etc/crontab) + command)
- Using `%` without escaping it as `\%`
- Missing newline at the end of the crontab file

To verify, try adding a simple test job:

```bash
crontab -e
# Add this line (runs every minute, writes to a test file):
* * * * * echo "cron test $(date)" >> /tmp/cron-test.log 2>&1
```

Wait two minutes, then check:

```bash
cat /tmp/cron-test.log
```

If the file has entries, cron is working. If not, there is a system-level problem.

## Step 3: Check Cron Logs

Cron logs its activity to syslog. Check these for your job:

```bash
# On Ubuntu, cron logs go to /var/log/syslog or the journal
sudo grep CRON /var/log/syslog | tail -50

# Using journalctl
sudo journalctl -u cron -f

# Check for recent cron activity
sudo journalctl -u cron --since "1 hour ago"

# Search for your specific job
sudo grep CRON /var/log/syslog | grep "your_script_name"
```

A successfully executed cron job will show a `CMD` entry like:

```
Mar  2 10:00:01 server CRON[12345]: (user) CMD (/usr/local/bin/script.sh)
```

If you see the CMD entry but no output in your expected location, the script is running but failing. If you do not see a CMD entry at all, the schedule is wrong or cron is not picking up your crontab.

## Step 4: Check the Environment

This is the most common cause of cron job failures. Cron runs with a minimal environment - not your login shell environment:

```bash
# Cron's typical PATH
/usr/bin:/bin

# Your login shell PATH might include
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games
```

Scripts that work in your terminal fail in cron because commands like `python3`, `npm`, `composer`, or custom tools in `/usr/local/bin` are not found.

**Solutions:**

Option 1: Use full paths in your crontab:

```bash
# Instead of:
0 2 * * * python3 /home/user/script.py

# Use:
0 2 * * * /usr/bin/python3 /home/user/script.py
```

Option 2: Set PATH in the crontab:

```bash
# Add at the top of your crontab (before any job lines)
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Now jobs can use commands in /usr/local/bin
0 2 * * * mycommand /path/to/script.sh
```

Option 3: Source the environment in the script:

```bash
#!/bin/bash
# At the start of your script
source /home/user/.bashrc
# or
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

## Step 5: Check File Permissions

Scripts must be executable:

```bash
# Check if the script has execute permission
ls -la /usr/local/bin/myscript.sh

# Add execute permission if missing
chmod +x /usr/local/bin/myscript.sh
```

Also check that the cron user can read the script:

```bash
# If running as www-data, verify that user can read and execute
sudo -u www-data /usr/local/bin/myscript.sh
```

## Step 6: Check Output Redirection

Without output redirection, cron tries to email the output. If your system has no mail configured, output disappears silently. Add explicit redirection:

```bash
# Capture both stdout and stderr
0 2 * * * /usr/local/bin/script.sh >> /var/log/myscript.log 2>&1

# Discard output entirely (not recommended during debugging)
0 2 * * * /usr/local/bin/script.sh > /dev/null 2>&1

# Send stderr to a separate file
0 2 * * * /usr/local/bin/script.sh >> /var/log/script.log 2>> /var/log/script-errors.log
```

## Step 7: Run the Script as the Cron User

Test the script with the same user that cron uses:

```bash
# Run as yourself (the user whose crontab contains the job)
bash -c '/usr/local/bin/script.sh'

# Run as a different user (for /etc/crontab jobs)
sudo -u www-data /usr/local/bin/script.sh

# Simulate the minimal cron environment
env -i HOME=/home/user LOGNAME=user PATH=/usr/bin:/bin SHELL=/bin/sh \
    /usr/local/bin/script.sh
```

The `env -i` command clears the environment and sets only what cron would set. If the script fails here but works in your normal shell, you have found an environment issue.

## Step 8: Check the Script Shebang

The first line of your script must be correct:

```bash
#!/bin/bash       # Bash script
#!/usr/bin/env python3  # Python script using env to find python3
#!/usr/bin/perl   # Perl script
```

Without a shebang, cron may use `/bin/sh`, which does not support all bash features.

## Step 9: Check Cron Access Control

Ubuntu may restrict which users can use cron via access control files:

```bash
# Check if cron.allow exists (if it does, only listed users can use cron)
cat /etc/cron.allow

# Check if cron.deny exists (listed users are blocked)
cat /etc/cron.deny
```

If `/etc/cron.allow` exists and your username is not in it, cron will ignore your crontab silently. Add your username:

```bash
echo "yourusername" | sudo tee -a /etc/cron.allow
```

## Step 10: Check the Working Directory

Cron sets the working directory to the user's home directory. Scripts that rely on relative paths will fail:

```bash
# Bad: assumes the script is in /etc/myapp/
0 2 * * * cd /etc/myapp && ./script.sh

# Better: use absolute paths
0 2 * * * /etc/myapp/script.sh

# Or: set the working directory explicitly
0 2 * * * cd /var/www/html && /usr/bin/php artisan schedule:run
```

## Debugging with a Wrapper Script

Create a wrapper script that captures the full environment and output:

```bash
sudo tee /usr/local/bin/debug-wrapper.sh << 'EOF'
#!/bin/bash
# Log the environment and output of the wrapped command
LOGFILE=/tmp/cron-debug-$(date +%Y%m%d-%H%M%S).log

{
    echo "=== Date: $(date) ==="
    echo "=== Environment ==="
    env
    echo "=== Running: $@ ==="
    "$@"
    echo "=== Exit code: $? ==="
} >> "$LOGFILE" 2>&1
EOF
chmod +x /usr/local/bin/debug-wrapper.sh
```

Use it in your crontab:

```bash
0 2 * * * /usr/local/bin/debug-wrapper.sh /usr/local/bin/myscript.sh
```

Check the debug log after the scheduled time:

```bash
ls /tmp/cron-debug-*.log
cat /tmp/cron-debug-*.log
```

## Quick Checklist

When a cron job is not running, check these in order:

1. Is `cron` running? (`systemctl status cron`)
2. Is the crontab syntax correct? (check `crontab -l` carefully)
3. Are there log entries? (`grep CRON /var/log/syslog`)
4. Does the script have execute permission? (`ls -la /path/to/script.sh`)
5. Can the script find all its commands? (check PATH or use absolute paths)
6. Does output go somewhere visible? (add `>> /tmp/output.log 2>&1`)
7. Is the user allowed to use cron? (check `/etc/cron.allow`)
8. Does the script work when run manually as the cron user? (`sudo -u username script.sh`)

## Summary

Most cron job failures fall into a small number of categories: the daemon is not running, the syntax is wrong, the environment is missing required variables or paths, the script lacks execute permission, or output is going nowhere visible. Work through the checklist systematically, add logging to your script, and always test by running the script manually as the cron user. The `grep CRON /var/log/syslog` command is your primary diagnostic tool to confirm whether cron is even attempting to run your job.
