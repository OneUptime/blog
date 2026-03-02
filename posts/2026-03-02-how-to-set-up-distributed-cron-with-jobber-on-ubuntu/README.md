# How to Set Up Distributed Cron with Jobber on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Automation, System Administration, Monitoring

Description: Learn how to install and configure Jobber on Ubuntu as a modern cron replacement with built-in monitoring, error handling, retry logic, and notification capabilities.

---

Jobber is a modern job scheduling tool for Unix systems that addresses cron's significant shortcomings: silent failures, no retry logic, no per-job logging, and no built-in notifications. With Jobber, each job has a configuration file, configurable error handling, retry policies, and stdout/stderr capture. When jobs fail, you find out immediately.

The term "distributed cron" in Jobber's context refers more to its ability to run jobs on multiple users' behalf with proper isolation, and its REST API that enables external orchestration - rather than multi-host distribution in the Hadoop sense.

## Why Jobber Over Traditional Cron?

- **Per-job logging** - Each job's output is logged separately
- **Failure notifications** - Email or command-based alerts on job failure
- **Retry logic** - Automatically retry failed jobs with configurable backoff
- **Error policies** - Stop, deactivate, or continue on failure
- **REST API** - Programmatic control and monitoring
- **Status tracking** - Query when each job last ran and what the outcome was

## Installation

```bash
# Download Jobber package
# Check https://github.com/dshearer/jobber/releases for latest version
wget https://github.com/dshearer/jobber/releases/download/v1.4.4/jobber_1.4.4_linux_amd64.deb

# Install the package
sudo dpkg -i jobber_1.4.4_linux_amd64.deb

# Enable and start the Jobber service
sudo systemctl enable --now jobber

# Verify installation
sudo systemctl status jobber
jobber ls
```

## Configuration File Format

Jobber uses YAML configuration files. The system-wide jobs go in `/etc/jobber.d/`, and per-user jobs go in `~/.jobber`.

```bash
# System-level job configuration
sudo nano /etc/jobber.d/system-jobs.yaml
```

```yaml
---
version: 1.4
jobs:
  - name: BackupDatabase
    cmd: /usr/local/bin/backup-db.sh
    time: "0 2 * * *"    # Daily at 2 AM (cron syntax)
    onError: Continue
    notifyOnError:
      - type: program
        path: /usr/local/bin/notify-failure.sh
    notifyOnFailure:
      - type: program
        path: /usr/local/bin/notify-failure.sh
```

## Job Configuration Options

```yaml
---
version: 1.4
jobs:
  - name: ExampleJob
    # The command to run
    cmd: /path/to/script.sh

    # Schedule: cron syntax or special @intervals
    # time: "minute hour day month weekday"
    # time: "@every 1h30m"
    # time: "@hourly"  "@daily"  "@weekly"  "@monthly"
    time: "30 3 * * *"

    # Working directory
    dir: /var/lib/myapp

    # Environment variables
    env:
      DATABASE_URL: "postgres://user:pass@localhost/db"
      APP_ENV: "production"

    # Standard input
    stdin: ""

    # Time between start and timeout
    # notifyOnError fires when the job exits with non-zero
    onError: Continue      # Continue (keep scheduling) | Stop (don't run again) | Backoff (retry with increasing delay)

    # Retry behavior (when onError is Backoff)
    # retryCount: 3
    # retryDelay: 5s

    # Notifications
    notifyOnError:
      - type: program
        path: /usr/local/bin/alert.sh
      - type: email
        recipients:
          - admin@example.com
        # Requires Jobber be configured with a mail server

    notifyOnFailure:   # Fires when job is deactivated due to errors
      - type: program
        path: /usr/local/bin/critical-alert.sh

    notifyOnSuccess:   # Optional: notify on success too
      - type: program
        path: /usr/local/bin/log-success.sh
```

## Practical Job Examples

### Database Backup with Retry

```yaml
---
version: 1.4
jobs:
  - name: PostgresBackup
    cmd: pg_dump production | gzip > /var/backups/postgres/$(date +%Y%m%d).sql.gz
    time: "0 2 * * *"
    dir: /tmp
    onError: Backoff
    notifyOnError:
      - type: program
        path: /usr/local/bin/slack-notify.sh
```

### Log Cleanup with Error Handling

```yaml
  - name: LogCleanup
    cmd: find /var/log/app -name "*.log" -mtime +30 -delete
    time: "0 4 * * 0"    # Every Sunday at 4 AM
    onError: Continue     # Log cleanup failure shouldn't stop future runs
    notifyOnError:
      - type: program
        path: /usr/local/bin/alert.sh
```

### Health Check Every 5 Minutes

```yaml
  - name: AppHealthCheck
    cmd: curl -sf http://localhost:8080/health || exit 1
    time: "*/5 * * * *"
    onError: Continue
    notifyOnError:
      - type: program
        path: /usr/local/bin/page-oncall.sh
```

### Jobs with Environment Variables

