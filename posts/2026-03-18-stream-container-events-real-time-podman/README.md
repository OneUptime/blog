# How to Stream Container Events in Real-Time with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Real-Time, Streaming, Event

Description: Learn how to stream container events in real-time with Podman to get instant visibility into container lifecycle changes as they happen.

---

> Real-time event streaming turns Podman from a container runtime into a live observability platform.

When managing containers in production, knowing what is happening right now is critical. Podman provides real-time event streaming that lets you watch container lifecycle events as they occur. This is invaluable for debugging issues, monitoring deployments, and building automated responses to container state changes. This guide covers everything you need to know about streaming Podman events in real-time.

---

## Basic Real-Time Streaming

The `podman events` command streams events in real-time by default. It blocks and waits for new events, printing each one as it occurs.

```bash
# Start streaming all events in real-time

# This will block and wait for events
podman events
```

Open a second terminal and trigger some events:

```bash
# In a second terminal, create container activity
podman run -d --name stream-test alpine sleep 60

# Stop the container
podman stop stream-test

# Remove the container
podman rm stream-test
```

You will see each event appear in the first terminal immediately as it happens.

## Streaming with Filters

In a busy environment, streaming all events creates too much noise. Apply filters to focus on what matters.

```bash
# Stream only container start events
podman events --filter event=start

# Stream only container stop and died events
podman events --filter event=stop --filter event=died

# Stream events for a specific container
podman events --filter container=myapp
```

## Streaming with JSON Output

For programmatic consumption, stream events as JSON objects. Each event is a complete JSON object on a single line.

```bash
# Stream events as JSON, one object per line
podman events --format json
```

This produces output like:

```json
{"ID":"a0f8ab051bfd43f9c5141a8a2502139707e4b38d98ac0872e57c5315381e88ad","Image":"docker.io/library/alpine:latest","Name":"stream-test","Status":"start","Time":"2026-03-18T10:15:30.123456-04:00","Type":"container"}
```

## Building a Real-Time Event Processor

Here is a script that processes events in real-time and takes action based on event type.

```bash
#!/bin/bash
# realtime-processor.sh - Process Podman events in real-time

echo "Starting real-time event processor..."

podman events --format json | while IFS= read -r event; do
    # Parse event fields using jq
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    event_type=$(echo "$event" | jq -r '.Type')
    timestamp=$(echo "$event" | jq -r '.Time')

    # React based on event type
    case "$status" in
        start)
            echo "[${timestamp}] STARTED: ${name}"
            ;;
        stop)
            echo "[${timestamp}] STOPPED: ${name}"
            ;;
        died)
            echo "[${timestamp}] DIED: ${name} - Investigating..."
            exit_code=$(echo "$event" | jq -r '.ContainerExitCode // empty')
            if [ -n "$exit_code" ] && [ "$exit_code" != "0" ]; then
                echo "  WARNING: Non-zero exit code: ${exit_code}"
            fi
            ;;
        remove)
            echo "[${timestamp}] REMOVED: ${name}"
            ;;
        *)
            echo "[${timestamp}] ${status}: ${name} (${event_type})"
            ;;
    esac
done
```

```bash
# Run the processor
chmod +x realtime-processor.sh
./realtime-processor.sh
```

## Streaming Events with Timestamps

Use Go templates to customize the output format in the stream.

```bash
# Stream with custom output format
podman events --format '{{.Time}} | {{.Type}} | {{.Status}} | {{.Name}}'

# Stream with only the fields you care about
podman events --format 'EVENT: {{.Status}} CONTAINER: {{.Name}}'
```

## Multiplexing Event Streams

You can run multiple filtered streams simultaneously to separate concerns.

```bash
# Terminal 1: Monitor critical events (died, kill)
podman events --filter event=died --filter event=kill

# Terminal 2: Monitor lifecycle events
podman events --filter event=start --filter event=stop

# Terminal 3: Monitor image events
podman events --filter type=image
```

## Using tee for Simultaneous Display and Logging

Stream events to both the terminal and a log file simultaneously.

```bash
# Stream to terminal and log file at the same time
podman events --format json | tee /tmp/podman-realtime.log

# Stream filtered events to multiple destinations
podman events --format json | tee >(jq -r '.Status' >> /tmp/statuses.log) | jq '.'
```

## Handling Stream Disconnections

In production, your event stream should be resilient to disconnections.

```bash
#!/bin/bash
# resilient-stream.sh - Auto-reconnecting event stream

while true; do
    echo "$(date): Connecting to Podman event stream..."

    # Stream events; this command exits if the event stream disconnects
    podman events --format json 2>/tmp/podman-events-error.log

    # If we get here, the stream disconnected
    echo "$(date): Event stream disconnected, reconnecting in 5 seconds..."
    sleep 5
done
```

## Cleanup

```bash
# Remove any leftover test containers
podman rm -f stream-test 2>/dev/null
```

## Summary

Real-time event streaming with Podman gives you immediate visibility into container lifecycle changes. By combining the `podman events` command with filters, JSON formatting, and simple scripts, you can build powerful real-time monitoring solutions. Whether you need a quick debugging stream or a production-grade event processor with auto-reconnection, Podman's event streaming provides the foundation you need.
