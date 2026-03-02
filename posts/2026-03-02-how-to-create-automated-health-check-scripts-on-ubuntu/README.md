# How to Create Automated Health Check Scripts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Automation, Monitoring, Shell

Description: Build robust automated health check scripts for Ubuntu servers that monitor services, resources, and connectivity, with alerting and self-healing capabilities.

---

A health check script is a piece of automation that periodically tests whether your systems are functioning correctly and takes action when they are not. This can range from a simple "is this service running" check to a complex end-to-end validation that exercises your application's critical paths.

## Designing a Health Check

Good health checks share a few qualities:

- **Idempotent** - running the check multiple times does not affect the system's state
- **Fast** - health checks run frequently, so they need to complete quickly
- **Specific** - test the thing that actually matters (the service responding on port 443), not a proxy for it (the process is running)
- **Actionable** - the check either fixes the problem or alerts a human with enough context to act

## Basic Service Health Check

Start with a simple script that checks multiple services and reports failures.

```bash
#!/bin/bash
# /usr/local/bin/health-check.sh
# Basic service health check with alerting

set -euo pipefail

# Configuration
ALERT_EMAIL="ops@example.com"
LOG_FILE="/var/log/health-check.log"
HOSTNAME=$(hostname -f)

# Services to check
SERVICES=(
    "nginx"
    "postgresql"
    "redis-server"
    "myapp"
)

# Initialize tracking variables
FAILED_SERVICES=()
ALL_OK=true

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$HOSTNAME] $*" | tee -a "$LOG_FILE"
}

check_service() {
    local service="$1"
    if systemctl is-active --quiet "$service"; then
        log "OK: $service is running"
        return 0
    else
        log "FAIL: $service is not running"
        FAILED_SERVICES+=("$service")
        ALL_OK=false
        return 1
    fi
}

send_alert() {
    local subject="$1"
    local body="$2"
    echo "$body" | mail -s "$subject" "$ALERT_EMAIL"
}

# Run checks
log "=== Health check started ==="

for service in "${SERVICES[@]}"; do
    check_service "$service" || true
done

# Report
if [ "$ALL_OK" = false ]; then
    FAILED_LIST=$(printf '%s\n' "${FAILED_SERVICES[@]}")
    ALERT_MSG="The following services are down on $HOSTNAME:\n\n$FAILED_LIST\n\nTime: $(date)"
    log "ALERT: Sending notification for failed services"
    send_alert "SERVICE ALERT: Failures on $HOSTNAME" "$ALERT_MSG"
else
    log "All services healthy"
fi

log "=== Health check completed ==="
```

## Port and Network Connectivity Checks

Checking that a process is running does not guarantee it is actually serving traffic. Test the port directly.

```bash
#!/bin/bash
# Check network endpoints
check_port() {
    local host="$1"
    local port="$2"
    local timeout="${3:-5}"

    if timeout "$timeout" bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
        echo "OK: $host:$port is reachable"
        return 0
    else
        echo "FAIL: $host:$port is not reachable"
        return 1
    fi
}

# Check HTTP endpoint and response code
check_http() {
    local url="$1"
    local expected_code="${2:-200}"
    local timeout="${3:-10}"

    local actual_code
    actual_code=$(curl -s -o /dev/null -w '%{http_code}' \
        --max-time "$timeout" \
        --connect-timeout 5 \
        "$url")

    if [ "$actual_code" = "$expected_code" ]; then
        echo "OK: $url returned $actual_code"
        return 0
    else
        echo "FAIL: $url returned $actual_code (expected $expected_code)"
        return 1
    fi
}

# Check HTTPS with certificate validation
check_ssl_cert() {
    local host="$1"
    local port="${2:-443}"
    local days_warning="${3:-30}"

    local expiry
    expiry=$(echo | openssl s_client -connect "$host:$port" -servername "$host" 2>/dev/null | \
        openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

    if [ -z "$expiry" ]; then
        echo "FAIL: Could not retrieve SSL cert from $host:$port"
        return 1
    fi

    local expiry_epoch
    expiry_epoch=$(date -d "$expiry" +%s)
    local now_epoch
    now_epoch=$(date +%s)
    local days_remaining
    days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))

    if [ "$days_remaining" -lt "$days_warning" ]; then
        echo "WARN: SSL cert for $host expires in $days_remaining days"
        return 1
    else
        echo "OK: SSL cert for $host valid for $days_remaining more days"
        return 0
    fi
}

# Example usage
check_port localhost 5432          # PostgreSQL
check_port localhost 6379          # Redis
check_port localhost 80            # Nginx
check_http http://localhost/health  # App health endpoint
check_ssl_cert example.com 443 30  # SSL cert expiry check
```

## Resource Utilization Checks

