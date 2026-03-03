# How to Monitor Cron Job Execution and Alerting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Monitoring, Alerting, System Administration

Description: Learn how to monitor cron job execution on Ubuntu with logging, alerting on failures, detecting missed runs, and using dead man's switch services for reliable job monitoring.

---

Cron is a silent executor by default. Jobs run, succeed, fail, or silently disappear, and you often don't find out until something downstream breaks. Setting up proper cron monitoring transforms this silent executor into a supervised system where failures are caught immediately and missed runs are detected.

## Enabling Cron Logging

By default, many Ubuntu systems don't log individual cron job executions verbosely. Enable full logging:

```bash
# Check current cron logging
grep CRON /var/log/syslog | tail -5

# Enable verbose cron logging
sudo nano /etc/default/cron
```

```bash
# Add this line to /etc/default/cron
EXTRA_OPTS="-L 15"
# -L 15 logs: scheduling, job start, job end
# -L 1  logs: scheduling only
# -L 2  logs: job execution
# -L 4  logs: failed jobs
# -L 8  logs: process info
```

```bash
sudo systemctl restart cron

# Verify logging
grep CRON /var/log/syslog | tail -10
```

## Setting Up Mail Notifications

The simplest cron alerting is email - cron mails any stdout/stderr output to the user:

```bash
# Install a local mail transfer agent
sudo apt install mailutils postfix

# Test cron email notification
crontab -e
```

```bash
# Add MAILTO at the top of crontab
MAILTO=admin@example.com

# Test job that produces output
* * * * * echo "Test cron output"
```

```bash
# Set MAILTO to empty string to disable email for all jobs
# MAILTO=""

# Or per-job redirection to suppress output from successful runs
*/5 * * * * /usr/local/bin/health-check.sh > /dev/null 2>&1
# Note: this also suppresses error output, which loses failure notifications

# Better: only send output on failure
*/5 * * * * /usr/local/bin/health-check.sh 2>&1 || echo "Health check failed at $(date)"
```

## Logging Job Output to Files

For each significant cron job, log to a dedicated file with timestamps:

```bash
# In the crontab
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# Or use a wrapper that adds timestamps
0 2 * * * /usr/local/bin/cron-wrapper.sh /usr/local/bin/backup.sh backup
```

```bash
sudo nano /usr/local/bin/cron-wrapper.sh
```

```bash
#!/bin/bash
# cron-wrapper.sh - Wrapper for cron jobs with logging and alerting
# Usage: cron-wrapper.sh <command> <job-name>

COMMAND="$1"
JOB_NAME="${2:-$(basename $1)}"
LOG_FILE="/var/log/cron-jobs/${JOB_NAME}.log"
ALERT_EMAIL="admin@example.com"
LOCK_FILE="/var/run/cron-${JOB_NAME}.lock"

# Create log directory
mkdir -p /var/log/cron-jobs

# Prevent overlapping runs
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN: $JOB_NAME is already running, skipping" >> "$LOG_FILE"
    exit 0
fi

# Log start
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$START_TIME] START: $JOB_NAME" >> "$LOG_FILE"

# Run the command, capture output and exit code
OUTPUT=$(bash -c "$COMMAND" 2>&1)
EXIT_CODE=$?

END_TIME=$(date '+%Y-%m-%d %H:%M:%S')

# Log output
echo "$OUTPUT" >> "$LOG_FILE"

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$END_TIME] SUCCESS: $JOB_NAME (exit code: $EXIT_CODE)" >> "$LOG_FILE"
else
    echo "[$END_TIME] FAILED: $JOB_NAME (exit code: $EXIT_CODE)" >> "$LOG_FILE"

    # Send alert email
    echo "Cron job '$JOB_NAME' failed at $END_TIME

Exit code: $EXIT_CODE

Output:
$OUTPUT" | mail -s "CRON FAILURE: $JOB_NAME on $(hostname)" "$ALERT_EMAIL"
fi

# Keep only last 1000 lines in log
tail -1000 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"

exit $EXIT_CODE
```

```bash
sudo chmod +x /usr/local/bin/cron-wrapper.sh

# Use in crontab
0 2 * * * /usr/local/bin/cron-wrapper.sh /usr/local/bin/backup.sh "nightly-backup"
```

## Detecting Missed and Failed Runs

