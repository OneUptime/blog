# How to View Pod Resource Usage with podman pod stats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Monitoring, Resource

Description: Learn how to monitor CPU, memory, and network usage for all containers in a Podman pod.

---

> The podman pod stats command provides real-time resource usage metrics for every container in a pod.

Monitoring resource usage is essential for capacity planning, performance tuning, and detecting runaway containers. The `podman pod stats` command gives you a live dashboard showing CPU, memory, network I/O, and block I/O for each container in a pod.

---

## Viewing Pod Statistics

```bash
# Create a pod with containers

podman pod create --name app-pod -p 8080:80
podman run -d --pod app-pod --name web docker.io/library/nginx:alpine
podman run -d --pod app-pod --name cache docker.io/library/redis:7-alpine

# View live resource usage for the pod
podman pod stats app-pod
```

## Understanding the Output

```bash
# The output refreshes continuously and shows:
# ID       NAME   CPU %   MEM USAGE / LIMIT   MEM %   NET I/O         BLOCK I/O   PIDS
# a1b2c3   web    0.05%   5.2MB / 16.0GB      0.03%   1.2kB / 800B    0B / 0B     3
# d4e5f6   cache  0.10%   8.1MB / 16.0GB      0.05%   500B / 200B     0B / 4kB    5
```

## Getting a Single Snapshot

```bash
# Print stats once without streaming (no-stream mode)
podman pod stats app-pod --no-stream

# Useful for logging and scripting
```

## Custom Output Format

```bash
# Use a custom format for specific metrics
podman pod stats app-pod --no-stream \
  --format "table {{.Name}}\t{{.CPU}}\t{{.MemUsage}}\t{{.NetIO}}"

# JSON output for programmatic parsing
podman pod stats app-pod --no-stream --format json
```

## Monitoring All Pods

```bash
# View stats for all running pods at once
podman pod stats --all --no-stream

# Filter to see only pods with high CPU usage
podman pod stats --all --no-stream --format "{{.Name}} {{.CPU}}" | \
  awk '{if ($2+0 > 50) print $0}'
```

## Logging Resource Usage Over Time

```bash
#!/bin/bash
# Log pod stats every 30 seconds to a file

POD_NAME="app-pod"
LOG_FILE="/tmp/pod-stats.csv"

echo "timestamp,name,cpu,mem_usage,mem_pct,net_io,block_io,pids" > "$LOG_FILE"

while true; do
  TIMESTAMP=$(date -Iseconds)
  podman pod stats "$POD_NAME" --no-stream \
    --format "{{.Name}},{{.CPU}},{{.MemUsage}},{{.Mem}},{{.NetIO}},{{.BlockIO}},{{.PIDS}}" | \
    while read line; do
      echo "$TIMESTAMP,$line" >> "$LOG_FILE"
    done
  sleep 30
done
```

## Setting Up Alerts

```bash
#!/bin/bash
# Alert when a container in the pod exceeds memory threshold

POD_NAME="app-pod"
MEM_THRESHOLD=80

podman pod stats "$POD_NAME" --no-stream \
  --format "{{.Name}} {{.Mem}}" | while read name pct; do
  value=$(echo "$pct" | tr -d '%')
  if [ "$(echo "$value > $MEM_THRESHOLD" | bc)" -eq 1 ]; then
    echo "ALERT: $name using ${pct} memory"
  fi
done
```

## Summary

Use `podman pod stats` for live monitoring of CPU, memory, network, and disk I/O across all containers in a pod. Add `--no-stream` for single snapshots in scripts, and use `--format` for custom or JSON output. Combine with shell scripting for historical logging and threshold-based alerting.
