# How to Set Up Service Health Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, Systemd, Health Checks, DevOps

Description: Learn how to configure service health monitoring on Ubuntu using systemd watchdog, custom health check scripts, and alerting to detect and respond to service failures automatically.

---

Running services on Ubuntu without health monitoring means failures go unnoticed until users report them. Effective health monitoring goes beyond checking whether a process is running - it verifies the service is actually responding correctly, detects degraded states, and triggers alerts or automatic recovery actions. This guide covers multiple approaches to service health monitoring on Ubuntu, from systemd's built-in watchdog mechanism to custom scripts and integration with monitoring systems.

## systemd Service Monitoring Basics

systemd tracks whether service processes are running and can restart them on failure. This is the baseline - configure it correctly for every service.

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application
After=network.target

[Service]
ExecStart=/opt/myapp/bin/myapp
User=myapp

# Restart behavior
Restart=on-failure        # Restart when process exits with non-zero code
RestartSec=5              # Wait 5 seconds before restarting
StartLimitIntervalSec=60  # Count restart attempts within 60 seconds
StartLimitBurst=5         # Allow maximum 5 restarts within the interval
# After 5 failures in 60 seconds, systemd stops trying

[Install]
WantedBy=multi-user.target
```

Check service failure history:

```bash
# View service restart count and recent failures
systemctl status myapp.service

# View last N lines of service journal
journalctl -u myapp.service -n 50

# Follow service logs in real time
journalctl -u myapp.service -f

# Show only error-level messages
journalctl -u myapp.service -p err --since "24 hours ago"
```

## systemd Watchdog Integration

The systemd watchdog mechanism lets applications signal their health status directly. If a service fails to send a watchdog notification within the timeout, systemd considers the service unhealthy and restarts it. This catches hung processes that are technically running but not responding.

```ini
# /etc/systemd/system/myapp.service
[Service]
ExecStart=/opt/myapp/bin/myapp
WatchdogSec=30s          # Service must ping watchdog every 30 seconds
Restart=on-watchdog      # Restart if watchdog ping times out
NotifyAccess=main        # Only main process can send watchdog pings
```

The application must use the `sd_notify(3)` function to send watchdog pings. Here's an example in Python:

```python
# myapp.py - Application with systemd watchdog support
import time
import socket
import os
import threading

def watchdog_notifier():
    """Send watchdog keepalive pings to systemd"""
    notify_socket = os.environ.get("NOTIFY_SOCKET")
    if not notify_socket:
        return  # Not running under systemd

    sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
    try:
        sock.connect(notify_socket)
    except Exception:
        return

    # Get watchdog interval - ping at half the watchdog timeout
    watchdog_usec = int(os.environ.get("WATCHDOG_USEC", 30000000))
    interval = watchdog_usec / 1000000 / 2  # Half the timeout in seconds

    while True:
        try:
            # Send watchdog keepalive
            sock.send(b"WATCHDOG=1")
        except Exception as e:
            print(f"Failed to notify watchdog: {e}")
        time.sleep(interval)

def main():
    # Signal systemd that the service has started successfully
    notify_socket = os.environ.get("NOTIFY_SOCKET")
    if notify_socket:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
        sock.connect(notify_socket)
        sock.send(b"READY=1")  # Service is ready

    # Start watchdog thread
    wd_thread = threading.Thread(target=watchdog_notifier, daemon=True)
    wd_thread.start()

    # Main application loop
    while True:
        # Do actual work here
        time.sleep(1)

if __name__ == "__main__":
    main()
```

## Custom Health Check Scripts

For services that don't support the watchdog protocol, write external health check scripts that verify the service is functioning correctly.

```bash
#!/bin/bash
# /usr/local/bin/check-nginx-health.sh
# Verifies nginx is responding correctly, not just running

SERVICE="nginx"
HEALTH_URL="http://localhost/health"
TIMEOUT=5
LOG_FILE="/var/log/health-checks.log"
ALERT_EMAIL="ops@example.com"

timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# Check 1: Process is running
if ! systemctl is-active --quiet "$SERVICE"; then
    echo "$(timestamp) CRITICAL: $SERVICE process not running, attempting restart" >> "$LOG_FILE"
    systemctl restart "$SERVICE"
    if systemctl is-active --quiet "$SERVICE"; then
        echo "$(timestamp) INFO: $SERVICE restarted successfully" >> "$LOG_FILE"
    else
        echo "$(timestamp) CRITICAL: $SERVICE failed to restart" >> "$LOG_FILE"
        echo "CRITICAL: nginx failed to restart on $(hostname)" | \
            mail -s "Service Alert: nginx down" "$ALERT_EMAIL"
    fi
    exit 1
fi

# Check 2: HTTP endpoint responds with 200
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --connect-timeout "$TIMEOUT" \
    --max-time "$((TIMEOUT * 2))" \
    "$HEALTH_URL")

if [[ "$HTTP_CODE" != "200" ]]; then
    echo "$(timestamp) WARNING: $SERVICE health endpoint returned HTTP $HTTP_CODE" >> "$LOG_FILE"
    # Could add alerting or restart logic here
    exit 1
fi

# Check 3: Response time is acceptable (under 2 seconds)
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" \
    --connect-timeout "$TIMEOUT" \
    "$HEALTH_URL")

# Compare using awk for floating point comparison
TOO_SLOW=$(echo "$RESPONSE_TIME 2.0" | awk '{print ($1 > $2)}')
if [[ "$TOO_SLOW" == "1" ]]; then
    echo "$(timestamp) WARNING: $SERVICE response time ${RESPONSE_TIME}s exceeds threshold" >> "$LOG_FILE"
fi

echo "$(timestamp) OK: $SERVICE healthy (HTTP $HTTP_CODE, ${RESPONSE_TIME}s)" >> "$LOG_FILE"
exit 0
```

## Creating a systemd Service for Health Checks

Rather than using cron, run health checks as systemd services with timers for better control:

```ini
# /etc/systemd/system/nginx-health-check.service
[Unit]
Description=Nginx Health Check
After=nginx.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/check-nginx-health.sh
User=root
StandardOutput=journal
StandardError=journal
```

```ini
# /etc/systemd/system/nginx-health-check.timer
[Unit]
Description=Run nginx health check every minute

[Timer]
OnBootSec=60          # First run 60 seconds after boot
OnUnitActiveSec=60    # Then every 60 seconds
AccuracySec=10        # Allow up to 10s variance for power saving

[Install]
WantedBy=timers.target
```

```bash
# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable --now nginx-health-check.timer

# Check timer status
systemctl list-timers nginx-health-check.timer

# Manually trigger the health check
sudo systemctl start nginx-health-check.service

# View health check results
journalctl -u nginx-health-check.service --since "1 hour ago"
```

## Database Health Monitoring

Databases need more comprehensive health checks than just a port check:

```bash
#!/bin/bash
# /usr/local/bin/check-postgres-health.sh
# Checks PostgreSQL is accepting connections and queries respond in time

PG_USER="postgres"
PG_DB="myapp"
MAX_CONNECTIONS_PERCENT=80  # Alert if connection usage exceeds 80%
LOG_FILE="/var/log/health-checks.log"
ALERT_HOOK="https://hooks.slack.com/services/xxx/yyy/zzz"

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }

# Check 1: Can we connect and run a simple query
if ! PGPASSWORD="" psql -U "$PG_USER" -d "$PG_DB" \
    -c "SELECT 1" -q -t > /dev/null 2>&1; then
    echo "$(timestamp) CRITICAL: PostgreSQL connection failed" >> "$LOG_FILE"
    exit 2
fi

