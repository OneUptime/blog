# How to Monitor Podman Container Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Monitoring, Performance, DevOps, Prometheus, Grafana, Container, Observability

Description: Learn how to monitor Podman container performance using built-in tools, Prometheus metrics, and Grafana dashboards for real-time visibility into CPU, memory, network, and I/O usage.

---

> You cannot optimize what you do not measure. Effective container monitoring gives you visibility into resource consumption, performance bottlenecks, and capacity planning data before problems become outages.

Running containers without monitoring is flying blind. A single container consuming excessive memory can trigger OOM kills that cascade across your services. A CPU-bound container can starve its neighbors. Network bottlenecks can cause request timeouts that appear as application bugs. This guide covers monitoring Podman containers from basic CLI tools to production-grade observability with Prometheus and Grafana.

---

## Built-in Monitoring with podman stats

The simplest way to monitor Podman containers is the built-in `stats` command:

```bash
# Real-time stats for all running containers

podman stats

# Stats for specific containers
podman stats web-server api-server worker

# Single snapshot (no streaming)
podman stats --no-stream

# Custom format for scripting
podman stats --no-stream --format \
  "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# JSON output for programmatic processing
podman stats --no-stream --format json
```

The output includes CPU percentage, memory usage and limit, network I/O, block I/O, and PIDs. This is useful for quick checks but does not provide historical data or alerting.

---

## Monitor Container Events

Podman emits events for container lifecycle changes. Use these to track starts, stops, OOM kills, and other state changes:

```bash
# Stream all container events
podman events

# Filter for specific event types
podman events --filter event=died
podman events --filter event=start

# Filter by container name
podman events --filter container=web-server

# JSON format for log processing
podman events --format json

# Events since a specific time
podman events --since "2024-01-01T00:00:00"
```

Set up a persistent event monitor to log container lifecycle events:

```bash
#!/bin/bash
# monitor-events.sh - Log container events to file
LOG_FILE="/var/log/podman-events.log"

podman events --format json | while read -r event; do
  echo "$event" >> "$LOG_FILE"

  # Alert on OOM kills
  if echo "$event" | jq -e '.Status == "died"' > /dev/null 2>&1; then
    CONTAINER_ID=$(echo "$event" | jq -r '.ID')
    CONTAINER=$(echo "$event" | jq -r '.Name')
    if [ "$(podman container inspect "$CONTAINER_ID" --format '{{.State.OOMKilled}}' 2>/dev/null)" = "true" ]; then
      echo "ALERT: OOM kill detected for container $CONTAINER" >&2
      # Send notification (webhook, email, etc.)
    fi
  fi
done
```

---

## Container Health Checks

Define health checks in your Containerfile or at runtime to monitor application health:

```dockerfile
# Containerfile with health check
FROM nginx:alpine

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1
```

```bash
# Runtime health check
podman run -d --name web \
  --health-cmd="curl -f http://localhost:8080/health || exit 1" \
  --health-interval=15s \
  --health-timeout=5s \
  --health-retries=3 \
  --health-start-period=30s \
  your-app:latest

# Check health status
podman healthcheck run web
podman inspect web --format '{{.State.Health.Status}}'

# List all containers with health status
podman ps --format "table {{.Names}}\t{{.Status}}"
```

---

## Expose Metrics with Prometheus

For production monitoring, export Podman metrics to Prometheus. Podman exposes a REST API that monitoring tools and exporters can query:

```bash
# Enable the Podman API socket
systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/containers/json
```

Use a metrics exporter to translate Podman stats into Prometheus format. Here is a simple exporter script:

```python
#!/usr/bin/env python3
# podman_exporter.py - Export Podman metrics to Prometheus
import subprocess
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != '/metrics':
            self.send_response(404)
            self.end_headers()
            return

        metrics = self.collect_metrics()
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(metrics.encode())

    def collect_metrics(self):
        # Get container stats from Podman
        result = subprocess.run(
            ['podman', 'stats', '--no-stream', '--format', 'json'],
            capture_output=True, text=True
        )
        containers = json.loads(result.stdout)
        lines = []

        for c in containers:
            name = c.get('name', 'unknown')
            # CPU usage percentage
            cpu = c.get('cpu_percent', '0%')
            cpu = 0 if cpu == '--' else cpu.rstrip('%')
            lines.append(
                f'podman_container_cpu_percent{{name="{name}"}} {cpu}'
            )
            # Memory usage in bytes
            mem_usage = c.get('mem_usage', '0B')
            mem_bytes = self.parse_bytes(mem_usage.split('/')[0].strip())
            lines.append(
                f'podman_container_memory_bytes{{name="{name}"}} {mem_bytes}'
            )
            # Process count
            pids = c.get('pids', 0)
            pids = 0 if pids == '--' else pids
            lines.append(
                f'podman_container_pids{{name="{name}"}} {pids}'
            )

        return '\n'.join(lines) + '\n'

    def parse_bytes(self, size_str):
        """Convert human-readable size to bytes."""
        units = {'TB': 1099511627776, 'GB': 1073741824,
                 'MB': 1048576, 'KB': 1024, 'B': 1}
        size_str = size_str.strip()
        for unit, multiplier in units.items():
            if size_str.upper().endswith(unit):
                return float(size_str[:-len(unit)].strip()) * multiplier
        return 0

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 9191), MetricsHandler)
    print("Podman metrics exporter running on :9191")
    server.serve_forever()
```

