# How to Use docker system events for Real-Time Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Monitoring, Events, Real-Time, Container Lifecycle, DevOps, Observability

Description: Monitor Docker container lifecycle events in real time using docker system events for debugging and automated responses.

---

Every action in Docker generates an event. Containers starting, stopping, dying. Images being pulled, tagged, deleted. Volumes created, networks connected. The `docker system events` command gives you a live stream of everything happening in your Docker environment. This is invaluable for debugging, monitoring, and building automated responses to container lifecycle changes.

## Getting Started with docker events

The simplest way to see events is to start the stream and then interact with Docker in another terminal.

```bash
# Start watching events (this blocks and streams output)
docker system events

# Shorter alias
docker events
```

Open a second terminal and create a container:

```bash
# In terminal 2 - trigger some events
docker run --rm --name test-container alpine echo "hello"
```

Back in terminal 1, you will see events like:

```
2024-01-15T10:30:00.123456Z container create abc123 (image=alpine, name=test-container)
2024-01-15T10:30:00.234567Z container attach abc123 (image=alpine, name=test-container)
2024-01-15T10:30:00.345678Z network connect def456 (container=abc123, name=bridge, type=bridge)
2024-01-15T10:30:00.456789Z container start abc123 (image=alpine, name=test-container)
2024-01-15T10:30:00.567890Z container die abc123 (exitCode=0, image=alpine, name=test-container)
2024-01-15T10:30:00.678901Z network disconnect def456 (container=abc123, name=bridge, type=bridge)
2024-01-15T10:30:00.789012Z container destroy abc123 (image=alpine, name=test-container)
```

Each event includes a timestamp, the resource type, the action, the resource ID, and relevant attributes.

## Event Types

Docker generates events for several resource types.

### Container Events

These are the most common events you will monitor.

- `create` - Container created
- `start` - Container started
- `stop` - Container stopped (graceful)
- `kill` - Container received a signal
- `die` - Container exited
- `restart` - Container restarted
- `pause` / `unpause` - Container paused or unpaused
- `attach` / `detach` - Attached to or detached from container
- `exec_create` / `exec_start` / `exec_die` - Exec sessions
- `oom` - Container hit memory limit (out of memory)
- `health_status` - Health check result changed
- `destroy` - Container removed

### Image Events

- `pull` - Image pulled from registry
- `push` - Image pushed to registry
- `tag` - Image tagged
- `untag` - Image untagged
- `delete` - Image deleted
- `import` - Image imported
- `build` - Image build step

### Volume Events

- `create` - Volume created
- `destroy` - Volume removed
- `mount` / `unmount` - Volume attached to or detached from container

### Network Events

- `create` / `destroy` - Network created or removed
- `connect` / `disconnect` - Container connected to or disconnected from network

## Filtering Events

The real power of `docker events` comes from filtering. Without filters, the stream can be overwhelming in busy environments.

### Filter by Resource Type

```bash
# Only show container events
docker events --filter type=container

# Only show image events
docker events --filter type=image

# Only show volume events
docker events --filter type=volume

# Only show network events
docker events --filter type=network
```

### Filter by Event Action

```bash
# Only show container start and stop events
docker events --filter event=start --filter event=stop --filter event=die

# Only show OOM (out of memory) events
docker events --filter event=oom

# Only show health status changes
docker events --filter event=health_status
```

### Filter by Container

```bash
# Events for a specific container by name
docker events --filter container=my-app

# Events for a specific container by ID
docker events --filter container=abc123def456

# Events for containers using a specific image
docker events --filter image=nginx:alpine
```

### Filter by Label

```bash
# Events for containers with a specific label
docker events --filter label=environment=production

# Events for containers with a specific service label (Docker Compose)
docker events --filter label=com.docker.compose.service=api
```

### Combining Filters

Filters of the same type are OR'd together. Filters of different types are AND'd.

```bash
# Show start OR stop events for the "api" container
docker events --filter container=api --filter event=start --filter event=stop

# Show die events for containers with the production label
docker events --filter event=die --filter label=environment=production
```

## Historical Events

By default, `docker events` shows only new events from the moment you start watching. You can also retrieve historical events with the `--since` and `--until` flags.

```bash
# Show events from the last hour
docker events --since "1h"

# Show events from a specific time
docker events --since "2024-01-15T10:00:00"

# Show events from a time range (does not block)
docker events --since "1h" --until "30m"

# Show events since a specific timestamp
docker events --since 1705312800
```

## Formatting Output

The `--format` flag lets you customize the output using Go templates.

```bash
# JSON output for parsing
docker events --format '{{json .}}'

# Custom format with selected fields
docker events --format 'Type={{.Type}} Action={{.Action}} Actor={{.Actor.ID}}'

# Compact format for monitoring dashboards
docker events --format '{{.Time}} {{.Type}}/{{.Action}} {{.Actor.Attributes.name}}'

# Only container name and event for clean output
docker events --filter type=container \
  --format '{{.Actor.Attributes.name}}: {{.Action}}'
```

JSON output is particularly useful for piping to other tools.