# Check 2: Connection count within limits
CONN_RESULT=$(psql -U "$PG_USER" -d "$PG_DB" -t -q << 'SQL'
SELECT round(count(*)::numeric / max_conn * 100)
FROM pg_stat_activity,
     (SELECT setting::integer AS max_conn FROM pg_settings WHERE name='max_connections') mc;
SQL
)

CONN_PERCENT=$(echo "$CONN_RESULT" | tr -d ' ')
if [[ "$CONN_PERCENT" -gt "$MAX_CONNECTIONS_PERCENT" ]]; then
    echo "$(timestamp) WARNING: PostgreSQL connection usage at ${CONN_PERCENT}%" >> "$LOG_FILE"
fi

# Check 3: No long-running queries (over 5 minutes)
LONG_QUERIES=$(psql -U "$PG_USER" -d "$PG_DB" -t -q << 'SQL'
SELECT count(*) FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < now() - interval '5 minutes'
  AND query NOT LIKE '%pg_stat_activity%';
SQL
)

LONG_COUNT=$(echo "$LONG_QUERIES" | tr -d ' ')
if [[ "$LONG_COUNT" -gt 0 ]]; then
    echo "$(timestamp) WARNING: $LONG_COUNT long-running queries detected" >> "$LOG_FILE"
fi

echo "$(timestamp) OK: PostgreSQL healthy (connections: ${CONN_PERCENT}%)" >> "$LOG_FILE"
```

## Alerting via Webhook on Failures

For services that fail after the restart limit is reached, systemd can trigger an alert:

```bash
#!/bin/bash
# /usr/local/bin/systemd-failure-alert.sh
# Called by systemd OnFailure to send an alert

SERVICE_NAME="$1"
HOSTNAME=$(hostname -f)
SLACK_WEBHOOK="https://hooks.slack.com/services/xxx/yyy/zzz"

# Get recent journal entries for context
JOURNAL=$(journalctl -u "$SERVICE_NAME" --since "5 minutes ago" -n 20 --no-pager 2>/dev/null)

# Send Slack notification
curl -s -X POST "$SLACK_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"*CRITICAL: Service Failure on ${HOSTNAME}*\",
    \"attachments\": [{
      \"color\": \"danger\",
      \"title\": \"Service: ${SERVICE_NAME}\",
      \"text\": \"\`\`\`${JOURNAL}\`\`\`\",
      \"footer\": \"$(date)\"
    }]
  }"
```

Wire it into service files:

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application
# Call alert script when service enters failed state
OnFailure=service-failure-alert@%n.service

[Service]
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5
```

```ini
# /etc/systemd/system/service-failure-alert@.service
# Template service for failure notifications
[Unit]
Description=Alert on failure of %i

[Service]
Type=oneshot
ExecStart=/usr/local/bin/systemd-failure-alert.sh %i
```

## Aggregating Health Status

For servers running multiple services, a simple dashboard script helps:

```bash
#!/bin/bash
# /usr/local/bin/service-health-summary.sh
# Shows health status of all monitored services

SERVICES=(nginx postgresql redis myapp)

echo "=== Service Health Summary - $(hostname) - $(date) ==="
echo ""

ALL_OK=true

for SERVICE in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$SERVICE"; then
        STATUS="OK"
        COLOR="\033[0;32m"
    else
        STATUS="FAILED"
        COLOR="\033[0;31m"
        ALL_OK=false
    fi

    UPTIME=$(systemctl show "$SERVICE" -p ActiveEnterTimestamp --value)
    echo -e "${COLOR}[$STATUS]\033[0m $SERVICE (since: $UPTIME)"
done

echo ""
if $ALL_OK; then
    echo "All services healthy"
    exit 0
else
    echo "One or more services are failing"
    exit 1
fi
```

This combination of systemd restart policies, watchdog integration, custom health check scripts, and alerting webhooks gives you comprehensive service health monitoring on Ubuntu without requiring a separate monitoring platform for basic reliability.
