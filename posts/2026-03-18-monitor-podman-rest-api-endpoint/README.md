# How to Monitor the Podman REST API Endpoint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Monitoring, Uptime, DevOps

Description: Learn how to monitor the health and availability of your Podman REST API endpoint, set up automated health checks, track response times, and integrate with monitoring platforms.

---

> Monitoring your Podman REST API endpoint is essential when your container infrastructure depends on API availability. A down or degraded API means your automation, dashboards, and deployment pipelines cannot manage containers, leading to operational blindness and potential downtime.

When you rely on the Podman REST API for container management, the API itself becomes a critical piece of infrastructure. If the API goes down, your monitoring tools cannot check container health, your deployment scripts cannot roll out updates, and your alerting systems cannot detect container failures. Monitoring the API endpoint ensures you know immediately when there is a problem.

This guide covers how to set up health checks for the Podman REST API, track performance metrics, and integrate with monitoring platforms.

---

## Basic Health Checks

The simplest way to check if the Podman API is healthy is to ping it:

### Using the Ping Endpoint

```bash
# Simple health check

curl -s --unix-socket /run/podman/podman.sock \
  http://localhost/libpod/_ping

# Expected response: OK
```

The `_ping` endpoint returns a simple "OK" string when the API is healthy. It is lightweight and does not perform any heavy operations.

### Checking with HTTP Status Code

```bash
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --unix-socket /run/podman/podman.sock \
  http://localhost/libpod/_ping)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "Podman API is healthy"
else
  echo "Podman API is unhealthy (HTTP $HTTP_CODE)"
fi
```

### Checking Response Time

```bash
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" \
  --unix-socket /run/podman/podman.sock \
  http://localhost/libpod/_ping)

echo "Response time: ${RESPONSE_TIME}s"

# Alert if response time exceeds threshold
if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
  echo "WARNING: API response time is slow"
fi
```

## Comprehensive Health Check Script

Build a script that checks multiple aspects of API health:

```bash
#!/bin/bash

SOCKET="/run/podman/podman.sock"
API="http://localhost/v4.0.0/libpod"
PING_API="http://localhost/libpod"
ALERT_EMAIL="ops@example.com"
LOG_FILE="/var/log/podman-health.log"

log() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $1" | tee -a "$LOG_FILE"
}

check_api_ping() {
  local result
  result=$(curl -s --max-time 5 --unix-socket "$SOCKET" "$PING_API/_ping" 2>&1)
  if [ "$result" = "OK" ]; then
    return 0
  fi
  return 1
}

check_api_response_time() {
  local time_total
  time_total=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 \
    --unix-socket "$SOCKET" "$API/info" 2>/dev/null)
  echo "$time_total"
}

check_container_count() {
  local count
  count=$(curl -s --max-time 5 --unix-socket "$SOCKET" \
    "$API/containers/json" 2>/dev/null | jq '. | length' 2>/dev/null)
  echo "${count:-0}"
}

check_disk_usage() {
  local usage
  usage=$(curl -s --max-time 10 --unix-socket "$SOCKET" \
    "$API/system/df" 2>/dev/null | jq '.Images | map(.Size) | add // 0' 2>/dev/null)
  echo "${usage:-0}"
}

# Run checks
log "=== Health Check Start ==="

if check_api_ping; then
  log "PASS: API ping successful"
else
  log "FAIL: API ping failed"
  echo "Podman API is down" | mail -s "ALERT: Podman API Down" "$ALERT_EMAIL" 2>/dev/null
  exit 1
fi

RESPONSE_TIME=$(check_api_response_time)
log "INFO: API response time: ${RESPONSE_TIME}s"

if (( $(echo "$RESPONSE_TIME > 5.0" | bc -l) )); then
  log "WARN: API response time exceeds 5 seconds"
fi

CONTAINER_COUNT=$(check_container_count)
log "INFO: Running containers: $CONTAINER_COUNT"

DISK_USAGE=$(check_disk_usage)
DISK_MB=$((DISK_USAGE / 1048576))
log "INFO: Image disk usage: ${DISK_MB}MB"

log "=== Health Check Complete ==="
```

## Monitoring with a Systemd Timer

Set up periodic health checks using systemd:

```ini
# /etc/systemd/system/podman-health-check.service
[Unit]
Description=Podman API Health Check

[Service]
Type=oneshot
ExecStart=/usr/local/bin/podman-health-check.sh
```

```ini
# /etc/systemd/system/podman-health-check.timer
[Unit]
Description=Run Podman API Health Check every minute

[Timer]
OnCalendar=*:*:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now podman-health-check.timer
```

## Monitoring with Prometheus

Export Podman API metrics for Prometheus scraping:

