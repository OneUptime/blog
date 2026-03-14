# How to Use at Command for One-Time Task Scheduling on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Scheduling, At Command, Automation

Description: Learn how to use the at command on Ubuntu to schedule one-time tasks that run in the future, with practical examples of time specifications and job management.

---

Cron handles recurring tasks well, but sometimes you need to run something once at a specific future time. The `at` command is designed exactly for this purpose. You give it a time and a command, and it runs the command at that time - once, with no repeat. This is useful for scheduled maintenance tasks, delayed deployments, one-time reminders, and similar situations.

## Installing at on Ubuntu

The `at` command is in the `at` package:

```bash
# Install the at package
sudo apt update
sudo apt install at

# Verify the atd daemon is running
sudo systemctl status atd

# Enable it to start on boot
sudo systemctl enable atd
```

## Scheduling a Simple Job

The basic usage is straightforward:

```bash
# Schedule a command to run at 2:30 PM today
at 14:30
# at prompts you to enter commands, one per line
# Press Ctrl+D when done
```

You can also pipe the command:

```bash
# Schedule a backup to run in 2 hours
echo "/usr/local/bin/backup.sh" | at now + 2 hours

# Schedule a script to run at 11 PM tonight
echo "/usr/local/bin/maintenance.sh" | at 11pm

# Schedule a task for tomorrow morning
echo "/usr/local/bin/morning-report.sh" | at 9am tomorrow
```

## Time Specification Format

The `at` command accepts a very flexible range of time specifications:

### Absolute Times

```bash
# Specific time today (24-hour format)
at 14:30

# Specific time with AM/PM
at 2:30 PM
at 2pm
at 14:30 today

# Specific date and time
at 14:30 March 5
at 14:30 03/05/2026
at 14:30 2026-03-05
at "2:30 PM March 5, 2026"

# POSIX-style date specification
at 14:30 050326  # MMDDYY format - March 5, 2026
```

### Relative Times

```bash
# Relative to now
at now + 5 minutes
at now + 2 hours
at now + 3 days
at now + 1 week

# Special keywords
at midnight       # 12:00 AM
at noon           # 12:00 PM
at teatime        # 4:00 PM
at tomorrow       # Same time tomorrow
at next week      # Same time next week
```

### Combining Relative and Absolute

```bash
# 3 PM tomorrow
at 3pm tomorrow

# Noon next Monday
at noon next monday

# Midnight next Friday
at midnight next friday
```

## Interactive Mode

When you run `at` without piping, it enters interactive mode:

```bash
at 11pm
# Prompt appears:
# at>
```

Type your commands at the `at>` prompt. You can enter multiple commands:

```bash
at 11pm
at> cd /var/www/html
at> git pull origin main
at> sudo systemctl restart nginx
at> echo "Deployment completed at $(date)" >> /var/log/deploy.log
at> <Ctrl+D>
```

The commands run in a subshell with your current environment captured at the time you create the job.

## Managing Scheduled Jobs

### Listing Pending Jobs

```bash
# List all pending at jobs
atq

# Or use the equivalent command
at -l

# The output format is:
# job_number  date  time  queue  username
```

Example output:

```text
5    Sun Mar  5 14:30:00 2026 a myuser
6    Mon Mar  6 09:00:00 2026 a myuser
```

### Viewing Job Details

```bash
# View the commands in job 5
at -c 5

# This shows all the environment setup and then your commands at the end
```

### Removing Pending Jobs

```bash
# Remove job number 5
atrm 5

# Remove multiple jobs
atrm 5 6 7

# Alternative command
at -r 5
```

## Output Handling

Like cron, `at` sends any output to the user's local mail. To capture output to a file instead:

```bash
# Redirect output to a log file
echo "/usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" | at 2am

# Or within the job itself
at 2am << 'EOF'
/usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
EOF
```

To suppress email entirely and write output to a file:

```bash
at 2am << 'SCRIPT'
#!/bin/bash
exec > /var/log/my-at-job.log 2>&1
echo "Starting job at $(date)"
/usr/local/bin/mycommand
echo "Job finished at $(date)"
SCRIPT
```

