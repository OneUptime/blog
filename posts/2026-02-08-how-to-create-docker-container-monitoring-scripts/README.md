# How to Create Docker Container Monitoring Scripts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, monitoring, scripts, health checks, resource usage, alerts, DevOps

Description: Build Docker container monitoring scripts that track resource usage, health status, and performance metrics with automated alerting.

---

Monitoring Docker containers does not require a full observability stack. Sometimes you need lightweight scripts that watch your containers and alert you when something goes wrong. Maybe you are running a small deployment, managing a dev environment, or need a quick safety net while setting up a proper monitoring solution.

This guide provides ready-to-use monitoring scripts that track container health, resource consumption, and performance anomalies.

## Monitoring Container Resource Usage

Docker provides real-time resource stats through `docker stats`. Wrap this in a script to capture data and detect anomalies.

```bash
#!/bin/bash
# monitor-resources.sh
# Monitors CPU and memory usage for all running containers and alerts on thresholds

CPU_THRESHOLD=80    # Alert when CPU usage exceeds this percentage
MEM_THRESHOLD=85    # Alert when memory usage exceeds this percentage
CHECK_INTERVAL=30   # Seconds between checks
LOG_FILE="/var/log/docker-monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting Docker resource monitor (CPU: ${CPU_THRESHOLD}%, MEM: ${MEM_THRESHOLD}%)"

while true; do
    # Get stats for all running containers in a parseable format
    docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}' | \
    while IFS=$'\t' read NAME CPU MEM MEM_USAGE NET_IO BLOCK_IO; do
        # Strip the percentage sign for numeric comparison
        CPU_NUM=$(echo "$CPU" | tr -d '%')
        MEM_NUM=$(echo "$MEM" | tr -d '%')

        # Check CPU threshold
        if (( $(echo "$CPU_NUM > $CPU_THRESHOLD" | bc -l) )); then
            log "ALERT: $NAME CPU usage at ${CPU}% (threshold: ${CPU_THRESHOLD}%)"
        fi

        # Check memory threshold
        if (( $(echo "$MEM_NUM > $MEM_THRESHOLD" | bc -l) )); then
            log "ALERT: $NAME memory usage at ${MEM}% (${MEM_USAGE}) (threshold: ${MEM_THRESHOLD}%)"
        fi
    done

    sleep "$CHECK_INTERVAL"
done
```

## Container Health Check Monitor

Track the health status of containers that have health checks configured.

```bash
#!/bin/bash
# monitor-health.sh
# Monitors Docker container health status and alerts on unhealthy containers

CHECK_INTERVAL=15
CONSECUTIVE_FAILURES=3
ALERT_WEBHOOK="${SLACK_WEBHOOK:-}"

# Track failure counts per container
declare -A FAIL_COUNTS

send_alert() {
    local message="$1"
    echo "[ALERT] $message"

    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H 'Content-type: application/json' \
            -d "{\"text\": \"$message\"}" > /dev/null
    fi
}

echo "Starting health status monitor (check every ${CHECK_INTERVAL}s)"

while true; do
    for CONTAINER_ID in $(docker ps -q); do
        NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//')
        HEALTH=$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_ID" 2>/dev/null)
        STATE=$(docker inspect --format '{{.State.Status}}' "$CONTAINER_ID")

        # Track containers that are not running
        if [ "$STATE" != "running" ]; then
            send_alert "Container $NAME is in state: $STATE"
            continue
        fi

        # Track health check failures
        if [ "$HEALTH" = "unhealthy" ]; then
            CURRENT_COUNT=${FAIL_COUNTS[$NAME]:-0}
            CURRENT_COUNT=$((CURRENT_COUNT + 1))
            FAIL_COUNTS[$NAME]=$CURRENT_COUNT

            if [ "$CURRENT_COUNT" -ge "$CONSECUTIVE_FAILURES" ]; then
                # Get the last health check log for context
                LAST_LOG=$(docker inspect --format '{{(index .State.Health.Log 0).Output}}' "$CONTAINER_ID" 2>/dev/null | head -1)
                send_alert "Container $NAME has been unhealthy for $CURRENT_COUNT consecutive checks. Last output: $LAST_LOG"
            fi
        else
            # Reset failure count when healthy
            FAIL_COUNTS[$NAME]=0
        fi
    done

    # Check for containers that recently stopped
    for CONTAINER_ID in $(docker ps -a -q --filter status=exited --filter "since=$(date -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S)" 2>/dev/null); do
        NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//')
        EXIT_CODE=$(docker inspect --format '{{.State.ExitCode}}' "$CONTAINER_ID")

        if [ "$EXIT_CODE" != "0" ]; then
            send_alert "Container $NAME exited with code $EXIT_CODE"
        fi
    done

    sleep "$CHECK_INTERVAL"
done
```