```bash
#!/bin/bash
# Check system resources

check_disk_usage() {
    local path="$1"
    local threshold="${2:-85}"

    local usage
    usage=$(df -h "$path" | awk 'NR==2 {gsub(/%/,""); print $5}')

    if [ "$usage" -ge "$threshold" ]; then
        echo "WARN: Disk $path is ${usage}% full (threshold: ${threshold}%)"
        return 1
    else
        echo "OK: Disk $path is ${usage}% full"
        return 0
    fi
}

check_memory_usage() {
    local threshold="${1:-90}"

    local used_pct
    used_pct=$(free | awk '/^Mem:/ {printf "%.0f", ($3/$2)*100}')

    if [ "$used_pct" -ge "$threshold" ]; then
        echo "WARN: Memory usage is ${used_pct}% (threshold: ${threshold}%)"
        return 1
    else
        echo "OK: Memory usage is ${used_pct}%"
        return 0
    fi
}

check_cpu_load() {
    local threshold="${1:-80}"
    local cpu_count
    cpu_count=$(nproc)

    local load_1min
    load_1min=$(uptime | awk -F'load average:' '{print $2}' | cut -d',' -f1 | tr -d ' ')

    local load_pct
    load_pct=$(echo "scale=0; $load_1min * 100 / $cpu_count" | bc)

    if [ "$load_pct" -ge "$threshold" ]; then
        echo "WARN: CPU load average is ${load_1min} (${load_pct}% of capacity)"
        return 1
    else
        echo "OK: CPU load average is ${load_1min}"
        return 0
    fi
}

# Run resource checks
check_disk_usage / 85
check_disk_usage /var 90
check_disk_usage /tmp 95
check_memory_usage 90
check_cpu_load 80
```

## Self-Healing Checks

For common, well-understood failures, you can auto-remediate before alerting.

```bash
#!/bin/bash
# Self-healing health check for nginx

heal_nginx() {
    local service="nginx"

    if systemctl is-active --quiet "$service"; then
        return 0
    fi

    echo "$(date) nginx is down, attempting restart..."

    # Attempt restart
    if systemctl restart "$service"; then
        # Wait for it to actually come up
        sleep 5
        if systemctl is-active --quiet "$service"; then
            echo "$(date) nginx restarted successfully"

            # Log to a separate healing log
            echo "$(date) AUTO-HEALED: nginx restarted" >> /var/log/auto-heal.log
            return 0
        fi
    fi

    # Restart failed - escalate
    echo "$(date) nginx restart failed, sending alert"
    echo "nginx failed to restart on $(hostname) at $(date)" | \
        mail -s "CRITICAL: nginx down on $(hostname)" ops@example.com

    return 1
}

# Run with escalation
heal_nginx || echo "Manual intervention required for nginx"
```

## Application-Level Checks

Sometimes you need to exercise application logic, not just test if a port is open.

```bash
#!/bin/bash
# Check that the database has recent data (detect stuck pipelines)

check_db_freshness() {
    local db_path="$1"
    local table="$2"
    local max_age_minutes="${3:-60}"

    local latest_ts
    latest_ts=$(sqlite3 "$db_path" \
        "SELECT MAX(created_at) FROM $table;" 2>/dev/null)

    if [ -z "$latest_ts" ]; then
        echo "FAIL: No data found in $table"
        return 1
    fi

    local latest_epoch
    latest_epoch=$(date -d "$latest_ts" +%s 2>/dev/null)
    local now_epoch
    now_epoch=$(date +%s)
    local age_minutes
    age_minutes=$(( (now_epoch - latest_epoch) / 60 ))

    if [ "$age_minutes" -gt "$max_age_minutes" ]; then
        echo "FAIL: Latest data in $table is ${age_minutes} minutes old (max: ${max_age_minutes}m)"
        return 1
    else
        echo "OK: Latest data in $table is ${age_minutes} minutes old"
        return 0
    fi
}

# Check queue depth (detect processing backlogs)
check_queue_depth() {
    local max_depth="${1:-1000}"
    local depth
    depth=$(redis-cli llen myapp:queue 2>/dev/null)

    if [ "$depth" -gt "$max_depth" ]; then
        echo "FAIL: Queue depth is $depth (max: $max_depth)"
        return 1
    else
        echo "OK: Queue depth is $depth"
        return 0
    fi
}
```

## Scheduling Health Checks

```bash
# Add to crontab
crontab -e
```

```cron
# Run health check every minute
* * * * * /usr/local/bin/health-check.sh >> /var/log/health-check.log 2>&1

# Run resource check every 5 minutes
*/5 * * * * /usr/local/bin/resource-check.sh >> /var/log/resource-check.log 2>&1

# Check SSL certificates daily
0 8 * * * /usr/local/bin/ssl-check.sh >> /var/log/ssl-check.log 2>&1
```

## Setting Up systemd Timers (Better Alternative to Cron)

```bash
# Create the service unit
sudo nano /etc/systemd/system/health-check.service
```

```ini
[Unit]
Description=System Health Check
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/health-check.sh
User=root
StandardOutput=journal
StandardError=journal
```

```bash
# Create the timer unit
sudo nano /etc/systemd/system/health-check.timer
```

```ini
[Unit]
Description=Run health check every minute

[Timer]
OnBootSec=60
OnUnitActiveSec=60

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now health-check.timer

# Check timer status
systemctl status health-check.timer
systemctl list-timers health-check.timer

# View recent health check output
journalctl -u health-check.service --since "1 hour ago"
```

A modular health check script that you can extend over time is far more reliable than ad-hoc manual checks. Start simple, add checks as you discover failure modes, and prioritize self-healing for the failures you understand well.