## Practical Use Cases

### Delayed Service Restart

When you need to restart a service but want to time it for low-traffic hours:

```bash
# Restart nginx at 3 AM
echo "sudo systemctl restart nginx" | at 3am

# Or with confirmation logging
at 3am << 'EOF'
systemctl restart nginx && echo "nginx restarted at $(date)" >> /var/log/maintenance.log
EOF
```

### One-Time Database Maintenance

```bash
# Schedule a one-time VACUUM on PostgreSQL for Saturday night
at "11pm next saturday" << 'EOF'
sudo -u postgres psql -c "VACUUM ANALYZE;" mydb >> /var/log/pg-maintenance.log 2>&1
echo "VACUUM completed at $(date)" >> /var/log/pg-maintenance.log
EOF
```

### Temporary File Cleanup

```bash
# Create some temporary files now, schedule cleanup for later
mkdir -p /tmp/processing
echo "Files created at $(date)" > /tmp/processing/status.txt

# Schedule cleanup in 24 hours
echo "rm -rf /tmp/processing" | at now + 24 hours
```

### Delayed Email or Notification

```bash
# Send yourself a reminder in 30 minutes
at now + 30 minutes << 'EOF'
echo "Time to check the deployment status" | mail -s "Deployment Reminder" admin@example.com
EOF
```

### Reverting a Configuration Change

This is a useful safety pattern: make a change and automatically revert it if you have not confirmed it is working:

```bash
# Make a firewall change
sudo ufw allow 8080/tcp

# Schedule automatic revert in 15 minutes
# This way if the change breaks something, the server will auto-recover
echo "sudo ufw delete allow 8080/tcp" | at now + 15 minutes

# If the change is good, cancel the revert job:
atq  # Note the job number
# If everything is working:
atrm [job_number]
```

## Queue Management

The `at` command supports multiple queues labeled `a` through `z`. Different queues have different priorities:

```bash
# Use a high-priority queue (letters closer to 'a' have higher priority)
echo "/usr/local/bin/urgent-task.sh" | at -q a now + 5 minutes

# Use a low-priority queue for batch jobs
echo "/usr/local/bin/batch-job.sh" | at -q z 3am

# The = queue is used for batch jobs (runs when load is low)
at -q b 3am << 'EOF'
/usr/local/bin/data-processing.sh
EOF
```

## Access Control

The `at` command respects access control files similar to cron:

```bash
# Check access control
cat /etc/at.allow   # Only users listed here can use at
cat /etc/at.deny    # Users listed here cannot use at
```

If `/etc/at.allow` exists, only listed users can schedule jobs. If only `/etc/at.deny` exists, everyone except listed users can use `at`.

```bash
# Allow a specific user
echo "webadmin" | sudo tee -a /etc/at.allow

# Or deny a specific user
echo "restricted-user" | sudo tee -a /etc/at.deny
```

## Using batch for Low-Priority Jobs

The `batch` command is closely related to `at`. It also runs a job once, but waits until the system load average drops below 1.5 (or a configured threshold):

```bash
# Run this job when the system is not busy (no specific time)
batch << 'EOF'
/usr/local/bin/heavy-processing.sh
EOF

# View batch jobs with atq (they appear in the b or = queue)
atq
```

This is useful for compute-intensive tasks that you want to run without impacting current system performance.

## Checking atd Configuration

The `atd` daemon has a few configuration options:

```bash
# Check the atd service configuration
cat /etc/default/atd

# Common configuration options:
# -l 0.8  = load threshold for batch jobs (default 1.5)
# -b 60   = minimum interval between batch jobs in seconds
```

## Summary

The `at` command fills an important gap between interactive commands and recurring cron jobs. For anything that needs to run once at a future time, `at` is the right tool. The time specification language is flexible and human-readable, covering everything from "now + 5 minutes" to "3pm next friday". Combine it with output redirection to log results, and use `atq` and `atrm` to manage the job queue. The safety-revert pattern - schedule a revert job immediately after making a risky change - is particularly useful for configuration changes on production systems.
