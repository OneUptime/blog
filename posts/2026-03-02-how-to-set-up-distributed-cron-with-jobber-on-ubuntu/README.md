# How to Set Up Distributed Cron with Jobber on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Automation, System Administration, Monitoring

Description: Learn how to install and configure Jobber on Ubuntu as a modern cron replacement with built-in monitoring, error handling, retry logic, and notification capabilities.

---

Jobber is a modern job scheduling tool for Unix systems that addresses cron's significant shortcomings: silent failures, no retry logic, no per-job logging, and no built-in notifications. With Jobber, each user has a single YAML jobfile, configurable error handling, automatic backoff on failure, and stdout/stderr capture. When jobs fail, you find out immediately.

The term "distributed cron" in Jobber's context refers to its ability to run jobs on multiple users' behalf with proper isolation: `jobbermaster` spawns a `jobberrunner` process per user, each reading that user's own `~/.jobber` jobfile - rather than multi-host distribution in the Hadoop sense.

## Why Jobber Over Traditional Cron?

- **Per-job run history** - `jobber log` shows the recent run record of every job, with stdout/stderr captured
- **Failure notifications** - Send an email via the system mailer or pipe a JSON run record to your own program
- **Backoff on failure** - The `Backoff` error handler retries with exponential delay until the job succeeds again
- **Error policies** - `Continue`, `Stop`, or `Backoff` on a non-zero exit
- **Per-user isolation** - Each user has their own jobfile and runner process; users without a home dir cannot schedule jobs
- **Status tracking** - `jobber list` reports each job's current status (Good, Failed, Backoff, Paused)

## Installation

```bash
# Download Jobber package

# Check https://github.com/dshearer/jobber/releases for latest version
wget https://github.com/dshearer/jobber/releases/download/v1.4.4/jobber_1.4.4-1_amd64.deb

# Install the package
sudo dpkg -i jobber_1.4.4-1_amd64.deb

# Enable and start the Jobber service
sudo systemctl enable --now jobber

# Verify installation
sudo systemctl status jobber
jobber list
```

## Configuration File Format

Each user that wants to run jobs has their own jobfile at `~/.jobber`. The file must be owned by that user and have permissions that deny group/other write access (e.g. `0600`). System-wide preferences (which users may run jobs at all) live in `/etc/jobber.conf` and are managed by the administrator - there is no `/etc/jobber.d/` for jobs, and root's jobs go in `/root/.jobber` like any other user.

```bash
# Per-user jobfile (run as the user who should own the jobs)
nano ~/.jobber
chmod 600 ~/.jobber
```

```yaml
version: 1.4
jobs:
  BackupDatabase:
    cmd: /usr/local/bin/backup-db.sh
    time: 0 0 2          # Daily at 02:00 (sec min hour [mday mon wday])
    onError: Continue
    notifyOnError:
      - type: program
        path: /usr/local/bin/notify-failure.sh
    notifyOnFailure:
      - type: program
        path: /usr/local/bin/notify-failure.sh
```

> Jobber's time format is **six fields**: `second minute hour day-of-month month day-of-week`. Trailing fields default to `*` if omitted. This is **not** standard 5-field cron syntax - `0 2 * * *` would parse as "second=0, minute=2, hour=*, mday=*, mon=*" and run far more often than once a day.

## Job Configuration Options

```yaml
version: 1.4

# Optional: define result sinks once with YAML anchors and reuse them.
resultSinks:
  - &alert
    type: program
    path: /usr/local/bin/alert.sh
  - &critical
    type: program
    path: /usr/local/bin/critical-alert.sh
  - &logSuccess
    type: program
    path: /usr/local/bin/log-success.sh
  - &sysEmail
    type: system-email   # Sends mail via the local sendmail to the job's user

jobs:
  ExampleJob:
    # The command, run via /bin/sh -c
    cmd: /path/to/script.sh

    # Schedule: 6 fields (sec min hour mday mon wday). Supports *, */N,
    # comma lists (1,4,7), ranges (0-5), and random pickers (R, R2-4).
    # Trailing fields default to *.
    time: 0 30 3                # Daily at 03:30:00

    # Error policy:
    #   Continue - reschedule normally on non-zero exit (default)
    #   Stop     - stop scheduling after a non-zero exit
    #   Backoff  - exponential backoff until the job succeeds again
    onError: Continue

    # Notifications: a list of result sinks. Supported types are
    # 'program', 'system-email', 'stdout', 'filesystem', and 'socket'.
    notifyOnError:              # Fires on every non-zero exit
      - *alert
      - *sysEmail

    notifyOnFailure:            # Fires when onError=Stop deactivates the job
      - *critical

    notifyOnSuccess:            # Optional: fires on every successful run
      - *logSuccess
```

