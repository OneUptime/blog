# How to Filter Docker Container Logs by Time Range

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Logs, Logging, Debugging, DevOps, Troubleshooting

Description: Learn how to filter Docker container logs by specific time ranges using --since and --until flags for faster debugging and log analysis.

---

Docker containers produce logs continuously. When you are investigating an incident that happened at 3:47 AM or reviewing what occurred during a deployment window, you need to filter logs to a specific time range rather than scrolling through hours of output.

Docker provides `--since` and `--until` flags on the `docker logs` command that let you zero in on exactly the time period you care about. This guide covers every practical way to use time-based log filtering.

## Basic Time Filtering with --since

The `--since` flag shows logs generated after a specific point in time.

```bash
# Show logs from the last 30 minutes
docker logs --since 30m my-container

# Show logs from the last 2 hours
docker logs --since 2h my-container

# Show logs from the last 1 day
docker logs --since 24h my-container
```

The duration format supports:
- `s` for seconds
- `m` for minutes
- `h` for hours

You can also use an absolute timestamp:

```bash
# Show logs since a specific date and time (RFC 3339 format)
docker logs --since "2026-02-08T14:30:00" my-container

# Show logs since a specific date (midnight)
docker logs --since "2026-02-08" my-container

# With timezone offset
docker logs --since "2026-02-08T14:30:00-05:00" my-container
```

## Filtering with --until

The `--until` flag shows logs generated before a specific point in time.

```bash
# Show logs up until 1 hour ago
docker logs --until 1h my-container

# Show logs up until a specific timestamp
docker logs --until "2026-02-08T15:00:00" my-container
```

## Combining --since and --until

Use both flags together to get a precise time window.

```bash
# Show logs between 2:00 PM and 3:00 PM
docker logs --since "2026-02-08T14:00:00" --until "2026-02-08T15:00:00" my-container

# Show logs from 30 minutes ago to 10 minutes ago
docker logs --since 30m --until 10m my-container
```

This is particularly useful during incident investigation. If you know the incident started around 2:45 PM and was resolved by 3:15 PM:

```bash
# Focus on the incident window
docker logs --since "2026-02-08T14:45:00" --until "2026-02-08T15:15:00" my-container
```

## Adding Timestamps to Log Output

By default, Docker logs do not show timestamps. Add them with the `-t` flag.

```bash
# Show logs with timestamps for the last hour
docker logs -t --since 1h my-container
```

The output includes ISO 8601 timestamps:

```
2026-02-08T14:30:01.123456789Z GET /api/health 200 OK
2026-02-08T14:30:05.456789012Z POST /api/users 201 Created
2026-02-08T14:30:12.789012345Z GET /api/users/42 404 Not Found
```

Having timestamps in the output helps you correlate events with other systems.

## Tailing Filtered Logs

Combine time filtering with the `--tail` flag to limit output further.

```bash
# Show the last 100 lines from the last hour
docker logs --since 1h --tail 100 my-container

# Show the last 50 lines from a specific time window
docker logs --since "2026-02-08T14:00:00" --until "2026-02-08T15:00:00" --tail 50 my-container
```

## Following Filtered Logs

The `-f` (follow) flag works with `--since` to start following from a specific point.

```bash
# Follow logs starting from 5 minutes ago
docker logs -f --since 5m my-container

# Follow logs with timestamps starting from the last hour
docker logs -f -t --since 1h my-container
```

This is useful during active debugging. You see recent history and then continue watching new entries in real time.

## Filtering Logs Across Multiple Containers

When debugging a distributed system, you need logs from multiple containers in the same time range.

```bash
#!/bin/bash
# multi-container-logs.sh - Get time-filtered logs from multiple containers
# Usage: ./multi-container-logs.sh "2026-02-08T14:00:00" "2026-02-08T15:00:00" web api worker

SINCE=$1
UNTIL=$2
shift 2

for container in "$@"; do
    echo "============================================="
    echo "Container: $container"
    echo "============================================="
    docker logs -t --since "$SINCE" --until "$UNTIL" "$container" 2>&1
    echo ""
done
```

Run it:

```bash
# Get logs from web, api, and worker containers for the incident window
./multi-container-logs.sh "2026-02-08T14:45:00" "2026-02-08T15:15:00" web api worker
```

## Docker Compose Log Filtering

Docker Compose supports the same time filtering flags.

```bash
# Show logs from all services for the last 30 minutes
docker compose logs --since 30m

# Show logs from specific services for a time window
docker compose logs --since "2026-02-08T14:00:00" --until "2026-02-08T15:00:00" web api

# Follow logs from all services starting from 5 minutes ago
docker compose logs -f --since 5m
```

