# How to Run PagerDuty Integration with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, PagerDuty, Incident Management, Alerting, Monitoring, DevOps, On-Call

Description: Set up PagerDuty integrations with Docker-based monitoring tools using webhooks, the PagerDuty Agent, and custom event routing.

---

PagerDuty is one of the most popular incident management platforms. It receives alerts from your monitoring tools, routes them to the right on-call engineer, and manages the entire incident lifecycle from detection to resolution. While PagerDuty itself is a SaaS product, the integration points between your Docker-based infrastructure and PagerDuty all run locally.

This guide covers three approaches to integrating Docker workloads with PagerDuty: using the PagerDuty Agent container, connecting Prometheus Alertmanager to PagerDuty, and building a custom webhook relay for Docker events.

## Prerequisites

You need a PagerDuty account (a free trial works) and at least one service configured in PagerDuty with an integration key. You also need Docker and Docker Compose installed.

```bash
# Store your PagerDuty integration key
export PD_INTEGRATION_KEY="your-pagerduty-integration-key"

docker --version
docker compose version
```

## Approach 1: PagerDuty Agent in Docker

The PagerDuty Agent (pdagent) runs as a local daemon that queues and sends events to PagerDuty. It handles retries and buffering when the network is unreliable.

```bash
# Run the PagerDuty Agent container
docker run -d \
  --name pdagent \
  --restart unless-stopped \
  -v pdagent-data:/var/lib/pdagent \
  -p 8090:8090 \
  pagerduty/pdagent:latest
```

Send events to the agent using its CLI or the local HTTP endpoint.

```bash
# Trigger an incident via the PagerDuty Agent
docker exec pdagent pd-send \
  -k ${PD_INTEGRATION_KEY} \
  -t trigger \
  -d "High CPU usage on web-server-01" \
  -i "cpu-high-web01" \
  -f "severity=critical" \
  -f "source=docker-monitoring"
```

## Approach 2: Prometheus Alertmanager with PagerDuty

The most common Docker-based integration routes alerts from Prometheus through Alertmanager to PagerDuty. Here is a complete Docker Compose setup.

```yaml
# docker-compose.yml - Prometheus + Alertmanager + PagerDuty integration
version: "3.8"

services:
  # Prometheus for metrics collection
  prometheus:
    image: prom/prometheus:v2.51.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert-rules.yml:/etc/prometheus/alert-rules.yml
    ports:
      - "9090:9090"
    networks:
      - monitoring

  # Alertmanager routes alerts to PagerDuty
  alertmanager:
    image: prom/alertmanager:v0.27.0
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
    networks:
      - monitoring

  # Node exporter for host metrics
  node-exporter:
    image: prom/node-exporter:v1.7.0
    networks:
      - monitoring

  # cAdvisor for container metrics
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.49.1
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
```

Create the Prometheus configuration.

```yaml
# prometheus.yml - Prometheus with alerting rules
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Point Prometheus at Alertmanager
alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

# Load alerting rules
rule_files:
  - "alert-rules.yml"

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]
```

Define alerting rules that will trigger PagerDuty incidents.

```yaml
# alert-rules.yml - Prometheus alerting rules
groups:
  - name: infrastructure
    rules:
      # Alert when CPU usage exceeds 80% for 5 minutes
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High CPU usage detected on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | printf \"%.1f\" }}% on {{ $labels.instance }}"

      # Alert when memory usage exceeds 90%
      - alert: HighMemoryUsage
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | printf \"%.1f\" }}%"

      # Alert when a Docker container is using too much memory
      - alert: ContainerHighMemory
        expr: container_memory_usage_bytes{name!=""} / container_spec_memory_limit_bytes{name!=""} > 0.9
        for: 2m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Container {{ $labels.name }} memory usage is high"
          description: "Container is using {{ $value | printf \"%.0f\" }}% of its memory limit"

      # Alert when a container is restarting repeatedly
      - alert: ContainerRestarting
        expr: increase(container_restart_count{name!=""}[1h]) > 3
        for: 0m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Container {{ $labels.name }} is restarting frequently"
```

Configure Alertmanager to route alerts to PagerDuty based on severity.