The critical question is: "Did the job run, and did it succeed?" A job not in the log is as bad as a failed job.

### Using Timestamps to Detect Missed Runs

```bash
sudo nano /usr/local/bin/check-cron-ran.sh
```

```bash
#!/bin/bash
# check-cron-ran.sh - Verify a job ran within the expected window

JOB_LOG="$1"
JOB_NAME="$2"
MAX_AGE_HOURS="${3:-25}"     # Default: alert if not run in 25 hours
ALERT_EMAIL="admin@example.com"

if [ ! -f "$JOB_LOG" ]; then
    echo "Job log not found: $JOB_LOG" | \
        mail -s "CRON MISSING: $JOB_NAME - Log not found" "$ALERT_EMAIL"
    exit 1
fi

# Check last modification time
LAST_MODIFIED=$(stat -c %Y "$JOB_LOG")
NOW=$(date +%s)
AGE_SECONDS=$(( NOW - LAST_MODIFIED ))
AGE_HOURS=$(( AGE_SECONDS / 3600 ))

if [ $AGE_HOURS -ge $MAX_AGE_HOURS ]; then
    echo "Job $JOB_NAME has not run in $AGE_HOURS hours (last run: $(stat -c %y $JOB_LOG))" | \
        mail -s "CRON MISSED: $JOB_NAME" "$ALERT_EMAIL"
    exit 1
fi

# Also check if last run was successful
LAST_STATUS=$(grep -E "SUCCESS|FAILED" "$JOB_LOG" | tail -1)
if echo "$LAST_STATUS" | grep -q "FAILED"; then
    echo "Job $JOB_NAME last run failed: $LAST_STATUS" | \
        mail -s "CRON FAILED: $JOB_NAME" "$ALERT_EMAIL"
    exit 1
fi

exit 0
```

```bash
sudo chmod +x /usr/local/bin/check-cron-ran.sh

# Add monitoring check to crontab (runs every hour)
0 * * * * /usr/local/bin/check-cron-ran.sh /var/log/cron-jobs/nightly-backup.log "nightly-backup" 25
```

## Using Dead Man's Switch Monitoring

A "dead man's switch" service expects your job to check in periodically. If it doesn't, the service alerts you. This is far more reliable than checking log files.

### Using Healthchecks.io

```bash
# Sign up at healthchecks.io (has a free tier)
# Create a check with the appropriate schedule
# Get your check's unique URL

# Modify your cron job to ping healthchecks.io on success
0 2 * * * /usr/local/bin/backup.sh && curl -fsS --retry 3 \
    https://hc-ping.com/your-uuid-here > /dev/null
```

Healthchecks.io will alert you if the ping doesn't arrive within the expected window.

### Self-Hosted Dead Man's Switch

```bash
# Set up a simple self-hosted heartbeat monitor using a file and systemd timer
# Create a directory for heartbeat files
sudo mkdir -p /var/run/cron-heartbeats
```

```bash
# Job sends heartbeat on completion
0 2 * * * /usr/local/bin/backup.sh && \
    date +%s > /var/run/cron-heartbeats/nightly-backup
```

```bash
# Monitoring script checks heartbeats
sudo nano /usr/local/bin/check-heartbeats.sh
```

```bash
#!/bin/bash
# check-heartbeats.sh - Check all cron heartbeats

HEARTBEAT_DIR="/var/run/cron-heartbeats"
ALERT_EMAIL="admin@example.com"

# Define expected jobs and max age in hours
declare -A JOBS
JOBS["nightly-backup"]=25
JOBS["weekly-report"]=170     # 7 days + 2 hours
JOBS["hourly-metrics"]=2

NOW=$(date +%s)
FAILED=0

for JOB in "${!JOBS[@]}"; do
    MAX_AGE=${JOBS[$JOB]}
    HEARTBEAT_FILE="${HEARTBEAT_DIR}/${JOB}"

    if [ ! -f "$HEARTBEAT_FILE" ]; then
        echo "MISSING: $JOB - No heartbeat file found"
        FAILED=1
        continue
    fi

    LAST_PING=$(cat "$HEARTBEAT_FILE")
    AGE_SECONDS=$(( NOW - LAST_PING ))
    AGE_HOURS=$(( AGE_SECONDS / 3600 ))

    if [ $AGE_HOURS -ge $MAX_AGE ]; then
        LAST_RAN=$(date -d @$LAST_PING '+%Y-%m-%d %H:%M:%S')
        echo "OVERDUE: $JOB - Last ran $AGE_HOURS hours ago at $LAST_RAN (max: $MAX_AGE hours)"
        FAILED=1
    fi
done

if [ $FAILED -ne 0 ]; then
    # Re-run and email the failures
    $0 2>&1 | mail -s "CRON MONITORING: Missed Jobs on $(hostname)" "$ALERT_EMAIL"
fi
```