```yaml
  - name: DataSync
    cmd: python3 /opt/app/sync.py
    time: "@every 15m"
    env:
      DB_HOST: "10.0.0.5"
      DB_NAME: "production"
      DB_USER: "syncuser"
      DB_PASSWORD: "secretpassword"
      LOG_LEVEL: "INFO"
    onError: Stop       # Critical job - stop if it fails
    notifyOnFailure:
      - type: program
        path: /usr/local/bin/critical-alert.sh
```

## Notification Scripts

Jobber passes information about the failed job to notification programs via environment variables:

```bash
sudo nano /usr/local/bin/alert.sh
```

```bash
#!/bin/bash
# alert.sh - Called by Jobber when a job fails
# Jobber sets these environment variables:
# JOB_NAME       - Name of the job
# JOB_CMD        - Command that was run
# JOB_TIME       - Schedule expression
# JOB_STATUS     - Job status (0=succeeded, 1=failed, ...)
# JOB_OUTPUT     - Combined stdout/stderr of the job

SUBJECT="Jobber: Job Failed - $JOB_NAME"
BODY="Job: $JOB_NAME
Command: $JOB_CMD
Schedule: $JOB_TIME
Status: $JOB_STATUS

Output:
$JOB_OUTPUT"

echo "$BODY" | mail -s "$SUBJECT" admin@example.com
```

```bash
sudo chmod +x /usr/local/bin/alert.sh
```

```bash
# Slack notification via webhook
sudo nano /usr/local/bin/slack-notify.sh
```

```bash
#!/bin/bash
# slack-notify.sh - Send Slack notification on job failure

WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
HOSTNAME=$(hostname)

curl -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{
        \"text\": \":warning: Job Failed on $HOSTNAME\",
        \"blocks\": [
            {
                \"type\": \"section\",
                \"text\": {
                    \"type\": \"mrkdwn\",
                    \"text\": \"*Job Failed:* $JOB_NAME\n*Host:* $HOSTNAME\n*Command:* $JOB_CMD\n*Output:*\n\`\`\`$JOB_OUTPUT\`\`\`\"
                }
            }
        ]
    }"
```

## Managing Jobs via CLI

```bash
# List all jobs and their status
jobber ls

# View job details
jobber ls -v

# Run a job immediately
sudo jobber run BackupDatabase

# Pause a job (stop scheduling temporarily)
sudo jobber pause BackupDatabase

# Resume a paused job
sudo jobber resume BackupDatabase

# Reload configuration after changes
sudo jobber reload

# View job output log
sudo jobber log BackupDatabase

# View last 20 log entries across all jobs
sudo jobber log -n 20
```

## Per-User Jobs

Users can manage their own Jobber jobs without root access:

```bash
# Create user-level job file
nano ~/.jobber
```

```yaml
---
version: 1.4
jobs:
  - name: MyBackup
    cmd: rsync -av ~/documents/ /backup/documents/
    time: "0 23 * * *"
    onError: Continue
    notifyOnError:
      - type: program
        path: /usr/local/bin/mail-notify.sh
```

```bash
# The user-level jobber binary communicates with the daemon
jobber ls
jobber reload
```

## Monitoring Job Status

```bash
# Quick status of all jobs
jobber ls
# Output:
# NAME             STATUS    SCHEDULE
# BackupDatabase   Good      0 2 * * *
# LogCleanup       Good      0 4 * * 0
# AppHealthCheck   Failed    */5 * * * *

# Check if any jobs are in failed state
jobber ls | grep -v Good

# Detailed view including last run time
jobber ls -v

# View the log for a specific failing job
jobber log AppHealthCheck

# View last run output
sudo jobber log -n 1 AppHealthCheck
```

## Using the REST API

Jobber exposes an HTTP API for programmatic control. Enable it in the Jobber configuration:

```bash
sudo nano /etc/jobber.yaml
```

```yaml
prefs:
  runLog:
    type: file
    path: /var/log/jobber/jobber.log
    maxFileLen: 50M
    maxHistories: 10
```

```bash
# The API is available on a Unix socket by default
# Query job status
curl --unix-socket /var/run/jobber/jobber.sock http://localhost/v1/jobs

# Trigger a job
curl --unix-socket /var/run/jobber/jobber.sock \
    -X POST http://localhost/v1/jobs/BackupDatabase/run
```

## Comparing Jobber vs cron vs systemd timers

| Feature | cron | systemd timers | Jobber |
|---------|------|----------------|--------|
| YAML config | No | No (INI) | Yes |
| Retry logic | No | Via service config | Yes, built-in |
| Per-job logging | No | Via journald | Yes, dedicated log |
| Failure notifications | Via mail | Via OnFailure= | Yes, configurable |
| REST API | No | Via systemctl | Yes |
| Error policies | No | Limited | Yes (Stop/Continue/Backoff) |
| Environment variables | Limited | Yes | Yes |
| User-level jobs | Yes | Limited | Yes |

Jobber fills a specific niche: it's more capable than cron with far less configuration overhead than systemd timers for straightforward scheduling tasks. Its retry logic, error policies, and built-in notification system make it particularly well-suited for production job scheduling where failures need immediate attention.