```bash
# Stream JSON events to jq for filtering
docker events --format '{{json .}}' | jq 'select(.Action == "die")'

# Extract specific fields from events
docker events --format '{{json .}}' | jq '{time: .time, action: .Action, name: .Actor.Attributes.name}'
```

## Practical Monitoring Scenarios

### Detecting Container Crashes

Watch for containers that die with non-zero exit codes.

```bash
# Monitor for container failures
docker events --filter event=die --format '{{json .}}' | \
  jq -r 'select(.Actor.Attributes.exitCode != "0") |
    "\(.time) CRASH: \(.Actor.Attributes.name) exited with code \(.Actor.Attributes.exitCode)"'
```

### Detecting OOM Kills

Out-of-memory events indicate containers need more memory or have a memory leak.

```bash
# Watch for OOM events
docker events --filter event=oom --format 'OOM: {{.Actor.Attributes.name}} at {{.Time}}'
```

### Monitoring Health Status Changes

Track when containers become healthy or unhealthy.

```bash
# Watch health status events
docker events --filter event=health_status \
  --format '{{.Time}} {{.Actor.Attributes.name}}: {{.Actor.Attributes.health_status}}'
```

### Tracking Image Pulls

Monitor who is pulling what images, useful for security auditing.

```bash
# Watch for image pulls
docker events --filter type=image --filter event=pull \
  --format '{{.Time}} PULL: {{.Actor.ID}}'
```

## Automated Responses to Events

You can build scripts that react to Docker events in real time.

### Auto-Restart on Crash

```bash
#!/bin/bash
# auto-restart.sh - Restart containers that crash with specific exit codes

docker events --filter event=die --format '{{json .}}' | while read event; do
  NAME=$(echo "$event" | jq -r '.Actor.Attributes.name')
  EXIT_CODE=$(echo "$event" | jq -r '.Actor.Attributes.exitCode')

  # Only restart on specific exit codes (not clean shutdown)
  if [ "$EXIT_CODE" != "0" ] && [ "$EXIT_CODE" != "143" ]; then
    echo "$(date) Container $NAME died with exit code $EXIT_CODE - restarting"
    docker start "$NAME" 2>/dev/null || echo "Could not restart $NAME"
  fi
done
```

### Send Alerts on Critical Events

```bash
#!/bin/bash
# event-alerter.sh - Send webhook alerts for critical events

WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

docker events --filter event=die --filter event=oom --format '{{json .}}' | while read event; do
  ACTION=$(echo "$event" | jq -r '.Action')
  NAME=$(echo "$event" | jq -r '.Actor.Attributes.name')

  MESSAGE="Docker Alert: Container '$NAME' event: $ACTION"

  curl -s -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"$MESSAGE\"}" > /dev/null
done
```

### Log Events to File

```bash
#!/bin/bash
# event-logger.sh - Log all Docker events to a file with rotation

LOG_FILE="/var/log/docker-events.log"
MAX_SIZE=104857600  # 100MB

docker events --format '{{json .}}' | while read event; do
  echo "$event" >> "$LOG_FILE"

  # Simple log rotation
  FILE_SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat --format=%s "$LOG_FILE" 2>/dev/null)
  if [ "$FILE_SIZE" -gt "$MAX_SIZE" ]; then
    mv "$LOG_FILE" "${LOG_FILE}.old"
    touch "$LOG_FILE"
  fi
done
```

## Integration with Monitoring Tools

### Prometheus Integration

Use events to generate metrics for Prometheus.

```bash
# Count events by type and pipe to a metrics endpoint
docker events --format '{{json .}}' | while read event; do
  TYPE=$(echo "$event" | jq -r '.Type')
  ACTION=$(echo "$event" | jq -r '.Action')
  echo "docker_event_total{type=\"$TYPE\",action=\"$ACTION\"} 1" >> /tmp/docker_metrics.prom
done
```

### Docker Compose Stack Monitoring

Monitor all services in a Compose project.

```bash
# Watch events for a specific Docker Compose project
docker events --filter label=com.docker.compose.project=myproject \
  --format '{{.Time}} [{{.Actor.Attributes.name}}] {{.Action}}'
```

## Performance Considerations

The event stream is lightweight. Docker maintains the events in memory and streaming them adds minimal overhead. However, event-processing scripts that perform heavy work (like sending HTTP requests) for every event can create bottlenecks.

```bash
# For high-volume environments, batch events before processing
docker events --format '{{json .}}' | while read event; do
  echo "$event" >> /tmp/event-buffer.jsonl

  # Process buffer every 100 events
  LINES=$(wc -l < /tmp/event-buffer.jsonl)
  if [ "$LINES" -ge 100 ]; then
    process_batch /tmp/event-buffer.jsonl
    > /tmp/event-buffer.jsonl
  fi
done
```

Docker events give you complete visibility into your container environment. Whether you are debugging a crash, building an automated response system, or feeding data into a monitoring pipeline, the event stream provides the real-time data you need. Start with simple filtering, build up to automated responses, and integrate with your existing monitoring stack for full observability.
