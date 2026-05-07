# How to Monitor Container Resource Usage Over Time with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Resource, CPU, Memory, Performance

Description: Learn how to monitor container resource usage over time with Podman to track CPU, memory, network, and disk I/O metrics for performance analysis.

---

> Monitoring resource usage over time reveals trends, detects anomalies, and prevents outages before they happen.

While Podman events track lifecycle changes, monitoring resource usage over time gives you performance data - CPU consumption, memory usage, network throughput, and disk I/O. By collecting these metrics periodically, you can identify trends, detect resource leaks, and right-size your containers. This guide shows you how to track container resource usage over time using Podman.

Note: Rootless Podman environments may not be able to report network usage statistics in `podman stats`.

---

## Real-Time Resource Monitoring with podman stats

The `podman stats` command provides live resource usage data.

```bash
# Start a container to monitor

podman run -d --name resource-test \
    --memory 256m \
    --cpus 1.0 \
    alpine sh -c "while true; do dd if=/dev/zero of=/dev/null bs=1M count=100 2>/dev/null; sleep 1; done"

# View live stats
podman stats resource-test

# View stats for all running containers
podman stats --all

# View a single snapshot (non-streaming)
podman stats --no-stream resource-test
```

## Collecting Stats Over Time

Capture periodic snapshots of resource usage for trend analysis.

```bash
#!/bin/bash
# collect-stats.sh - Collect container stats over time
# Usage: ./collect-stats.sh <container-name> <interval-seconds> <duration-seconds>

CONTAINER="${1:?Usage: $0 <container> <interval> <duration>}"
INTERVAL="${2:-10}"
DURATION="${3:-300}"
OUTPUT="/tmp/podman-stats-${CONTAINER}-$(date '+%Y%m%d-%H%M%S').csv"

echo "timestamp,container,cpu_percent,mem_usage,mem_limit,mem_percent,net_input,net_output,block_input,block_output" > "$OUTPUT"

END_TIME=$((SECONDS + DURATION))

echo "Collecting stats for '${CONTAINER}' every ${INTERVAL}s for ${DURATION}s..."
echo "Output: ${OUTPUT}"

while [ $SECONDS -lt $END_TIME ]; do
    timestamp=$(date '+%Y-%m-%dT%H:%M:%S')

    # Get stats as JSON for reliable parsing
    stats=$(podman stats --no-stream --format json "$CONTAINER" 2>/dev/null)

    if [ -n "$stats" ]; then
        read -r cpu mem_usage mem_limit mem_percent net_in net_out block_in block_out < <(
            echo "$stats" | jq -r '
                .[0] as $s |
                (($s.mem_usage // "0 / 0") | split(" / ")) as $mem |
                (($s.netio // "0 / 0") | split(" / ")) as $net |
                (($s.blocki // "0 / 0") | split(" / ")) as $block |
                [
                    ($s.cpu_percent // "0"),
                    ($mem[0] // "0"),
                    ($mem[1] // "0"),
                    ($s.mem_percent // "0"),
                    ($net[0] // "0"),
                    ($net[1] // "0"),
                    ($block[0] // "0"),
                    ($block[1] // "0")
                ] | @tsv
            '
        )

        echo "${timestamp},${CONTAINER},${cpu},${mem_usage},${mem_limit},${mem_percent},${net_in},${net_out},${block_in},${block_out}" >> "$OUTPUT"
        echo "[${timestamp}] CPU: ${cpu} | MEM: ${mem_percent} (${mem_usage}/${mem_limit})"
    fi

    sleep "$INTERVAL"
done

echo "Collection complete. Data saved to: ${OUTPUT}"
```

```bash
# Run the collector
chmod +x collect-stats.sh
./collect-stats.sh resource-test 5 60
```

## JSON Stats for All Containers

Collect stats for all running containers simultaneously.

```bash
# Get a JSON snapshot of all containers
podman stats --no-stream --format json | jq '.'

# Extract key metrics for all containers
podman stats --no-stream --format json | \
    jq '.[] | {name: .name, cpu: .cpu_percent, memory: .mem_percent}'
```

## Building a Resource Usage Dashboard Script