Configure Prometheus to scrape the exporter:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'podman'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9191']
```

---

## Monitoring with cAdvisor

cAdvisor provides detailed container metrics and works with Podman:

```bash
# Run cAdvisor to monitor Podman containers
podman run -d \
  --name cadvisor \
  --privileged \
  -p 8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  -v /sys:/sys:ro \
  -v /var/lib/containers:/var/lib/containers:ro \
  --device /dev/kmsg \
  ghcr.io/google/cadvisor:latest

# Access the cAdvisor web UI
# http://localhost:8080/containers/
```

cAdvisor automatically exposes Prometheus-compatible metrics at `/metrics`, making it easy to integrate with your existing monitoring stack.

---

## Logging for Performance Analysis

Configure container logging for performance analysis:

```bash
# Use journald logging driver (default for Podman)
podman run -d --log-driver=journald --name web your-image

# Query logs with journalctl
journalctl CONTAINER_NAME=web --since "1 hour ago"

# Use k8s-file logging with size limits
podman run -d \
  --log-driver=k8s-file \
  --log-opt max-size=10m \
  --name web your-image

# Stream logs in real-time
podman logs -f --tail 100 web

# Extract timing information from logs
podman logs web 2>&1 | grep -E "request.*ms|latency|duration"
```

---

## Build a Monitoring Dashboard

Combine metrics collection with Grafana for visualization:

```bash
# Run Prometheus
podman run -d --name prometheus \
  -p 9090:9090 \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml:Z \
  prom/prometheus:latest

# Run Grafana
podman run -d --name grafana \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:latest
```

Create a monitoring pod to group the services:

```bash
# Create a monitoring pod
podman pod create --name monitoring -p 9090:9090 -p 3000:3000

# Run Prometheus in the pod
podman run -d --pod monitoring --name prometheus \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml:Z \
  prom/prometheus:latest

# Run Grafana in the pod
podman run -d --pod monitoring --name grafana \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:latest
```

---

## Automated Alerting Script

Create a simple alerting system based on container metrics:

```bash
#!/bin/bash
# alert-monitor.sh - Monitor containers and alert on thresholds

CPU_THRESHOLD=80
MEM_THRESHOLD=90

while true; do
  podman stats --no-stream --format json | jq -c '.[] | {
    name: .name,
    cpu: (if .cpu_percent == "--" then 0 else (.cpu_percent | rtrimstr("%") | tonumber) end),
    mem_percent: (if .mem_percent == "--" then 0 else (.mem_percent | rtrimstr("%") | tonumber) end)
  }' | while read -r stat; do
    NAME=$(echo "$stat" | jq -r '.name')
    CPU=$(echo "$stat" | jq -r '.cpu')
    MEM=$(echo "$stat" | jq -r '.mem_percent')

    if (( $(echo "$CPU > $CPU_THRESHOLD" | bc -l) )); then
      echo "[ALERT] Container $NAME CPU: ${CPU}% exceeds ${CPU_THRESHOLD}%"
    fi

    if (( $(echo "$MEM > $MEM_THRESHOLD" | bc -l) )); then
      echo "[ALERT] Container $NAME Memory: ${MEM}% exceeds ${MEM_THRESHOLD}%"
    fi
  done

  sleep 30
done
```

---

## Conclusion

Monitoring Podman containers effectively requires multiple layers: real-time visibility with `podman stats`, lifecycle tracking with events, application-level health checks, and production-grade metrics with Prometheus and Grafana. Start with the built-in tools for quick debugging, then build toward a full observability stack as your deployment grows. The key is establishing monitoring early so you have baseline data when performance issues arise. Proactive monitoring prevents small resource problems from becoming production outages.
