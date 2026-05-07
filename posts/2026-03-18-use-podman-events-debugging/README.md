# How to Use podman events for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Debugging, Event, Troubleshooting

Description: Learn how to use podman events as a debugging tool to diagnose container failures, startup issues, and unexpected behavior.

---

> When a container misbehaves, the event stream is your first line of investigation - it tells you exactly what happened and when.

Debugging container issues can be frustrating without visibility into what is happening behind the scenes. The `podman events` command serves as a powerful debugging tool that shows you the sequence of events leading up to a problem. Whether a container fails to start, crashes unexpectedly, or behaves erratically, the event stream provides the timeline you need to diagnose the issue. This guide shows you how to use Podman events effectively for debugging.

---

## Debugging Container Startup Failures

When a container fails to start, events reveal the sequence of what happened.

```bash
# Try to run a container with a broken command

podman run --name debug-start alpine nonexistent-command 2>/dev/null

# Check the events to see what happened
podman events --since 1m --stream=false --filter container=debug-start \
    --format '{{.Time}} {{.Status}}'

# You will see: create, init, start, died in quick succession
# The died event confirms the container exited immediately

# Get the exit code
podman inspect --format '{{.State.ExitCode}}' debug-start
podman rm debug-start
```

## Debugging Container Crashes

Track down why a running container died unexpectedly.

```bash
# Create a container that will crash after some time
podman run -d --name debug-crash alpine \
    sh -c "sleep 10 && echo 'simulated crash' >&2 && kill -9 1"

# Monitor events for this container
podman events --filter container=debug-crash --format json &
EVENTS_PID=$!

# Wait for the crash
sleep 15

# Stop the event monitor
kill $EVENTS_PID 2>/dev/null

# Check the container state
podman inspect --format '{{.State.Status}} exit:{{.State.ExitCode}}' debug-crash

# Check the logs for error messages
podman logs debug-crash

podman rm debug-crash
```

## Debugging OOM Kills

Detect when containers are killed due to memory exhaustion.

```bash
# Run a container with a strict memory limit
podman run -d --name debug-oom --memory 10m docker.io/library/python:3-alpine \
    sh -c "python -c 'x = bytearray(20 * 1024 * 1024); import time; time.sleep(30)'"

# Check events for OOM indicators
podman events --since 1m --stream=false --filter container=debug-oom \
    --format '{{.Time}} {{.Status}}'

# Inspect the container for OOM details
podman inspect --format '{{.State.OOMKilled}}' debug-oom 2>/dev/null

podman rm -f debug-oom 2>/dev/null
```

## Debugging with Event Timelines

Build a timeline of events to understand the sequence of actions.

```bash
#!/bin/bash
# event-timeline.sh - Build a debug timeline for a container
# Usage: ./event-timeline.sh <container-name> [duration]

CONTAINER="${1:?Usage: $0 <container-name> [duration]}"
DURATION="${2:-1h}"

echo "=== Debug Timeline for: ${CONTAINER} ==="
echo "Looking back: ${DURATION}"
echo ""

# Get all events for this container
podman events --since "$DURATION" \
    --stream=false \
    --filter container="$CONTAINER" \
    --format json 2>/dev/null | \
while IFS= read -r event; do
    timestamp=$(echo "$event" | jq -r '.time | todateiso8601')
    status=$(echo "$event" | jq -r '.Status')

    # Add context based on event type
    case "$status" in
        create)
            image=$(echo "$event" | jq -r '.Image // "unknown"')
            echo "${timestamp} | CREATE  | Image: ${image}"
            ;;
        start)
            echo "${timestamp} | START   | Container started"
            ;;
        died)
            exit_code=$(echo "$event" | jq -r '.ContainerExitCode // "unknown"')
            echo "${timestamp} | DIED    | Exit code: ${exit_code}"
            ;;
        stop)
            echo "${timestamp} | STOP    | Graceful shutdown"
            ;;
        kill)
            echo "${timestamp} | KILL    | Signal sent"
            ;;
        exec)
            echo "${timestamp} | EXEC    | Command executed inside container"
            ;;
        *)
            echo "${timestamp} | ${status} |"
            ;;
    esac
done

echo ""
echo "=== Current State ==="
podman inspect --format 'Status: {{.State.Status}}
Exit Code: {{.State.ExitCode}}
Started: {{.State.StartedAt}}
Finished: {{.State.FinishedAt}}' "$CONTAINER" 2>/dev/null || echo "Container not found"
```

