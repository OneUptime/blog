# How to Integrate Podman Events with Monitoring Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Event, Prometheus, Grafana, Observability

Description: Learn how to integrate Podman events with external monitoring systems like Prometheus, Grafana, and log aggregators for centralized observability.

---

> Integrating Podman events with your monitoring stack turns isolated container data into actionable operational intelligence.

Running Podman in production requires integration with your existing monitoring and observability tools. Podman events can be piped to log aggregators, converted into metrics for Prometheus, forwarded to syslog servers, and visualized in dashboards. This guide shows you how to connect Podman events to the most common monitoring systems.

---

## Architecture Overview

The integration pattern follows a simple pipeline: Podman generates events, a collector processes them, and a monitoring system stores and visualizes them.

```bash
# The general pattern:

# podman events --format json | collector | monitoring_system

# Verify Podman events are working
podman events --since 1m --format json | head -5
```

## Exposing Events as Prometheus Metrics

Create a simple exporter that converts Podman events into Prometheus metrics.

```bash
#!/bin/bash
# podman-event-exporter.sh - Export Podman events as Prometheus metrics

METRICS_FILE="/tmp/podman_metrics.prom"
PORT=9191

# Initialize counters
declare -A event_counts

# Function to update metrics file
update_metrics() {
    {
        echo "# HELP podman_events_total Total number of Podman events by status"
        echo "# TYPE podman_events_total counter"
        for status in "${!event_counts[@]}"; do
            echo "podman_events_total{status=\"${status}\"} ${event_counts[$status]}"
        done

        echo "# HELP podman_events_last_timestamp Timestamp of the last event"
        echo "# TYPE podman_events_last_timestamp gauge"
        echo "podman_events_last_timestamp $(date +%s)"
    } > "$METRICS_FILE"
}

# Initialize metrics file
update_metrics

# Start a simple HTTP server to serve metrics
while true; do
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n$(cat $METRICS_FILE)" | \
        nc -l -p "$PORT" -q 1 > /dev/null 2>&1
done &
HTTP_PID=$!

echo "Metrics server running on port ${PORT}"

# Process events and update counters
podman events --format json | while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    event_counts[$status]=$(( ${event_counts[$status]:-0} + 1 ))
    update_metrics
    echo "Event: ${status} (total: ${event_counts[$status]})"
done
```

## Forwarding Events to Syslog

Send Podman events to a syslog server for centralized logging.

```bash
#!/bin/bash
# syslog-forwarder.sh - Forward Podman events to syslog

SYSLOG_TAG="podman-events"
FACILITY="local0"

echo "Forwarding Podman events to syslog..."

podman events --format json | while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    event_type=$(echo "$event" | jq -r '.Type')

    # Send to syslog using logger command
    logger -t "$SYSLOG_TAG" -p "${FACILITY}.info" \
        "type=${event_type} status=${status} container=${name}"
done
```

## Sending Events to a Webhook

Forward events to a webhook endpoint for integration with services like Slack or PagerDuty.

```bash
#!/bin/bash
# webhook-forwarder.sh - Forward container exit events to a webhook
# Usage: ./webhook-forwarder.sh <webhook-url>

WEBHOOK_URL="${1:?Usage: $0 <webhook-url>}"

echo "Forwarding container exit events to webhook..."

podman events --filter event=died --format json | \
while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    timestamp=$(echo "$event" | jq -r '.Time')

    # Build webhook payload
    payload=$(jq -n \
        --arg status "$status" \
        --arg name "$name" \
        --arg time "$timestamp" \
        '{
            text: "Podman Alert: Container \($name) - \($status) at \($time)",
            container: $name,
            event: $status,
            timestamp: $time
        }')

    # Send to webhook
    curl -s -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$payload"

    echo "Alert sent for: ${name} (${status})"
done
```

## Piping Events to a Log Aggregator

Forward events to common log aggregation endpoints.

```bash
# Forward to a TCP log collector (Logstash, Fluentd, etc.)
podman events --format json | while IFS= read -r event; do
    echo "$event" | nc -q 0 logstash.example.com 5044
done

# Forward to a file that Filebeat or Promtail can collect
podman events --format json >> /var/log/podman/events.jsonl

# Forward using ncat for persistent connections
podman events --format json | ncat --send-only logstash.example.com 5044
```

## Integration with Grafana via Loki

Send Podman events to Grafana Loki for log-based monitoring.

```bash
#!/bin/bash
# loki-forwarder.sh - Forward Podman events to Grafana Loki

LOKI_URL="${1:-http://localhost:3100}"

echo "Forwarding events to Loki at ${LOKI_URL}..."

podman events --format json | while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    timestamp_ns=$(date +%s%N)

    # Build Loki push payload
    payload=$(jq -n \
        --arg ts "$timestamp_ns" \
        --arg line "$event" \
        --arg status "$status" \
        --arg name "$name" \
        '{
            streams: [{
                stream: {
                    job: "podman-events",
                    status: $status,
                    container: $name
                },
                values: [[$ts, $line]]
            }]
        }')

    # Push to Loki
    curl -s -X POST "${LOKI_URL}/loki/api/v1/push" \
        -H "Content-Type: application/json" \
        -d "$payload" > /dev/null

    echo "Sent to Loki: ${name} (${status})"
done
```

## Running the Forwarder as a Systemd Service

Make the event forwarder persistent and auto-starting.

```bash
# Create a systemd user service
mkdir -p ~/.config/systemd/user/

cat > ~/.config/systemd/user/podman-event-forwarder.service << 'EOF'
[Unit]
Description=Podman Event Forwarder
After=default.target

[Service]
Type=simple
ExecStart=/usr/local/bin/podman-event-forwarder.sh
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF

# Enable and start the service
systemctl --user daemon-reload
systemctl --user enable podman-event-forwarder.service
systemctl --user start podman-event-forwarder.service

# Check the service status
systemctl --user status podman-event-forwarder.service
```

## Cleanup

```bash
# Stop any background processes
kill $HTTP_PID 2>/dev/null
rm -f /tmp/podman_metrics.prom
```

## Summary

Integrating Podman events with monitoring systems transforms raw container events into centralized, queryable, and actionable data. Whether you are exporting metrics to Prometheus, forwarding logs to Loki or a syslog server, sending alerts via webhooks, or piping events to log aggregators, the JSON event stream from Podman provides a flexible foundation. With a systemd service to ensure reliability, your event integration pipeline can run continuously alongside your container workloads.
