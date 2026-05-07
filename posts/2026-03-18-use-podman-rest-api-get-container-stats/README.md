# How to Use the Podman REST API to Get Container Stats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Container Stats, Monitoring, DevOps

Description: Learn how to retrieve real-time container resource usage statistics using the Podman REST API, including CPU, memory, network, and disk I/O metrics.

---

> Monitoring container resource usage is critical for maintaining healthy production environments. The Podman REST API provides detailed statistics about CPU, memory, network, and disk I/O for every running container, allowing you to build custom monitoring and alerting solutions.

Understanding how your containers consume system resources is fundamental to capacity planning, performance optimization, and incident response. While the `podman stats` CLI command works well for interactive use, the REST API enables programmatic access to these metrics, making it possible to integrate container statistics into dashboards, alerting systems, and automated scaling logic.

This guide covers how to use the Podman REST API to retrieve container statistics, parse the response data, and build practical monitoring workflows.

---

## Prerequisites

Ensure the Podman API service is running:

```bash
podman system service --time=0 unix:///run/podman/podman.sock
```

Verify connectivity:

```bash
curl -s --unix-socket /run/podman/podman.sock \
  http://localhost/v5.0.0/libpod/info | jq .host.os
```

## The Stats Endpoint

The Podman REST API provides container statistics through two main endpoints:

### All Containers Stats (Libpod)

```text
GET /v5.0.0/libpod/containers/stats
```

This endpoint supports the following query parameters:

- **stream** (boolean): Continuously stream stats. Defaults to true.
- **containers** (array): Names or IDs of containers to report on.
- **interval** (integer): Time in seconds between stats reports. Defaults to 5.
- **all** (boolean): Include all containers, not just running ones. Defaults to false.

### Single Container Stats (Compat)

```text
GET /v1.40/containers/{name}/stats
```

The Docker-compatible endpoint supports:

- **stream** (boolean): Continuously stream stats. Defaults to true.
- **one-shot** (boolean): Return a single stats reading and disconnect. Only works with `stream=false`.

## Fetching Stats for a Single Container

To get a one-time snapshot of a container's resource usage:

```bash
curl -s --unix-socket /run/podman/podman.sock \
  "http://localhost/v5.0.0/libpod/containers/stats?stream=false&containers=my-container" | jq .
```

The response wraps the stats in a `Stats` array:

```json
{
  "Stats": [
    {
      "AvgCPU": 12.3,
      "ContainerID": "abc123def456",
      "Name": "my-container",
      "CPU": 25.5,
      "MemUsage": 134217728,
      "MemLimit": 536870912,
      "MemPerc": 25.0,
      "Network": {
        "eth0": {
          "RxBytes": 1048576,
          "TxBytes": 524288,
          "RxPackets": 1024,
          "TxPackets": 768,
          "RxErrors": 0,
          "TxErrors": 0,
          "RxDropped": 0,
          "TxDropped": 0
        }
      },
      "BlockInput": 2097152,
      "BlockOutput": 1048576,
      "PIDs": 12
    }
  ]
}
```

## Understanding the Stats Response

Each object inside the `Stats` array includes the following fields:

| Field | Description |
|-------|-------------|
| CPU | Current CPU usage percentage |
| AvgCPU | Average CPU usage over the container lifetime |
| MemUsage | Current memory usage in bytes |
| MemLimit | Effective memory limit in bytes |
| MemPerc | Memory usage as a percentage of the limit |
| Network | Per-interface network statistics keyed by interface name |
| BlockInput | Total bytes read from block devices |
| BlockOutput | Total bytes written to block devices |
| PIDs | Number of processes running in the container |

## Streaming Stats in Real Time

To continuously monitor container resource usage, use the streaming mode:

```bash
curl -s --unix-socket /run/podman/podman.sock \
  --no-buffer \
  "http://localhost/v5.0.0/libpod/containers/stats?stream=true&containers=my-container" | \
  while read -r line; do
    echo "$line" | jq '.Stats[0] | {cpu: .CPU, mem_mb: (.MemUsage / 1048576), pids: .PIDs}'
  done
```

This continuously outputs simplified stats:

```json
{"cpu": 15.2, "mem_mb": 128.5, "pids": 12}
{"cpu": 14.8, "mem_mb": 128.7, "pids": 12}
{"cpu": 16.1, "mem_mb": 129.0, "pids": 13}
```

## Fetching Stats for All Containers

To monitor all running containers at once:

```bash
curl -s --unix-socket /run/podman/podman.sock \
  "http://localhost/v5.0.0/libpod/containers/stats?stream=false" | jq .
```

The response includes a `Stats` array with one stats object for each running container. This is more efficient than making individual requests for each container.

## Building a Simple Monitoring Script

Here is a bash script that monitors container resource usage and alerts when thresholds are exceeded:

```bash
#!/bin/bash

SOCKET="/run/podman/podman.sock"
API="http://localhost/v5.0.0/libpod"
CPU_THRESHOLD=80
MEM_THRESHOLD=90

check_stats() {
  local stats
  stats=$(curl -s --unix-socket "$SOCKET" \
    "$API/containers/stats?stream=false" 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to connect to Podman API"
    return 1
  fi

  echo "$stats" | jq -c '.Stats[]' | while read -r container; do
    NAME=$(echo "$container" | jq -r '.Name')
    CPU=$(echo "$container" | jq '.CPU')
    MEM_PERC=$(echo "$container" | jq '.MemPerc')
    MEM_MB=$(echo "$container" | jq '.MemUsage / 1048576 | floor')

    echo "[$NAME] CPU: ${CPU}% | Memory: ${MEM_MB}MB (${MEM_PERC}%) | PIDs: $(echo "$container" | jq '.PIDs')"

    if (( $(echo "$CPU > $CPU_THRESHOLD" | bc -l) )); then
      echo "  WARNING: CPU usage exceeds ${CPU_THRESHOLD}%"
    fi

    if (( $(echo "$MEM_PERC > $MEM_THRESHOLD" | bc -l) )); then
      echo "  WARNING: Memory usage exceeds ${MEM_THRESHOLD}%"
    fi
  done
}

echo "=== Container Stats Monitor ==="
echo "CPU threshold: ${CPU_THRESHOLD}% | Memory threshold: ${MEM_THRESHOLD}%"
echo ""

while true; do
  echo "--- $(date) ---"
  check_stats
  echo ""
  sleep 10
done
```

## Calculating CPU Usage Percentage

When using the Docker-compatible stats endpoint, calculate CPU percentage from two streamed samples:

```bash
curl -s --unix-socket /run/podman/podman.sock \
  --no-buffer \
  "http://localhost/v1.40/containers/my-container/stats?stream=true" | \
  head -n 2 | tail -n 1 | \
  jq '{
    cpu_percent: ((.cpu_stats.cpu_usage.total_usage - .precpu_stats.cpu_usage.total_usage) /
                  (.cpu_stats.system_cpu_usage - .precpu_stats.system_cpu_usage) *
                  (.cpu_stats.online_cpus // 1) * 100),
    memory_usage_mb: (.memory_stats.usage / 1048576),
    memory_limit_mb: (.memory_stats.limit / 1048576),
    network_rx_mb: (([.networks[]?.rx_bytes] | add // 0) / 1048576),
    network_tx_mb: (([.networks[]?.tx_bytes] | add // 0) / 1048576)
  }'
```

## Monitoring Network I/O

To track network throughput over time, you can poll stats and calculate the difference:

```bash
#!/bin/bash

SOCKET="/run/podman/podman.sock"
CONTAINER="my-container"
INTERVAL=5

PREV_IN=0
PREV_OUT=0

while true; do
  STATS=$(curl -s --unix-socket "$SOCKET" \
    "http://localhost/v5.0.0/libpod/containers/stats?stream=false&containers=$CONTAINER")

  NET_IN=$(echo "$STATS" | jq '[.Stats[0].Network[]?.RxBytes] | add // 0')
  NET_OUT=$(echo "$STATS" | jq '[.Stats[0].Network[]?.TxBytes] | add // 0')

  if [ "$PREV_IN" -ne 0 ]; then
    IN_RATE=$(( (NET_IN - PREV_IN) / INTERVAL ))
    OUT_RATE=$(( (NET_OUT - PREV_OUT) / INTERVAL ))
    echo "Network I/O: ${IN_RATE} B/s in | ${OUT_RATE} B/s out"
  fi

  PREV_IN=$NET_IN
  PREV_OUT=$NET_OUT
  sleep $INTERVAL
done
```

## Using the Compat API for Stats

The Docker-compatible endpoint provides a different response format that matches the Docker API specification:

```bash
curl -s --unix-socket /run/podman/podman.sock \
  "http://localhost/v1.40/containers/my-container/stats?stream=false&one-shot=true" | jq .
```

This format includes raw cumulative CPU counters, memory usage and limit, and per-interface network statistics. Use this endpoint if you need compatibility with existing Docker monitoring tools.

## Error Handling

Common error scenarios when fetching stats:

```bash
# Container not found

curl -s -o /dev/null -w "%{http_code}" --unix-socket /run/podman/podman.sock \
  "http://localhost/v5.0.0/libpod/containers/stats?stream=false&containers=nonexistent"
# Returns: 404

# Invalid one-shot usage
curl -s -o /dev/null -w "%{http_code}" --unix-socket /run/podman/podman.sock \
  "http://localhost/v1.40/containers/my-container/stats?stream=true&one-shot=true"
# Returns: 400
```

Always verify container names and query parameters before attempting to fetch stats in automated workflows.

## Performance Tips

- Use `stream=false` when you only need a single reading. On the Docker-compatible endpoint, you can additionally pass `one-shot=true`.
- When monitoring multiple containers, prefer the all-containers endpoint over individual requests.
- Implement client-side rate limiting to avoid excessive API calls.
- Cache stats data when multiple consumers need the same metrics.
- Set reasonable poll intervals; 5-10 seconds is typically sufficient for most monitoring use cases.

## Conclusion

The Podman REST API gives you comprehensive access to container resource metrics, from CPU and memory usage to network and disk I/O. By leveraging these endpoints, you can build custom monitoring solutions that fit your specific infrastructure needs, integrate with existing observability platforms, or create automated scaling and alerting workflows. The combination of one-shot queries and streaming modes provides flexibility for both periodic polling and real-time monitoring scenarios.