## Debugging Restart Loops

Identify containers stuck in restart loops by looking at event patterns.

```bash
#!/bin/bash
# debug-restarts.sh - Analyze restart patterns

echo "=== Containers with Recent Restarts ==="
echo ""

# Look for containers that have multiple start events in the last hour
podman events --since 1h --stream=false --filter type=container --filter event=start --format json 2>/dev/null | \
    jq -r '.Name // "unknown"' | sort | uniq -c | sort -rn | \
while read -r count name; do
    if [ "$count" -gt 2 ]; then
        echo "Container: ${name} - Started ${count} times in last hour"

        # Show the timeline
        podman events --since 1h --filter container="$name" \
            --stream=false --format json 2>/dev/null | \
            jq -r '"  \(.time | todateiso8601) \(.Status)"'

        echo ""
    fi
done
```

## Debugging Network Issues

Use events alongside network inspection to debug connectivity problems.

```bash
# Create containers that should communicate
podman network create debug-net

podman run -d --name debug-server --network debug-net alpine \
    sh -c "while true; do echo 'listening'; sleep 5; done"

podman run -d --name debug-client --network debug-net alpine \
    sh -c "while true; do ping -c 1 debug-server 2>&1; sleep 5; done"

# Monitor events for both containers
podman events --filter container=debug-server --filter container=debug-client \
    --format '{{.Time}} [{{.Name}}] {{.Status}}' &

# Check container network details
podman inspect --format '{{.NetworkSettings.Networks}}' debug-server
podman inspect --format '{{.NetworkSettings.Networks}}' debug-client

# View logs for debugging
podman logs debug-client

# Cleanup
podman rm -f debug-server debug-client 2>/dev/null
podman network rm debug-net 2>/dev/null
```

## Debugging with Correlated Events

Correlate events across multiple containers to debug distributed issues.

```bash
#!/bin/bash
# correlate-events.sh - Show events across all containers in time order

echo "=== Correlated Event View (last 30 minutes) ==="
echo ""
echo "TIMESTAMP                  | CONTAINER           | EVENT"
echo "---------------------------|---------------------|--------"

podman events --since 30m --stream=false --filter type=container --format json 2>/dev/null | \
    jq -r '[(.time | todateiso8601), (.Name // "unknown"), .Status] | @tsv' | \
    sort | \
while IFS=$'\t' read -r timestamp name status; do
    printf "%-27s | %-19s | %s\n" "$timestamp" "$name" "$status"
done
```

## Quick Debug Checklist

```bash
#!/bin/bash
# quick-debug.sh - Quick debug checklist for a container
# Usage: ./quick-debug.sh <container-name>

CONTAINER="${1:?Usage: $0 <container-name>}"

echo "=== Quick Debug: ${CONTAINER} ==="

# 1. Current state
echo "1. Current state:"
podman inspect --format '   Status: {{.State.Status}} | Exit: {{.State.ExitCode}}' "$CONTAINER" 2>/dev/null

# 2. Recent events
echo "2. Recent events:"
podman events --since 30m --stream=false --filter container="$CONTAINER" \
    --format '   {{.Time}} {{.Status}}' 2>/dev/null

# 3. Last logs
echo "3. Last 10 log lines:"
podman logs --tail 10 "$CONTAINER" 2>/dev/null | sed 's/^/   /'

# 4. Resource usage
echo "4. Resource usage:"
podman stats --no-stream --format '   CPU: {{.CPUPerc}} | MEM: {{.MemUsage}}' "$CONTAINER" 2>/dev/null
```

## Cleanup

```bash
# Remove debug containers
podman rm -f debug-start debug-crash debug-oom debug-server debug-client 2>/dev/null
podman network rm debug-net 2>/dev/null
```

## Summary

Using `podman events` for debugging provides a chronological view of everything that happened to your containers. From startup failures and crashes to OOM kills and restart loops, the event stream tells the story of each incident. By building debug timelines, correlating events across containers, and combining events with logs and inspection data, you can systematically diagnose and resolve container issues. Keep the quick debug checklist handy for rapid first-response troubleshooting.