## Resource Usage Logger

Collect container metrics over time for analysis and capacity planning.

```bash
#!/bin/bash
# log-metrics.sh
# Logs container resource metrics to a CSV file for historical analysis

METRICS_FILE="/var/log/docker-metrics.csv"
INTERVAL=60  # Log metrics every 60 seconds

# Create the CSV header if the file does not exist
if [ ! -f "$METRICS_FILE" ]; then
    echo "timestamp,container,cpu_percent,mem_percent,mem_usage_mb,net_rx_mb,net_tx_mb,block_read_mb,block_write_mb,pids" > "$METRICS_FILE"
fi

echo "Logging Docker metrics to $METRICS_FILE (every ${INTERVAL}s)"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    # Capture stats snapshot for all containers
    docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemPerc}},{{.MemUsage}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}' | \
    while IFS=',' read NAME CPU MEM MEM_USAGE NET_IO BLOCK_IO PIDS; do
        # Clean up percentage signs
        CPU=$(echo "$CPU" | tr -d '%')
        MEM=$(echo "$MEM" | tr -d '%')

        # Extract memory usage in MB
        MEM_MB=$(echo "$MEM_USAGE" | grep -oP '[\d.]+(?=MiB|GiB)' | head -1)

        # Extract network I/O (simplified)
        NET_RX=$(echo "$NET_IO" | cut -d'/' -f1 | tr -d ' ')
        NET_TX=$(echo "$NET_IO" | cut -d'/' -f2 | tr -d ' ')

        # Write the metrics row
        echo "${TIMESTAMP},${NAME},${CPU},${MEM},${MEM_MB:-0},${NET_RX},${NET_TX},0,0,${PIDS}" >> "$METRICS_FILE"
    done

    sleep "$INTERVAL"
done
```

## Container Log Monitor

Watch container logs for error patterns and alert on spikes.

```bash
#!/bin/bash
# monitor-logs.sh
# Monitors container logs for error patterns and alerts on error rate spikes

CONTAINERS="${1:-$(docker ps --format '{{.Names}}')}"
ERROR_PATTERNS="ERROR|FATAL|CRITICAL|panic|exception|OOM"
ERROR_RATE_THRESHOLD=10  # Alert if more than this many errors per minute
WINDOW_SECONDS=60

for CONTAINER in $CONTAINERS; do
    echo "Monitoring logs for: $CONTAINER"

    # Run log monitoring in the background for each container
    (
        ERROR_COUNT=0
        WINDOW_START=$(date +%s)

        # Follow container logs and count error occurrences
        docker logs --follow --since "1s" "$CONTAINER" 2>&1 | \
        grep -iE "$ERROR_PATTERNS" --line-buffered | \
        while read LINE; do
            ERROR_COUNT=$((ERROR_COUNT + 1))
            NOW=$(date +%s)
            ELAPSED=$((NOW - WINDOW_START))

            if [ "$ELAPSED" -ge "$WINDOW_SECONDS" ]; then
                if [ "$ERROR_COUNT" -ge "$ERROR_RATE_THRESHOLD" ]; then
                    echo "[$(date)] ALERT: $CONTAINER has $ERROR_COUNT errors in the last ${WINDOW_SECONDS}s"
                    echo "  Latest error: $LINE"
                fi
                # Reset the window
                ERROR_COUNT=0
                WINDOW_START=$NOW
            fi
        done
    ) &
done

echo "Log monitors started for all containers. Press Ctrl+C to stop."
wait
```

## Restart Loop Detector

Detect containers that keep crashing and restarting.

