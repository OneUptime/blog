# How to View Real-Time Container Stats in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Real-Time Stats

Description: Learn how to monitor Podman container resource usage in real time with live-updating stats, custom refresh intervals, and streaming output.

---

> Real-time stats give you a live dashboard of container performance, essential for load testing and performance troubleshooting.

While one-time snapshots are useful for scripting, real-time monitoring lets you watch container resource usage change live. This is invaluable during load testing, deployment verification, and performance debugging. This guide shows you how to use Podman's streaming stats effectively.

---

## Basic Real-Time Monitoring

By default, `podman stats` streams updates continuously:

```bash
# Start test containers

podman run -d --name web -p 8080:80 nginx:latest
podman run -d --name app python:3 python -c "
import time
while True:
    sum(range(100000))
    time.sleep(0.1)
"

# Stream real-time stats (updates every few seconds)
podman stats
# Press Ctrl+C to stop

# This shows a continuously updating table like top or htop
```

## Monitoring Specific Containers

Focus on particular containers:

```bash
# Real-time stats for one container
podman stats web

# Real-time stats for selected containers
podman stats web app
```

## Custom Update Interval

Control how frequently stats refresh:

```bash
# Update every 1 second
podman stats --interval 1

# Update every 5 seconds (reduce system overhead)
podman stats --interval 5

# Update every 10 seconds for long-term monitoring
podman stats --interval 10
```

## Custom Format for Real-Time Display

Use a clean format for the live display:

```bash
# Minimal display showing just the essentials
podman stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}\t{{.PIDs}}"

# Detailed display
podman stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
```

## Building a Monitoring Dashboard

### Terminal-Based Dashboard

```bash
# Simple watch-based dashboard
watch -n 2 'echo "=== Container Dashboard ===" && echo "Time: $(date)" && echo "" && podman stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.PIDs}}"'
```

### Logging Real-Time Stats

Record stats over time for analysis:

```bash
# Log stats to CSV every 5 seconds
while true; do
    timestamp=$(date +%Y-%m-%dT%H:%M:%S)
    podman stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}" | \
    while read line; do
        echo "${timestamp},${line}"
    done >> /tmp/container-metrics.csv
    sleep 5
done &

# View the collected data
# tail -f /tmp/container-metrics.csv
# Kill the background job when done: kill %1
```

### Per-Container Monitoring Script

```bash
#!/bin/bash
# Save as /tmp/monitor-container.sh
CONTAINER="${1:-web}"
DURATION="${2:-60}"
INTERVAL="${3:-2}"

echo "Monitoring $CONTAINER for ${DURATION}s (every ${INTERVAL}s)"
echo "timestamp,cpu,memory,net_io,block_io,pids" > "/tmp/${CONTAINER}-stats.csv"

END_TIME=$(($(date +%s) + DURATION))
while [ "$(date +%s)" -lt "$END_TIME" ]; do
    timestamp=$(date +%H:%M:%S)
    stats=$(podman stats --no-stream --format "{{.CPUPerc}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}" "$CONTAINER" 2>/dev/null)
    if [ -n "$stats" ]; then
        echo "${timestamp},${stats}" >> "/tmp/${CONTAINER}-stats.csv"
        echo "${timestamp} | CPU: $(echo "$stats" | cut -d, -f1) | MEM: $(echo "$stats" | cut -d, -f2)"
    fi
    sleep "$INTERVAL"
done

echo "Stats saved to /tmp/${CONTAINER}-stats.csv"
```

## Monitoring During Load Tests

Watch container behavior under load:

```bash
# Terminal 1: Start real-time monitoring
podman stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}"

# Terminal 2: Generate load from the host
for i in $(seq 1 1000); do curl -s http://localhost:8080 > /dev/null; done

# Watch the stats change in Terminal 1 as load increases
```

## Alerting on Resource Thresholds

Monitor and alert when resources exceed thresholds:

```bash
# Simple threshold monitor
CPU_THRESHOLD=80
MEM_THRESHOLD=90

while true; do
    podman stats --no-stream --format "{{.Name}} {{.CPUPerc}} {{.MemPerc}}" | while read name cpu mem; do
        cpu_val=$(echo "$cpu" | tr -d '%')
        mem_val=$(echo "$mem" | tr -d '%')

        if [ "$(echo "$cpu_val > $CPU_THRESHOLD" | bc -l 2>/dev/null)" = "1" ]; then
            echo "ALERT: $name CPU at ${cpu} (threshold: ${CPU_THRESHOLD}%)"
        fi
        if [ "$(echo "$mem_val > $MEM_THRESHOLD" | bc -l 2>/dev/null)" = "1" ]; then
            echo "ALERT: $name Memory at ${mem} (threshold: ${MEM_THRESHOLD}%)"
        fi
    done
    sleep 5
done
```

## Comparing Snapshot vs Streaming

```bash
# Snapshot: runs once and exits (good for scripts)
podman stats --no-stream

# Streaming: continuously updates (good for interactive monitoring)
podman stats

# The only difference is --no-stream
```

## Cleanup

```bash
podman stop web app 2>/dev/null
podman rm web app 2>/dev/null
rm -f /tmp/container-metrics.csv /tmp/monitor-container.sh
```

## Summary

Real-time stats monitoring in Podman is as simple as running `podman stats` without the `--no-stream` flag. Customize the display with `--format`, control refresh rate with `--interval`, and combine with shell scripting for logging and alerting. This is your primary tool for watching container performance during deployments, load tests, and troubleshooting sessions.