Jobber v1.4 deliberately keeps the per-job schema small. A few things you might expect from cron-replacement tools are **not** configurable per job in the jobfile:

- There is no `dir`, `env`, or `stdin` field - bake those into the command (`cd /var/lib/myapp && DATABASE_URL=... /path/to/script.sh`) or call a wrapper shell script.
- `Backoff` is automatic exponential backoff; there are no `retryCount` or `retryDelay` knobs.
- `system-email` takes no parameters - it sends mail to the job's owning user via the local `sendmail` binary. If you need a specific recipient, use a `program` sink that shells out to `mail`.

## Practical Job Examples

### Database Backup with Backoff

```yaml
version: 1.4
jobs:
  PostgresBackup:
    cmd: cd /tmp && pg_dump production | gzip > /var/backups/postgres/$(date +%Y%m%d).sql.gz
    time: 0 0 2                  # Daily at 02:00
    onError: Backoff             # Exponential backoff until a run succeeds
    notifyOnError:
      - type: program
        path: /usr/local/bin/slack-notify.sh
```

### Log Cleanup with Error Handling

```yaml
  LogCleanup:
    cmd: find /var/log/app -name "*.log" -mtime +30 -delete
    time: 0 0 4 * * 0            # Every Sunday at 04:00
    onError: Continue            # Log cleanup failure shouldn't stop future runs
    notifyOnError:
      - type: program
        path: /usr/local/bin/alert.sh
```

### Health Check Every 5 Minutes

```yaml
  AppHealthCheck:
    cmd: curl -sf http://localhost:8080/health
    time: 0 */5 *                # Every 5 minutes, on the minute
    onError: Continue
    notifyOnError:
      - type: program
        path: /usr/local/bin/page-oncall.sh
```

### Jobs with Environment Variables

Jobber v1.4 has no `env` field in the jobfile schema - set environment variables inline in the command, or call a wrapper script that exports them:

```yaml
  DataSync:
    cmd: >-
      DB_HOST=10.0.0.5 DB_NAME=production DB_USER=syncuser
      DB_PASSWORD=secretpassword LOG_LEVEL=INFO
      python3 /opt/app/sync.py
    time: 0 */15 *                # Every 15 minutes
    onError: Stop                 # Critical job - stop scheduling if it fails
    notifyOnFailure:
      - type: program
        path: /usr/local/bin/critical-alert.sh
```

For real secrets, prefer a wrapper script that reads them from a protected file (`source /etc/datasync.env && exec python3 /opt/app/sync.py`) rather than embedding them in the jobfile.

## Notification Scripts

For a `program` result sink, Jobber executes the program and writes a **JSON run record to its stdin**. The script should read stdin (no command-line args, no special environment variables) and pull fields out of the JSON. The record looks roughly like:

```json
{
  "version": "1.4",
  "job": {
    "name": "PostgresBackup",
    "command": "pg_dump production | gzip > ...",
    "time": "0 0 2 * * *",
    "status": "Good"
  },
  "user": "postgres",
  "startTime": 1740000000,
  "succeeded": false,
  "fate": 2,
  "stdout": "...",
  "stderr": "..."
}
```

A simple alert script using `jq` to parse the record:

```bash
sudo nano /usr/local/bin/alert.sh
```

```bash
#!/bin/bash
# alert.sh - Called by Jobber on job failure. Jobber writes a JSON
# run record to this script's stdin.

REC=$(cat)

JOB_NAME=$(echo "$REC"  | jq -r '.job.name')
JOB_CMD=$(echo "$REC"   | jq -r '.job.command')
JOB_TIME=$(echo "$REC"  | jq -r '.job.time')
SUCCEEDED=$(echo "$REC" | jq -r '.succeeded')
STDOUT=$(echo "$REC"    | jq -r '.stdout // ""')
STDERR=$(echo "$REC"    | jq -r '.stderr // ""')

SUBJECT="Jobber: Job Failed - $JOB_NAME"
BODY="Job: $JOB_NAME
Command: $JOB_CMD
Schedule: $JOB_TIME
Succeeded: $SUCCEEDED

Stdout:
$STDOUT

Stderr:
$STDERR"

echo "$BODY" | mail -s "$SUBJECT" admin@example.com
```

```bash
sudo chmod +x /usr/local/bin/alert.sh
sudo apt-get install -y jq
```

```bash
# Slack notification via webhook
sudo nano /usr/local/bin/slack-notify.sh
```

