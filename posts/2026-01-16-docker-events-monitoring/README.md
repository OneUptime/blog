# How to Monitor Docker Events in Real Time

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Events, Monitoring, Observability, DevOps

Description: Learn how to monitor Docker events in real time for container lifecycle tracking, debugging, and automated responses.

---

Docker events provide real-time information about container lifecycle, image operations, and daemon activities. This guide covers monitoring Docker events for debugging, automation, and observability.

## Basic Event Monitoring

```bash
# Watch all events
docker events

# Filter by container
docker events --filter container=myapp

# Filter by event type
docker events --filter event=start
docker events --filter event=die

# Filter by image
docker events --filter image=nginx

# Multiple filters
docker events --filter event=start --filter event=stop

# Time range
docker events --since "2024-01-01" --until "2024-01-02"
```

## Event Types

### Container Events
- `create`, `destroy`
- `start`, `stop`, `restart`, `kill`
- `pause`, `unpause`
- `die`, `oom`
- `attach`, `detach`
- `exec_create`, `exec_start`, `exec_die`
- `health_status`

### Image Events
- `pull`, `push`
- `tag`, `untag`
- `delete`

### Network Events
- `create`, `destroy`
- `connect`, `disconnect`

### Volume Events
- `create`, `destroy`
- `mount`, `unmount`

## JSON Output

```bash
# JSON format
docker events --format '{{json .}}'

# Custom format
docker events --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}}'
```

## Programmatic Monitoring

### Python Script

```python
#!/usr/bin/env python3
import docker
import json

client = docker.from_env()

for event in client.events(decode=True):
    print(f"{event['time']}: {event['Action']} - {event.get('Actor', {}).get('Attributes', {}).get('name', 'N/A')}")
```

### Shell Script for Alerts

```bash
#!/bin/bash
# monitor-events.sh

docker events --filter event=die --format '{{json .}}' | while read event; do
    container=$(echo $event | jq -r '.Actor.Attributes.name')
    exitcode=$(echo $event | jq -r '.Actor.Attributes.exitCode')

    if [ "$exitcode" != "0" ]; then
        echo "Container $container died with exit code $exitcode"
        # Send alert
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Container $container died with exit code $exitcode\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
done
```

## Docker Compose for Event Processing

```yaml
version: '3.8'

services:
  event-monitor:
    image: alpine
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: >
      sh -c "apk add docker curl jq &&
             docker events --filter event=die --format '{{json .}}' |
             while read event; do
               echo $$event | jq .
             done"
```

## Complete Monitoring Setup

```yaml
version: '3.8'

services:
  event-exporter:
    image: ghcr.io/prometheus-community/docker-event-exporter:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "9153:9153"

  prometheus:
    image: prom/prometheus:v2.47.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'docker-events'
    static_configs:
      - targets: ['event-exporter:9153']
```

## Summary

| Event | Trigger |
|-------|---------|
| start | Container started |
| stop | Container stopped |
| die | Container exited |
| kill | Container received signal |
| oom | Out of memory |
| health_status | Health check result |

Docker events provide valuable insights into container operations. Use them for debugging, triggering automated responses, and feeding monitoring systems. For comprehensive monitoring, integrate with Prometheus as described in our post on [Docker Prometheus and Grafana](https://oneuptime.com/blog/post/2026-01-16-docker-prometheus-grafana/view).

