# How to Filter Container Events by Type in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Event, Filtering

Description: Learn how to filter Podman events by entity type to focus on containers, images, pods, volumes, or system events separately.

---

> Filtering events by type is the first step to cutting through noise and finding the signals that matter.

Podman generates events for multiple entity types: containers, images, pods, volumes, networks, secrets, and the system itself. In a busy environment, watching all events at once is overwhelming. By filtering events by type, you can focus on exactly the category of activity you care about. This guide shows you how to use type filters effectively.

---

## Understanding Event Types

Podman supports several event types, each corresponding to a different entity:

```bash
# Container events - lifecycle of containers

podman events --filter type=container

# Image events - pull, push, remove, tag operations
podman events --filter type=image

# Pod events - pod lifecycle events
podman events --filter type=pod

# Volume events - volume create, remove events
podman events --filter type=volume

# Network events - network create, connect, disconnect, remove events
podman events --filter type=network

# Secret events - secret create, remove events
podman events --filter type=secret

# System events - refresh, renumber events
podman events --filter type=system
```

## Filtering for Container Events

Container events are the most common. They cover the full container lifecycle.

```bash
# Watch only container events
podman events --filter type=container

# Generate some container events to observe
podman run -d --name type-test-1 alpine sleep 120
podman stop type-test-1
podman rm type-test-1
```

Container events include: attach, checkpoint, cleanup, commit, connect, create, died, disconnect, exec, exec_died, exited, export, import, init, kill, mount, pause, prune, remove, rename, restart, restore, start, stop, sync, unmount, unpause, update.

## Filtering for Image Events

Image events track operations on container images.

```bash
# Watch only image events
podman events --filter type=image

# In another terminal, trigger image events
podman pull alpine:latest
podman tag alpine:latest myalpine:v1
podman rmi myalpine:v1
```

Image events include: loadFromArchive, mount, pull, pull-error, push, remove, save, tag, unmount, untag.

## Filtering for Pod Events

Pod events monitor the lifecycle of Podman pods.

```bash
# Watch only pod events
podman events --filter type=pod

# In another terminal, create and manage a pod
podman pod create --name test-pod
podman run -d --pod test-pod --name pod-container alpine sleep 60
podman pod stop test-pod
podman pod rm test-pod
```

## Filtering for Volume Events

Volume events track the creation and removal of named volumes.

```bash
# Watch only volume events
podman events --filter type=volume

# In another terminal, manage volumes
podman volume create test-volume
podman volume rm test-volume
```

## Combining Type Filters with Other Filters

Type filters become powerful when combined with event and time filters.

```bash
# Container start events only
podman events --filter type=container --filter event=start

# Image pull events from the last hour
podman events --filter type=image --filter event=pull --since 1h

# Container died events in JSON format
podman events --filter type=container --filter event=died --format json
```

## Building a Multi-Type Event Monitor

Here is a script that monitors different event types and routes them to separate log files.

```bash
#!/bin/bash
# multi-type-monitor.sh - Route events by type to separate logs

LOG_DIR="/tmp/podman-events"
mkdir -p "$LOG_DIR"

echo "Starting multi-type event monitor..."
echo "Logs directory: ${LOG_DIR}"

# Stream all events and route by type
podman events --format json | while IFS= read -r event; do
    event_type=$(echo "$event" | jq -r '.Type')
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // .ID')
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Route to type-specific log file
    log_file="${LOG_DIR}/${event_type}.log"
    echo "[${timestamp}] ${status} - ${name}" >> "$log_file"

    # Also print to stdout
    echo "[${event_type}] ${status} - ${name}"
done
```

```bash
# Make executable and run
chmod +x multi-type-monitor.sh
./multi-type-monitor.sh
```

## Listing Events by Type with Custom Formatting

Use Go templates to create type-specific views.

```bash
# Container events with container name and status
podman events --filter type=container \
    --format '{{.Time}} CONTAINER {{.Name}} {{.Status}}'

# Image events with image name and action
podman events --filter type=image \
    --format '{{.Time}} IMAGE {{.Name}} {{.Status}}'

# All events showing the type prominently
podman events --format '[{{.Type}}] {{.Time}} {{.Status}} {{.Name}}'
```

## Verifying Type Filter Behavior

You can verify which types generate events by running a comprehensive test.

```bash
#!/bin/bash
# test-event-types.sh - Generate events of each type

echo "Generating container events..."
podman run --rm --name type-verify alpine echo "hello"

echo "Generating image events..."
podman pull busybox:latest
podman rmi busybox:latest

echo "Generating volume events..."
podman volume create verify-vol
podman volume rm verify-vol

echo "Generating pod events..."
podman pod create --name verify-pod
podman pod rm verify-pod

echo "Done. Check 'podman events --since 1m' for all generated events."
```

## Cleanup

```bash
# Remove any leftover resources
podman rm -f type-test-1 pod-container 2>/dev/null
podman pod rm -f test-pod 2>/dev/null
podman volume rm test-volume verify-vol 2>/dev/null
```

## Summary

Filtering Podman events by type lets you focus on the specific category of activity you need to monitor. Whether you are tracking container lifecycles, image operations, pod management, volume changes, network changes, or secret changes, the `--filter type=` flag narrows down the event stream to exactly what matters. Combined with other filters and JSON output, type filtering is a fundamental building block for effective Podman monitoring.
