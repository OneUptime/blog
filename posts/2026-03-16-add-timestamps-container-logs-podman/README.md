# How to Add Timestamps to Container Logs in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging

Description: Learn how to add timestamps to Podman container logs using the --timestamps flag, making it easier to correlate events and measure timing between log entries.

---

> Without timestamps, container logs are a stream of messages with no sense of when anything happened. The --timestamps flag fixes that.

Application logs may or may not include their own timestamps. Podman can prepend its own timestamps to every log line, giving you a consistent time reference regardless of the application's logging format.

---

## Basic Timestamp Usage

```bash
# View logs with Podman-generated timestamps

podman logs --timestamps my-container

# Short form using -t flag
podman logs -t my-container

# Example output:
# 2026-03-16T14:30:01.123456789Z Starting application...
# 2026-03-16T14:30:02.456789012Z Listening on port 8080
# 2026-03-16T14:30:05.789012345Z Connected to database
```

The timestamp format is RFC 3339 with nanosecond precision, prepended by Podman at log capture time.

## Combine Timestamps with Other Flags

```bash
# Timestamps with tail (last 20 lines)
podman logs --timestamps --tail 20 my-container

# Timestamps with follow (real-time)
podman logs --timestamps -f my-container

# Timestamps with since (time-bounded)
podman logs --timestamps --since 30m my-container

# Timestamps with a specific time range
podman logs --timestamps \
  --since "2026-03-16T14:00:00" \
  --until "2026-03-16T15:00:00" \
  my-container
```

## Measure Time Between Events

Use timestamps to calculate how long operations take.

```bash
# View timestamped logs and look for start/end events
podman logs -t my-container 2>&1 | grep -E "(Starting|Completed)"

# Extract timestamps for timing analysis
podman logs -t my-container 2>&1 | grep "Starting" | awk '{print $1}'
podman logs -t my-container 2>&1 | grep "Completed" | awk '{print $1}'

# Calculate duration between two events using date
START=$(podman logs -t my-container 2>&1 | grep "Starting" | head -1 | awk '{print $1}')
END=$(podman logs -t my-container 2>&1 | grep "Completed" | head -1 | awk '{print $1}')
echo "Start: $START"
echo "End:   $END"

# On Linux, calculate the difference
START_SEC=$(date -d "$START" +%s)
END_SEC=$(date -d "$END" +%s)
echo "Duration: $((END_SEC - START_SEC)) seconds"
```

## Correlate Events Across Containers

Timestamps make it possible to correlate events across different containers.

```bash
# View timestamped logs from multiple containers side by side
{
  podman logs -t web 2>&1 | sed 's/^/[web] /'
  podman logs -t api 2>&1 | sed 's/^/[api] /'
  podman logs -t db  2>&1 | sed 's/^/[db]  /'
} | sort -k2

# Sort merged logs chronologically (timestamps are the second field after the label)
{
  podman logs -t --since 10m web 2>&1 | sed 's/^/[web] /'
  podman logs -t --since 10m api 2>&1 | sed 's/^/[api] /'
} | sort -k2

# Find what happened across services at a specific second
TIMESTAMP="2026-03-16T14:30:01"
for c in web api db; do
  echo "=== $c ==="
  podman logs -t "$c" 2>&1 | grep "$TIMESTAMP"
done
```

## Parse and Reformat Timestamps

Transform Podman's timestamp format for different use cases.

```bash
# Extract just the time portion (HH:MM:SS)
podman logs -t my-container 2>&1 | awk '{split($1,a,"T"); split(a[2],b,"."); print b[1], $0}'

# Convert to a simpler format
podman logs -t my-container 2>&1 | awk '{
  gsub(/T/, " ", $1)
  gsub(/\.[0-9]*Z/, "", $1)
  print
}'

# Group log entries by second
podman logs -t my-container 2>&1 | awk '{print substr($1,1,19)}' | uniq -c | sort -rn | head -10

# Group by minute to see log volume patterns
podman logs -t my-container 2>&1 | awk '{print substr($1,1,16)}' | uniq -c
```

## Timestamps vs Application Timestamps

Some applications include their own timestamps. Podman timestamps can differ from application timestamps due to buffering.

```bash
# View both Podman and application timestamps
podman logs -t my-container 2>&1 | head -5
# Output might look like:
# 2026-03-16T14:30:01.123Z 2026-03-16 14:30:01 INFO Starting app...
#                           ^-- app timestamp
# ^-- Podman timestamp

# When there is a discrepancy, Podman's timestamp reflects when
# the log line was captured, not when the app generated it.
# For accurate timing, prefer the application's own timestamps
# if available.
```

## Use Timestamps in Monitoring Scripts

```bash
#!/bin/bash
# log-rate-monitor.sh - Monitor log rate per minute

CONTAINER="$1"
DURATION="${2:-60m}"

echo "Log rate for $CONTAINER over last $DURATION:"
echo "---"

podman logs -t --since "$DURATION" "$CONTAINER" 2>&1 | \
  awk '{print substr($1,1,16)}' | \
  uniq -c | \
  while read -r count timestamp; do
    printf "%s  %5d lines" "$timestamp" "$count"
    if [ "$count" -gt 100 ]; then
      printf "  ** HIGH VOLUME **"
    fi
    printf "\n"
  done
```

## Summary

The `--timestamps` flag adds RFC 3339 timestamps to every log line, providing consistent time references regardless of application logging format. Use timestamps to measure durations between events, correlate logs across containers by sorting merged output chronologically, and monitor log volume patterns over time. Combine with `--since`, `--until`, and `--tail` for focused time-window analysis.