```yaml
# alertmanager.yml - Route alerts to PagerDuty
global:
  resolve_timeout: 5m
  pagerduty_url: "https://events.pagerduty.com/v2/enqueue"

route:
  # Default receiver
  receiver: "pagerduty-platform"
  group_by: ["alertname", "severity"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  # Route critical alerts to a different PagerDuty service
  routes:
    - match:
        severity: critical
      receiver: "pagerduty-critical"
      continue: false

    - match:
        severity: warning
      receiver: "pagerduty-platform"

receivers:
  # Critical alerts go to the high-priority PagerDuty service
  - name: "pagerduty-critical"
    pagerduty_configs:
      - routing_key: "${PD_INTEGRATION_KEY}"
        severity: critical
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          instances: '{{ range .Alerts }}{{ .Labels.instance }} {{ end }}'

  # Warning alerts go to a lower-priority service
  - name: "pagerduty-platform"
    pagerduty_configs:
      - routing_key: "${PD_INTEGRATION_KEY}"
        severity: warning
        description: '{{ .CommonAnnotations.summary }}'
```

## Approach 3: Custom Docker Event Webhook

Build a lightweight container that monitors Docker events and sends PagerDuty alerts when containers crash or become unhealthy.

```python
# docker_event_monitor.py - Watch Docker events and alert PagerDuty
import docker
import requests
import json
import os
import time

PD_ROUTING_KEY = os.environ.get("PD_INTEGRATION_KEY")
EVENTS_API = "https://events.pagerduty.com/v2/enqueue"

client = docker.DockerClient(base_url="unix:///var/run/docker.sock")

def send_pagerduty_event(action, severity, summary, details):
    """Send an event to PagerDuty Events API v2"""
    payload = {
        "routing_key": PD_ROUTING_KEY,
        "event_action": action,
        "dedup_key": details.get("container_id", "unknown"),
        "payload": {
            "summary": summary,
            "severity": severity,
            "source": "docker-event-monitor",
            "component": details.get("container_name", "unknown"),
            "custom_details": details
        }
    }
    try:
        resp = requests.post(EVENTS_API, json=payload, timeout=10)
        print(f"PagerDuty response: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Failed to send PagerDuty event: {e}")

def monitor_events():
    """Watch Docker events and trigger PagerDuty alerts"""
    print("Starting Docker event monitor...")

    for event in client.events(decode=True):
        event_type = event.get("Type", "")
        action = event.get("Action", "")
        actor = event.get("Actor", {})
        attributes = actor.get("Attributes", {})
        container_name = attributes.get("name", "unknown")

        # Alert on container death (crash)
        if event_type == "container" and action == "die":
            exit_code = attributes.get("exitCode", "unknown")
            if exit_code != "0":
                send_pagerduty_event(
                    action="trigger",
                    severity="critical",
                    summary=f"Container {container_name} died with exit code {exit_code}",
                    details={
                        "container_name": container_name,
                        "container_id": actor.get("ID", "")[:12],
                        "exit_code": exit_code,
                        "image": attributes.get("image", "unknown")
                    }
                )

        # Alert on health check failures
        if event_type == "container" and action == "health_status: unhealthy":
            send_pagerduty_event(
                action="trigger",
                severity="warning",
                summary=f"Container {container_name} is unhealthy",
                details={
                    "container_name": container_name,
                    "container_id": actor.get("ID", "")[:12],
                    "status": "unhealthy"
                }
            )

if __name__ == "__main__":
    monitor_events()
```

```dockerfile
# Dockerfile for the event monitor
FROM python:3.12-slim

WORKDIR /app
RUN pip install docker requests
COPY docker_event_monitor.py .

CMD ["python", "-u", "docker_event_monitor.py"]
```

Add the monitor to your Compose file.

```yaml
  docker-event-monitor:
    build: ./event-monitor
    environment:
      - PD_INTEGRATION_KEY=${PD_INTEGRATION_KEY}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped
    networks:
      - monitoring
```

## Testing the Integration

Start the stack and verify alerts reach PagerDuty.

```bash
# Start everything
docker compose up -d

# Trigger a test alert through Alertmanager
curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {"alertname": "TestAlert", "severity": "critical"},
    "annotations": {"summary": "Test alert from Docker integration guide"},
    "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }]'
```

Check PagerDuty's web interface or mobile app for the incoming alert.

## Cleanup

```bash
docker compose down -v
```

## Conclusion

PagerDuty integrations with Docker run smoothly through Alertmanager for Prometheus-based alerts, the PagerDuty Agent for direct event submission, or custom Docker event monitors for container lifecycle events. Choose the approach that matches your existing monitoring stack. For teams seeking an open-source alternative that includes built-in on-call scheduling and incident management alongside monitoring, [OneUptime](https://oneuptime.com) provides these capabilities without vendor lock-in.