```bash
#!/bin/bash
# resource-dashboard.sh - Terminal dashboard for container resources

while true; do
    clear
    echo "=== Podman Resource Dashboard ==="
    echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    # Header
    printf "%-20s %8s %8s %12s %12s\n" "CONTAINER" "CPU%" "MEM%" "NET-IN" "NET-OUT"
    printf "%-20s %8s %8s %12s %12s\n" "----------" "----" "----" "------" "-------"

    # Get stats for all containers
    podman stats --no-stream --format json 2>/dev/null | \
    jq -r '.[] | [.name, .cpu_percent, .mem_percent, ((.netio // "0 / 0") | split(" / ")[0]), ((.netio // "0 / 0") | split(" / ")[1])] | @tsv' | \
    while IFS=$'\t' read -r name cpu mem net_in net_out; do
        printf "%-20s %8s %8s %12s %12s\n" "$name" "$cpu" "$mem" "$net_in" "$net_out"
    done

    echo ""
    echo "Refreshing every 5 seconds... Press Ctrl+C to stop"
    sleep 5
done
```

## Detecting Resource Anomalies

Monitor for containers exceeding resource thresholds.

```bash
#!/bin/bash
# resource-alerts.sh - Alert when containers exceed resource thresholds

CPU_THRESHOLD=80
MEM_THRESHOLD=85

echo "Monitoring resource usage (CPU > ${CPU_THRESHOLD}%, MEM > ${MEM_THRESHOLD}%)..."

while true; do
    podman stats --no-stream --format json 2>/dev/null | \
    jq -r '.[] | [.name, .cpu_percent, .mem_percent] | @tsv' | \
    while IFS=$'\t' read -r name cpu_str mem_str; do
        # Extract numeric values
        cpu=$(echo "$cpu_str" | tr -d '%' | awk '/^[0-9]+([.][0-9]+)?$/ {print; next} {print 0}')
        mem=$(echo "$mem_str" | tr -d '%' | awk '/^[0-9]+([.][0-9]+)?$/ {print; next} {print 0}')

        # Check thresholds using awk for float comparison
        cpu_alert=$(awk "BEGIN {print ($cpu > $CPU_THRESHOLD) ? 1 : 0}")
        mem_alert=$(awk "BEGIN {print ($mem > $MEM_THRESHOLD) ? 1 : 0}")

        if [ "$cpu_alert" -eq 1 ]; then
            echo "[$(date)] ALERT: ${name} CPU at ${cpu_str} (threshold: ${CPU_THRESHOLD}%)"
        fi

        if [ "$mem_alert" -eq 1 ]; then
            echo "[$(date)] ALERT: ${name} MEM at ${mem_str} (threshold: ${MEM_THRESHOLD}%)"
        fi
    done

    sleep 10
done
```

## Exporting Metrics for Prometheus

Create a text file exporter that Prometheus node_exporter can scrape.

```bash
#!/bin/bash
# prometheus-stats.sh - Export container stats as Prometheus metrics

METRICS_DIR="/var/lib/node_exporter/textfile_collector"
mkdir -p "$METRICS_DIR"
METRICS_FILE="${METRICS_DIR}/podman_stats.prom"

while true; do
    {
        echo "# HELP podman_container_cpu_percent Container CPU usage percent"
        echo "# TYPE podman_container_cpu_percent gauge"
        echo "# HELP podman_container_memory_percent Container memory usage percent"
        echo "# TYPE podman_container_memory_percent gauge"

        podman stats --no-stream --format json 2>/dev/null | \
        jq -r '.[] | def metric_number: tostring | gsub("%";"") | if test("^[0-9]+(\\.[0-9]+)?$") then . else "0" end; "podman_container_cpu_percent{name=\"\(.name)\"} \(.cpu_percent | metric_number)\npodman_container_memory_percent{name=\"\(.name)\"} \(.mem_percent | metric_number)"'
    } > "${METRICS_FILE}.tmp"

    mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
    sleep 15
done
```

## Cleanup

```bash
# Stop and remove test containers
podman rm -f resource-test 2>/dev/null

# Clean up data files
rm -f /tmp/podman-stats-*.csv
```

## Summary

Monitoring container resource usage over time with Podman gives you performance visibility that complements event-based monitoring. By collecting periodic snapshots of CPU, memory, network, and disk metrics using `podman stats`, you can detect trends, identify resource-hungry containers, and trigger alerts before issues impact production. Whether you build a simple CSV collector or integrate with Prometheus and Grafana, resource monitoring is essential for maintaining healthy container workloads.