```bash
#!/bin/bash
# detect-restart-loops.sh
# Detects containers stuck in restart loops and alerts

MAX_RESTARTS_PER_HOUR=5
CHECK_INTERVAL=300  # Check every 5 minutes

echo "Starting restart loop detector (threshold: $MAX_RESTARTS_PER_HOUR restarts/hour)"

while true; do
    for CONTAINER_ID in $(docker ps -q); do
        NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//')
        RESTART_COUNT=$(docker inspect --format '{{.RestartCount}}' "$CONTAINER_ID")
        STARTED_AT=$(docker inspect --format '{{.State.StartedAt}}' "$CONTAINER_ID")

        # Calculate how long the container has been running since last start
        STARTED_EPOCH=$(date -d "$STARTED_AT" +%s 2>/dev/null || echo 0)
        NOW_EPOCH=$(date +%s)
        UPTIME_SECONDS=$((NOW_EPOCH - STARTED_EPOCH))
        UPTIME_MINUTES=$((UPTIME_SECONDS / 60))

        # Check if container has restarted too many times
        if [ "$RESTART_COUNT" -gt "$MAX_RESTARTS_PER_HOUR" ]; then
            echo "[$(date)] WARNING: $NAME has restarted $RESTART_COUNT times (uptime: ${UPTIME_MINUTES}m)"

            # Get the last few lines of logs for context
            echo "  Recent logs:"
            docker logs --tail 5 "$CONTAINER_ID" 2>&1 | sed 's/^/    /'
        fi

        # Detect very short uptimes (container keeps crashing)
        if [ "$UPTIME_SECONDS" -lt 60 ] && [ "$RESTART_COUNT" -gt 0 ]; then
            echo "[$(date)] CRITICAL: $NAME may be in a restart loop (uptime: ${UPTIME_SECONDS}s, restarts: $RESTART_COUNT)"
        fi
    done

    sleep "$CHECK_INTERVAL"
done
```

## Disk Usage Monitor for Volumes

Track volume growth and alert before disk fills up.

```bash
#!/bin/bash
# monitor-volumes.sh
# Monitors Docker volume disk usage and alerts when growth rate is unusual

ALERT_SIZE_GB=10  # Alert when a volume exceeds this size
LOG_FILE="/var/log/docker-volume-monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting volume disk usage monitor"

for VOLUME in $(docker volume ls -q); do
    MOUNTPOINT=$(docker volume inspect --format '{{.Mountpoint}}' "$VOLUME")

    # Calculate volume size
    SIZE_KB=$(du -sk "$MOUNTPOINT" 2>/dev/null | cut -f1)
    SIZE_MB=$((SIZE_KB / 1024))
    SIZE_GB=$((SIZE_MB / 1024))

    if [ "$SIZE_GB" -ge "$ALERT_SIZE_GB" ]; then
        log "ALERT: Volume $VOLUME is ${SIZE_GB}GB (threshold: ${ALERT_SIZE_GB}GB)"

        # Show the largest files in the volume for investigation
        log "  Largest files:"
        du -ah "$MOUNTPOINT" 2>/dev/null | sort -rh | head -5 | while read SIZE FILE; do
            log "    $SIZE $FILE"
        done
    else
        log "OK: Volume $VOLUME is ${SIZE_MB}MB"
    fi
done
```

## Combined Monitoring Dashboard Script

Pull all monitoring data into a single dashboard view.

```bash
#!/bin/bash
# dashboard.sh
# Displays a real-time Docker monitoring dashboard in the terminal

while true; do
    clear
    echo "============================================"
    echo "  Docker Container Dashboard - $(date)"
    echo "============================================"
    echo ""

    # System overview
    echo "--- System Overview ---"
    docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}\t{{.Reclaimable}}"
    echo ""

    # Container status summary
    RUNNING=$(docker ps -q | wc -l)
    STOPPED=$(docker ps -q --filter status=exited | wc -l)
    TOTAL=$((RUNNING + STOPPED))
    echo "--- Containers: $RUNNING running, $STOPPED stopped, $TOTAL total ---"
    echo ""

    # Resource usage table for running containers
    echo "--- Resource Usage ---"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.PIDs}}"
    echo ""

    # Health status
    echo "--- Health Status ---"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" | head -20
    echo ""

    # Recent events
    echo "--- Recent Events (last 5 minutes) ---"
    docker events --since "5m" --until "0s" --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}} ({{.Actor.Attributes.image}})' 2>/dev/null | tail -10

    sleep 10
done
```

## Running Monitors as Services

Deploy your monitoring scripts as systemd services for reliability:

```ini
# /etc/systemd/system/docker-monitor.service
# Systemd service for the Docker container resource monitor

[Unit]
Description=Docker Container Resource Monitor
After=docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=/opt/monitoring/monitor-resources.sh
Restart=always
RestartSec=10
Environment=SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the monitoring service
sudo systemctl daemon-reload
sudo systemctl enable docker-monitor
sudo systemctl start docker-monitor

# Check the monitoring logs
journalctl -u docker-monitor -f
```

## Summary

Custom monitoring scripts give you targeted visibility into Docker container health without the overhead of a full monitoring stack. Start with the resource monitor and health check monitor for immediate value. Add log monitoring and restart loop detection as you identify specific failure patterns. For production environments, run these scripts as systemd services so they survive reboots and recover from failures automatically. These scripts complement, rather than replace, a proper monitoring solution, but they work well as a first line of defense.
