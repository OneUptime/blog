# How to Get Docker Container Statistics in JSON Format

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Monitoring, JSON, Containers, DevOps, Metrics

Description: Learn how to extract Docker container statistics in JSON format for monitoring, alerting, and integration with external tools.

---

Docker's `stats` command gives you a live stream of container resource usage. By default, it renders a human-friendly table. But when you need to feed that data into a monitoring system, parse it with `jq`, or build a custom dashboard, you want JSON. This post covers every way to get Docker container statistics in structured JSON format.

## The Default docker stats Output

Before jumping into JSON, here is what the default output looks like:

```bash
# View live stats for all running containers
docker stats
```

This produces a continuously updating table:

```
CONTAINER ID   NAME       CPU %   MEM USAGE / LIMIT     MEM %   NET I/O          BLOCK I/O        PIDS
a1b2c3d4e5f6   web        0.50%   45.2MiB / 1GiB        4.41%   1.2kB / 500B     8.19kB / 0B      5
f6e5d4c3b2a1   database   2.30%   256MiB / 2GiB         12.5%   3.4kB / 1.2kB    50.4MB / 10MB    25
```

This is great for a quick glance, but terrible for automation.

## Getting JSON with --format

The `docker stats` command supports Go template formatting, which lets you build JSON output directly:

```bash
# Get a single snapshot of stats in JSON format for all containers
docker stats --no-stream --format '{"container":"{{.Name}}","cpu":"{{.CPUPerc}}","memory":"{{.MemUsage}}","mem_percent":"{{.MemPerc}}","net_io":"{{.NetIO}}","block_io":"{{.BlockIO}}","pids":"{{.PIDs}}"}'
```

The `--no-stream` flag is important here. Without it, `docker stats` runs continuously and you get a never-ending stream of output. With `--no-stream`, you get a single snapshot and the command exits.

The output looks like this:

```json
{"container":"web","cpu":"0.50%","memory":"45.2MiB / 1GiB","mem_percent":"4.41%","net_io":"1.2kB / 500B","block_io":"8.19kB / 0B","pids":"5"}
{"container":"database","cpu":"2.30%","memory":"256MiB / 2GiB","mem_percent":"12.5%","net_io":"3.4kB / 1.2kB","block_io":"50.4MB / 10MB","pids":"25"}
```

Each line is a valid JSON object. To wrap them all in an array, pipe through `jq`:

```bash
# Convert line-delimited JSON into a proper JSON array
docker stats --no-stream --format '{"container":"{{.Name}}","cpu":"{{.CPUPerc}}","memory":"{{.MemUsage}}","mem_percent":"{{.MemPerc}}"}' | jq -s '.'
```

## Available Template Fields

Here are all the fields you can use in the `--format` template:

| Field | Description |
|-------|-------------|
| `.Container` | Container ID |
| `.Name` | Container name |
| `.ID` | Container ID (short) |
| `.CPUPerc` | CPU percentage |
| `.MemUsage` | Memory usage / limit |
| `.MemPerc` | Memory percentage |
| `.NetIO` | Network I/O |
| `.BlockIO` | Block I/O |
| `.PIDs` | Number of PIDs |

## Using the Docker API for Raw JSON

The `docker stats` command formats data for display. If you want raw, machine-parseable numbers, use the Docker Engine API directly. The API returns detailed JSON with exact byte counts and nanosecond-precision CPU measurements.

Query the stats endpoint for a single container:

```bash
# Get raw stats JSON from the Docker API (single snapshot)
curl --unix-socket /var/run/docker.sock \
  "http://localhost/containers/web/stats?stream=false" | jq '.'
```

The response is a large JSON document with detailed breakdown:

```json
{
  "cpu_stats": {
    "cpu_usage": {
      "total_usage": 1250000000,
      "usage_in_kernelmode": 200000000,
      "usage_in_usermode": 1050000000
    },
    "system_cpu_usage": 98765432100,
    "online_cpus": 4
  },
  "memory_stats": {
    "usage": 47390720,
    "max_usage": 52428800,
    "limit": 1073741824
  },
  "networks": {
    "eth0": {
      "rx_bytes": 1234,
      "tx_bytes": 567
    }
  }
}
```

This gives you raw numbers instead of pre-formatted strings. You can calculate exact percentages yourself.

## Calculating CPU Percentage from API Data

The API response includes raw counters rather than percentages. To calculate CPU percentage, you need two data points. Here is how to do it:

```bash
#!/bin/bash
# calculate-cpu.sh - Calculate CPU percentage from Docker API stats

CONTAINER="web"

# Fetch stats from the Docker API
STATS=$(curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/containers/$CONTAINER/stats?stream=false")

# Extract the values needed for CPU calculation
CPU_DELTA=$(echo "$STATS" | jq '.cpu_stats.cpu_usage.total_usage - .precpu_stats.cpu_usage.total_usage')
SYSTEM_DELTA=$(echo "$STATS" | jq '.cpu_stats.system_cpu_usage - .precpu_stats.system_cpu_usage')
NUM_CPUS=$(echo "$STATS" | jq '.cpu_stats.online_cpus')

# Calculate the CPU percentage
CPU_PERCENT=$(echo "scale=2; ($CPU_DELTA / $SYSTEM_DELTA) * $NUM_CPUS * 100" | bc)

echo "Container: $CONTAINER"
echo "CPU Usage: ${CPU_PERCENT}%"
```

## Collecting Stats for All Containers

To get API-level JSON for all running containers at once, loop through container IDs:

```bash
#!/bin/bash
# collect-all-stats.sh - Collect JSON stats from every running container

# Get all running container IDs
CONTAINERS=$(curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/containers/json" | jq -r '.[].Id')

# Build a JSON array with stats for each container
echo "["
FIRST=true
for CID in $CONTAINERS; do
    # Get the container name
    NAME=$(curl -s --unix-socket /var/run/docker.sock \
      "http://localhost/containers/$CID/json" | jq -r '.Name' | sed 's/^\///')

    # Get stats snapshot
    STATS=$(curl -s --unix-socket /var/run/docker.sock \
      "http://localhost/containers/$CID/stats?stream=false")

    # Add comma separator between entries
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo ","
    fi

    # Output container name and key metrics
    echo "$STATS" | jq "{name: \"$NAME\", cpu_stats: .cpu_stats.cpu_usage, memory: {usage: .memory_stats.usage, limit: .memory_stats.limit}}"
done
echo "]"
```

## Using Docker SDK for Python

If you need to collect stats programmatically, Docker's Python SDK is cleaner than shell scripts:

```python
# collect_stats.py - Collect container stats using Docker SDK
import docker
import json

client = docker.from_env()

all_stats = []
for container in client.containers.list():
    # Get a single stats snapshot (stream=False returns one reading)
    stats = container.stats(stream=False)

    # Extract the fields we care about
    entry = {
        "name": container.name,
        "cpu_total": stats["cpu_stats"]["cpu_usage"]["total_usage"],
        "memory_usage": stats["memory_stats"].get("usage", 0),
        "memory_limit": stats["memory_stats"].get("limit", 0),
        "network_rx": sum(v["rx_bytes"] for v in stats.get("networks", {}).values()),
        "network_tx": sum(v["tx_bytes"] for v in stats.get("networks", {}).values()),
    }
    all_stats.append(entry)

# Output as formatted JSON
print(json.dumps(all_stats, indent=2))
```

Run it:

```bash
# Install the Docker SDK and run the stats collector
pip install docker
python collect_stats.py
```

## Streaming Stats to a File

For time-series analysis, you might want to stream stats to a file in JSON Lines format:

```bash
# Stream stats to a JSONL file, one reading per second
docker stats --format '{"timestamp":"{{.Name}}","cpu":"{{.CPUPerc}}","mem":"{{.MemPerc}}"}' \
  | while read line; do
    echo "{\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",$(echo $line | sed 's/^{//')}" >> /var/log/container-stats.jsonl
  done
```

## Filtering Stats for Specific Containers

You do not have to collect stats for every container. Pass container names or IDs as arguments:

```bash
# Get JSON stats for only the web and database containers
docker stats --no-stream --format '{"name":"{{.Name}}","cpu":"{{.CPUPerc}}","mem":"{{.MemPerc}}"}' web database
```

Or filter by label:

```bash
# Get stats for containers with a specific label
docker stats --no-stream --format '{"name":"{{.Name}}","cpu":"{{.CPUPerc}}"}' \
  $(docker ps -q --filter "label=tier=frontend")
```

## Piping JSON Stats to Monitoring Tools

Once you have JSON, you can push it anywhere. Here is an example that sends container stats to a webhook every 30 seconds:

```bash
#!/bin/bash
# push-stats.sh - Send container stats to a webhook endpoint

WEBHOOK_URL="https://monitoring.example.com/api/v1/metrics"

while true; do
    # Collect stats as a JSON array
    PAYLOAD=$(docker stats --no-stream \
      --format '{"name":"{{.Name}}","cpu":"{{.CPUPerc}}","mem":"{{.MemPerc}}"}' \
      | jq -s '{containers: ., timestamp: now | todate}')

    # POST the JSON payload to the monitoring endpoint
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD"

    # Wait 30 seconds before the next collection
    sleep 30
done
```

## Summary

Docker gives you multiple paths to JSON-formatted container statistics. The `--format` flag on `docker stats` handles simple cases where you just need key metrics in JSON form. The Docker Engine API provides raw, precise numbers for serious monitoring. And the Python SDK offers a clean programmatic interface. Pick the approach that fits your use case, and you will have structured, actionable data from your containers.