```python
#!/usr/bin/env python3
"""Podman API metrics exporter for Prometheus."""

import time
import requests_unixsocket
from urllib.parse import quote
from http.server import HTTPServer, BaseHTTPRequestHandler

SOCKET_PATH = "/run/podman/podman.sock"
ENCODED_SOCKET = quote(SOCKET_PATH, safe="")
BASE_URL = f"http+unix://{ENCODED_SOCKET}/v4.0.0/libpod"
PING_URL = f"http+unix://{ENCODED_SOCKET}/libpod"
METRICS_PORT = 9191


def collect_metrics():
    session = requests_unixsocket.Session()
    metrics = []

    # API health
    try:
        start = time.time()
        resp = session.get(f"{PING_URL}/_ping", timeout=5)
        duration = time.time() - start
        api_up = 1 if resp.text == "OK" else 0
        metrics.append(f"podman_api_up {api_up}")
        metrics.append(f"podman_api_response_seconds {duration:.4f}")
    except Exception:
        metrics.append("podman_api_up 0")
        return "\n".join(metrics)

    # Container counts
    try:
        running = session.get(f"{BASE_URL}/containers/json", timeout=5).json()
        all_containers = session.get(
            f"{BASE_URL}/containers/json", params={"all": True}, timeout=5
        ).json()

        metrics.append(f"podman_containers_running {len(running)}")
        metrics.append(f"podman_containers_total {len(all_containers)}")

        stopped = len(all_containers) - len(running)
        metrics.append(f"podman_containers_stopped {stopped}")
    except Exception:
        pass

    # Image count and size
    try:
        images = session.get(f"{BASE_URL}/images/json", timeout=5).json()
        total_size = sum(img.get("Size", 0) for img in images)
        metrics.append(f"podman_images_total {len(images)}")
        metrics.append(f"podman_images_size_bytes {total_size}")
    except Exception:
        pass

    # Per-container stats
    try:
        for container in running:
            name = container["Names"][0].replace("-", "_")
            stats_resp = session.get(
                f"{BASE_URL}/containers/stats",
                params={"containers": container["Id"], "stream": False},
                timeout=10,
            )
            stats_payload = stats_resp.json()
            stats = stats_payload[0] if isinstance(stats_payload, list) else stats_payload
            metrics.append(
                f'podman_container_cpu_percent{{name="{name}"}} {stats.get("CPU", 0):.2f}'
            )
            metrics.append(
                f'podman_container_memory_bytes{{name="{name}"}} {stats.get("MemUsageBytes", 0)}'
            )
            metrics.append(
                f'podman_container_pids{{name="{name}"}} {stats.get("PIDs", 0)}'
            )
    except Exception:
        pass

    return "\n".join(metrics)


class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/metrics":
            metrics = collect_metrics()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(metrics.encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", METRICS_PORT), MetricsHandler)
    print(f"Serving metrics on port {METRICS_PORT}")
    server.serve_forever()
```

Add the scrape target to your Prometheus configuration:

```yaml
scrape_configs:
  - job_name: "podman"
    scrape_interval: 15s
    static_configs:
      - targets: ["localhost:9191"]
```

## Monitoring over TCP

When the Podman API is exposed over TCP (behind a reverse proxy), you can monitor it with standard HTTP monitoring tools:

```bash
# Health check for TCP endpoint
curl -s -o /dev/null -w "%{http_code}" \
  --cacert /etc/podman/tls/ca.pem \
  --cert /etc/podman/tls/client-cert.pem \
  --key /etc/podman/tls/client-key.pem \
  https://podman-api.example.com:8443/libpod/_ping
```

## Monitoring Events

The Podman API provides an events stream that you can monitor for important container lifecycle events:

```bash
#!/bin/bash

SOCKET="/run/podman/podman.sock"

curl -s --unix-socket "$SOCKET" --no-buffer \
  "http://localhost/v4.0.0/libpod/events" | \
  while read -r event; do
    TYPE=$(echo "$event" | jq -r '.Type // "unknown"')
    ACTION=$(echo "$event" | jq -r '.Status // "unknown"')
    NAME=$(echo "$event" | jq -r '.Name // "unknown"')
    TIME=$(echo "$event" | jq -r '.Time // "unknown"')

    case "$ACTION" in
      died|stop|kill)
        echo "ALERT: Container $NAME event: $ACTION at $(date -d "$TIME")"
        ;;
      start|create)
        echo "INFO: Container $NAME event: $ACTION at $(date -d "$TIME")"
        ;;
    esac
  done
```

## Setting Up Alerting

Combine health checks with alerting for production monitoring:

```bash
#!/bin/bash

SOCKET="/run/podman/podman.sock"
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
STATE_FILE="/tmp/podman-api-state"

send_alert() {
  local message="$1"
  curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"text\": \"$message\"}" \
    "$WEBHOOK_URL" >/dev/null 2>&1
}

CURRENT_STATE="unknown"
PREVIOUS_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "unknown")

PING_RESULT=$(curl -s --max-time 5 --unix-socket "$SOCKET" \
  "http://localhost/libpod/_ping" 2>/dev/null)

if [ "$PING_RESULT" = "OK" ]; then
  CURRENT_STATE="up"
else
  CURRENT_STATE="down"
fi

echo "$CURRENT_STATE" > "$STATE_FILE"

# Alert on state changes
if [ "$CURRENT_STATE" != "$PREVIOUS_STATE" ]; then
  if [ "$CURRENT_STATE" = "down" ]; then
    send_alert "ALERT: Podman API is DOWN on $(hostname)"
  elif [ "$CURRENT_STATE" = "up" ] && [ "$PREVIOUS_STATE" = "down" ]; then
    send_alert "RESOLVED: Podman API is back UP on $(hostname)"
  fi
fi
```

## Using OneUptime for Monitoring

For a comprehensive monitoring solution, you can use OneUptime to monitor your Podman REST API endpoint. OneUptime provides uptime monitoring, alerting, and incident management in a single platform.

Configure an API monitor in OneUptime that checks your Podman API endpoint at regular intervals. Set up alert rules to notify your team through email, Slack, or PagerDuty when the API becomes unavailable or response times exceed acceptable thresholds.

## Conclusion

Monitoring the Podman REST API endpoint is a critical practice when your container infrastructure relies on API availability. From simple ping checks to comprehensive Prometheus metrics exporters, there are multiple approaches to ensure you have visibility into your API's health. Combine health checks with alerting to detect and respond to issues before they impact your container workloads. Whether you use systemd timers for basic monitoring or a full observability platform, keeping an eye on your Podman API is essential for reliable container operations.