```bash
sudo chmod +x /usr/local/bin/check-heartbeats.sh

# Add to crontab - runs every 30 minutes
*/30 * * * * /usr/local/bin/check-heartbeats.sh
```

## Monitoring with Prometheus and Alertmanager

For larger environments, export cron job metrics to Prometheus:

```bash
sudo nano /usr/local/bin/cron-metrics.sh
```

```bash
#!/bin/bash
# cron-metrics.sh - Update Prometheus textfile metrics after each cron job run
# Usage: source this in your cron wrapper, or call it with job name and exit code

JOB_NAME="$1"
EXIT_CODE="${2:-0}"
METRICS_DIR="/var/lib/prometheus/node-exporter"
METRICS_FILE="${METRICS_DIR}/cron_jobs.prom"

mkdir -p "$METRICS_DIR"

# Write/update metrics
cat >> "${METRICS_FILE}.tmp" << EOF
# Job: $JOB_NAME
cron_job_last_run_timestamp{job="$JOB_NAME"} $(date +%s)
cron_job_last_exit_code{job="$JOB_NAME"} $EXIT_CODE
cron_job_last_duration_seconds{job="$JOB_NAME"} $(($(date +%s) - START_EPOCH))
EOF

mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
```

This works with the node_exporter textfile collector to push metrics to Prometheus, where you can set up alerts for non-zero exit codes or missed runs.

## Log Rotation for Cron Job Logs

```bash
sudo nano /etc/logrotate.d/cron-jobs
```

```text
/var/log/cron-jobs/*.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    create 640 root adm
}
```

## Quick Status Dashboard

```bash
sudo nano /usr/local/bin/cron-status.sh
```

```bash
#!/bin/bash
# cron-status.sh - Show status of all monitored cron jobs

HEARTBEAT_DIR="/var/run/cron-heartbeats"
LOG_DIR="/var/log/cron-jobs"
NOW=$(date +%s)

echo "=== Cron Job Status Report - $(date) ==="
echo ""
printf "%-30s %-25s %-10s\n" "JOB NAME" "LAST RUN" "STATUS"
printf "%-30s %-25s %-10s\n" "--------" "--------" "------"

for HEARTBEAT in "$HEARTBEAT_DIR"/*; do
    [ -f "$HEARTBEAT" ] || continue
    JOB=$(basename "$HEARTBEAT")
    LAST_PING=$(cat "$HEARTBEAT")
    LAST_RAN=$(date -d @$LAST_PING '+%Y-%m-%d %H:%M:%S')
    AGE=$(( (NOW - LAST_PING) / 60 ))

    # Check last log entry
    LOG_FILE="$LOG_DIR/${JOB}.log"
    if [ -f "$LOG_FILE" ]; then
        LAST_STATUS=$(grep -E "SUCCESS|FAILED" "$LOG_FILE" | tail -1 | awk '{print $3}')
    else
        LAST_STATUS="NO LOG"
    fi

    printf "%-30s %-25s %-10s\n" "$JOB" "$LAST_RAN (${AGE}m ago)" "$LAST_STATUS"
done

echo ""
echo "=== Recent Failures ==="
grep -h "FAILED" "$LOG_DIR"/*.log 2>/dev/null | tail -5
```

```bash
sudo chmod +x /usr/local/bin/cron-status.sh
cron-status.sh
```

Cron monitoring requires deliberate effort because the tool was designed for the "fire and forget" era. A combination of per-job logging, heartbeat-based monitoring, and alerting on failure transforms cron from a silent executor into a supervised system. The dead man's switch pattern - where the job must actively check in to prove it ran - is the most reliable approach, as it catches both job failures and scheduling failures (e.g., cron itself not running, or the system being offline during the scheduled window).