## Searching Within a Time Range

Combine Docker's time filtering with grep to find specific patterns within a time window.

```bash
# Find error messages in the last hour
docker logs --since 1h my-container 2>&1 | grep -i "error"

# Find 5xx status codes in a specific time window
docker logs --since "2026-02-08T14:00:00" --until "2026-02-08T15:00:00" my-container 2>&1 | grep " 5[0-9][0-9] "

# Count requests per second during an incident
docker logs -t --since "2026-02-08T14:45:00" --until "2026-02-08T14:50:00" my-container 2>&1 | \
  cut -d'.' -f1 | sort | uniq -c | sort -rn | head -20
```

Note the `2>&1` redirect. Docker sends some log output to stderr, so redirecting ensures you capture everything.

## Extracting Logs to a File

Save filtered logs for sharing with teammates or attaching to incident reports.

```bash
# Save time-filtered logs to a file
docker logs -t --since "2026-02-08T14:00:00" --until "2026-02-08T15:00:00" my-container > incident-logs.txt 2>&1

# Save logs from multiple containers to separate files
for container in web api worker; do
    docker logs -t --since 1h "$container" > "${container}-logs.txt" 2>&1
done
```

## Working with JSON-Formatted Logs

Many applications output structured JSON logs. Combine time filtering with `jq` for powerful analysis.

```bash
# Parse JSON logs from the last hour and filter by log level
docker logs --since 1h my-container 2>&1 | \
  jq -r 'select(.level == "error") | "\(.timestamp) \(.message)"'

# Count log entries by level in a time window
docker logs --since "2026-02-08T14:00:00" --until "2026-02-08T15:00:00" my-container 2>&1 | \
  jq -r '.level' | sort | uniq -c | sort -rn

# Extract slow requests (response time > 1000ms)
docker logs --since 1h my-container 2>&1 | \
  jq -r 'select(.response_time_ms > 1000) | "\(.timestamp) \(.path) \(.response_time_ms)ms"'
```

## Understanding Docker's Time Reference

Docker uses the container's creation time and the system clock for time calculations. A few things to keep in mind:

```bash
# Check what timezone the Docker daemon uses (usually UTC)
docker info --format '{{.OperatingSystem}}'

# Container logs timestamps are always in UTC
docker logs -t --tail 1 my-container
```

When specifying absolute times, use UTC or include a timezone offset to avoid confusion:

```bash
# These are equivalent for a UTC-5 timezone
docker logs --since "2026-02-08T14:00:00Z" my-container        # UTC
docker logs --since "2026-02-08T09:00:00-05:00" my-container   # EST
```

## Building an Incident Investigation Script

Here is a comprehensive script for incident log gathering.

```bash
#!/bin/bash
# incident-logs.sh - Gather logs for incident investigation
# Usage: ./incident-logs.sh <start-time> <end-time> [output-dir]

START=$1
END=$2
OUTPUT_DIR=${3:-"./incident-$(date +%Y%m%d_%H%M%S)"}

mkdir -p "$OUTPUT_DIR"

echo "Gathering incident logs from $START to $END"
echo "Output directory: $OUTPUT_DIR"

# Get logs from all running containers
docker ps --format '{{.Names}}' | while read container; do
    echo "Collecting logs from: $container"
    docker logs -t --since "$START" --until "$END" "$container" \
      > "$OUTPUT_DIR/${container}.log" 2>&1

    # Count lines collected
    LINES=$(wc -l < "$OUTPUT_DIR/${container}.log")
    echo "  Collected $LINES log lines"
done

# Create a summary
echo ""
echo "=== Log Collection Summary ===" | tee "$OUTPUT_DIR/summary.txt"
echo "Time range: $START to $END" | tee -a "$OUTPUT_DIR/summary.txt"
echo "Files collected:" | tee -a "$OUTPUT_DIR/summary.txt"
ls -lh "$OUTPUT_DIR"/*.log | tee -a "$OUTPUT_DIR/summary.txt"
```

Run it during an incident:

```bash
./incident-logs.sh "2026-02-08T14:45:00" "2026-02-08T15:15:00"
```

## Conclusion

Time-based log filtering with `--since` and `--until` turns Docker log analysis from a haystack search into a targeted investigation. Use relative times like `30m` for quick debugging and absolute timestamps for incident reviews. Combine with `grep` for pattern matching, `jq` for structured log analysis, and scripts for multi-container log gathering. These techniques dramatically reduce the time it takes to find the log entries that matter during outages and debugging sessions.