```bash
#!/bin/bash
# slack-notify.sh - Send Slack notification on job failure.
# Jobber pipes the JSON run record to stdin.

WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
HOSTNAME=$(hostname)

REC=$(cat)
JOB_NAME=$(echo "$REC" | jq -r '.job.name')
JOB_CMD=$(echo "$REC"  | jq -r '.job.command')
STDERR=$(echo "$REC"   | jq -r '.stderr // ""')

PAYLOAD=$(jq -n \
    --arg name "$JOB_NAME" \
    --arg host "$HOSTNAME" \
    --arg cmd  "$JOB_CMD" \
    --arg err  "$STDERR" \
    '{
        text: ":warning: Job Failed on \($host)",
        blocks: [{
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*Job Failed:* \($name)\n*Host:* \($host)\n*Command:* \($cmd)\n*Stderr:*\n```\($err)```"
            }
        }]
    }')

curl -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    --data "$PAYLOAD"
```

## Managing Jobs via CLI

The `jobber` client talks to *your* user's `jobberrunner` process, so you do not need `sudo` to manage your own jobs - and `sudo jobber ...` would actually run against root's jobs, not yours.

```bash
# List all of the current user's jobs and their status
jobber list

# Run a job immediately (out of schedule)
jobber test BackupDatabase

# Pause a job (stop scheduling temporarily)
jobber pause BackupDatabase

# Resume a paused job
jobber resume BackupDatabase

# Reload the jobfile after editing ~/.jobber
jobber reload

# Print the recent run history for all jobs
jobber log

# Print the script that would run for a job
jobber cat BackupDatabase
```

## Per-User Jobs

Per-user jobs are in fact the *only* way Jobber runs jobs - every user who wants to schedule work has their own `~/.jobber` file, and `jobbermaster` spawns a `jobberrunner` process per user whose home directory passes the ownership/permission checks.

```bash
# Create or edit your jobfile
nano ~/.jobber
chmod 600 ~/.jobber
```

```yaml
version: 1.4
jobs:
  MyBackup:
    cmd: rsync -av ~/documents/ /backup/documents/
    time: 0 0 23                 # Daily at 23:00
    onError: Continue
    notifyOnError:
      - type: program
        path: /usr/local/bin/mail-notify.sh
```

```bash
# After editing, ask the runner to pick up the new jobfile
jobber reload
jobber list
```

## Monitoring Job Status

```bash
# Quick status of all jobs (columns: NAME, STATUS, SEC, MIN, HOUR, MDAY, MON, WDAY, NEXT RUN TIME, NOTIFY ON ERR, ...)
jobber list

# Flag jobs that are not in the Good state
jobber list | awk 'NR>1 && $2 != "Good"'

# Recent run history for all jobs - shows when each ran and whether it succeeded
jobber log
```

A job's `STATUS` will be one of `Good`, `Failed`, `Backoff`, or `Paused`. `Failed` is the terminal state set by the `Stop` error handler; `Backoff` means the job is currently being retried with exponential delay.

## Persistent Run Logs

By default Jobber keeps an in-memory ring buffer of recent runs per user (visible via `jobber log`). To persist the run log to disk so it survives a restart, set the `runLog` preference in the user's own jobfile (`~/.jobber`):

```yaml
version: 1.4
prefs:
  runLog:
    type: file
    path: /home/myuser/jobber/runlog
    maxFileLen: 50m
    maxHistories: 10
jobs:
  # ...
```

The path must be a location the jobfile's user can write to. After editing, run `jobber reload`. There is no `/etc/jobber.yaml` - Jobber's only system-wide config file is `/etc/jobber.conf`, which controls which users may run jobs (via `users-include` / `users-exclude`), not job or runlog settings.

## Comparing Jobber vs cron vs systemd timers

| Feature | cron | systemd timers | Jobber |
|---------|------|----------------|--------|
| YAML config | No | No (INI) | Yes |
| Retry on failure | No | Via `Restart=` on the unit | Yes, exponential `Backoff` |
| Per-job run history | Mail on output | Via journald | Yes, `jobber log` |
| Failure notifications | Via mail | Via `OnFailure=` unit | Yes, `program` / `system-email` sinks |
| Programmatic control | crontab editing | `systemctl` | `jobber` CLI (no HTTP API) |
| Error policies | No | Limited | Continue / Stop / Backoff |
| Environment variables | Limited | Yes (in unit file) | In the command string only |
| User-level jobs | Yes | User units | Yes (one jobfile per user) |

Jobber fills a specific niche: it's more capable than cron with far less configuration overhead than systemd timers for straightforward scheduling tasks. Its `Backoff` handler, error policies, and built-in notification system make it particularly well-suited for production job scheduling where failures need immediate attention.
