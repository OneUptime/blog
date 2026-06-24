# How to Filter Container Events by Event Status in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Event, Filtering, Status

Description: Learn how to filter Podman events by event status to monitor specific lifecycle states like start, stop, die, and more.

---

> Filtering by event status lets you focus on exactly the container state transitions that matter to your operations.

Podman containers go through many state transitions during their lifecycle. Each transition generates an event with a specific status. By filtering on event status, you can monitor only the transitions you care about - whether that is containers starting, stopping unexpectedly, changing health status, or being removed. This guide covers the main container event statuses available in Podman and how to filter for them effectively.

---

## Available Event Statuses

Podman containers emit events with the following statuses:

```bash
# Lifecycle statuses

# attach   - Container was attached to
# checkpoint - Container was checkpointed
# cleanup  - Container resources were cleaned up
# connect  - Container network was connected
# create   - Container was created
# disconnect - Container network was disconnected
# exited   - Container process exited
# died     - Container process exited (die is accepted as a Docker-compatible alias)
# import   - Container was imported
# init     - Container was initialized
# start    - Container started running
# stop     - Container was stopped gracefully
# remove   - Container was removed
# rename   - Container was renamed
# restart  - Container was restarted
# prune    - Containers were pruned
# restore  - Container was restored
# sync     - Container state was synchronized
# update   - Container configuration was updated

# Runtime statuses
# pause    - Container was paused
# unpause  - Container was unpaused
# exec     - A command was executed in the container
# exec_died - An exec session exited
# kill     - Container received a signal

# Storage statuses
# mount    - Container filesystem was mounted
# unmount  - Container filesystem was unmounted
# commit   - Container was committed to an image
# export   - Container was exported

# Health statuses
# health_status - Health check result changed
```

## Filtering for Start Events

Track when containers begin running.

```bash
# Monitor all container starts
podman events --filter event=start

# Test it by starting a container
podman run -d --name status-test alpine sleep 120
```

## Filtering for Stop and Died Events

These are critical for detecting container shutdowns and crashes.

```bash
# Monitor graceful stops
podman events --filter event=stop

# Monitor container exits
podman events --filter event=died

# Monitor both stop and died events together
podman events --filter event=stop --filter event=died
```

The difference between stop and died is important: `stop` means a graceful shutdown was requested, while `died` means the container process exited (which could be normal or a crash). Podman also accepts `event=die` as a Docker-compatible alias for `event=died`.

```bash
# Generate a stop event
podman stop status-test

# Generate a died event from a crash
podman run --name crash-test alpine sh -c "exit 1"
```

## Filtering for Create and Remove Events

Track the full container provisioning and deprovisioning cycle.

```bash
# Monitor container creation
podman events --filter event=create

# Monitor container removal
podman events --filter event=remove

# Generate events
podman create --name create-test alpine echo "created"
podman rm create-test
```

## Filtering for Exec Events

Monitor when commands are executed inside running containers - useful for security auditing.

```bash
# Monitor exec events
podman events --filter event=exec

# Generate an exec event
podman run -d --name exec-test alpine sleep 300
podman exec exec-test ls /
podman exec exec-test whoami
```

## Filtering for Pause and Unpause Events

Track when containers are suspended and resumed.

```bash
# Monitor pause events
podman events --filter event=pause --filter event=unpause

# Generate events
podman pause exec-test
podman unpause exec-test
```

## Building a Status-Based Alert System

Here is a script that watches for critical statuses and sends alerts.

```bash
#!/bin/bash
# status-alerts.sh - Alert on critical container event statuses

ALERT_LOG="/tmp/podman-alerts.log"

echo "Monitoring for critical container events..."

# Watch for died and kill events
podman events --format json \
    --filter event=died \
    --filter event=kill | \
while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$status" in
        died)
            # Use the event's exit code when Podman includes it, otherwise inspect the container
            exit_code=$(echo "$event" | jq -r '.ContainerExitCode // empty')
            if [ -z "$exit_code" ] && [ "$name" != "unknown" ]; then
                exit_code=$(podman inspect --format '{{.State.ExitCode}}' "$name" 2>/dev/null || echo "unknown")
            fi
            exit_code=${exit_code:-unknown}
            alert="CRITICAL: Container '${name}' died with exit code ${exit_code}"
            ;;
        kill)
            alert="WARNING: Container '${name}' received kill signal"
            ;;
        *)
            alert="INFO: Container '${name}' status: ${status}"
            ;;
    esac

    echo "[${timestamp}] ${alert}" | tee -a "$ALERT_LOG"
done
```

## Combining Status Filters with Time Ranges

Review past events filtered by status for incident investigation.

```bash
# Find all container exits in the last 24 hours
podman events --filter event=died --since 24h

# Find all container starts in a specific time window
podman events --filter event=start \
    --since "2026-03-18T00:00:00" \
    --until "2026-03-18T23:59:59"

# Count restarts for a container in the last hour
podman events --filter event=restart --filter container=myapp --since 1h \
    --format json | wc -l
```

## Using Status Filters for Health Monitoring

```bash
# Monitor health check status changes
podman events --filter event=health_status

# Create a container with health checks
podman run -d --name health-test \
    --health-cmd "curl -f http://localhost/ || exit 1" \
    --health-interval 10s \
    nginx:latest

# Watch for health status changes
podman events --filter container=health-test --filter event=health_status
```

## Cleanup

```bash
# Remove all test containers
podman rm -f status-test crash-test exec-test health-test 2>/dev/null
```

## Summary

Filtering Podman events by status gives you precise control over what container state transitions you monitor. From tracking starts and stops for lifecycle management, to watching died events for crash detection, to monitoring exec events for security auditing, status filtering is a powerful tool. By combining status filters with container filters and time ranges, you can build targeted monitoring that focuses on exactly the events that matter to your operations.
