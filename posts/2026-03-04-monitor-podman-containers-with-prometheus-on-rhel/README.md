# How to Monitor Podman Containers with Prometheus on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Prometheus, Container Monitoring, cAdvisor, Metrics

Description: Monitor Podman container resource usage on RHEL by exposing container metrics to Prometheus using cAdvisor or the Podman API and Prometheus exporters.

---

Podman is the default container runtime on RHEL, but it does not expose metrics in Prometheus format out of the box. You need a metrics exporter to bridge the gap. This guide covers two approaches: using cAdvisor and using a Podman-specific exporter.

## Method 1: Use cAdvisor with Podman

cAdvisor (Container Advisor) collects container metrics and exposes them for Prometheus.

```bash
# Run cAdvisor as a Podman container
# It reads cgroup data from the host to monitor all containers
sudo podman run -d \
    --name cadvisor \
    --privileged \
    -p 8080:8080 \
    -v /:/rootfs:ro \
    -v /var/run:/var/run:ro \
    -v /sys:/sys:ro \
    -v /var/lib/containers:/var/lib/containers:ro \
    -v /dev/disk/:/dev/disk:ro \
    gcr.io/cadvisor/cadvisor:latest

# Verify cAdvisor is running
curl -s http://localhost:8080/metrics | head -20
```

## Configure Prometheus to Scrape cAdvisor

```yaml
# Add to /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['localhost:8080']
```

```bash
sudo systemctl reload prometheus
```

## Method 2: Use Podman's Built-in Metrics API

Podman 4.x+ supports the Docker-compatible API, which you can query for stats.

```bash
# Enable the Podman socket for rootful containers
sudo systemctl enable --now podman.socket

# Verify the socket
sudo curl --unix-socket /run/podman/podman.sock http://d/v4.0.0/containers/json

# For rootless containers
systemctl --user enable --now podman.socket
```

## Use a Podman Exporter

```bash
# Run a Prometheus exporter for the Podman API
# Build or download a podman-exporter
# Example using the container-exporter approach:

sudo tee /usr/local/bin/podman-metrics.sh << 'SCRIPT'
#!/bin/bash
# Simple script to generate Prometheus metrics from podman stats

OUTPUT_FILE="/var/lib/node_exporter/textfile_collector/podman.prom"

# Clear the file
> "$OUTPUT_FILE"

# Get container stats in JSON format
sudo podman stats --no-stream --format json | python3 -c "
import json, sys

data = json.load(sys.stdin)
for c in data:
    name = c['Name'].replace('-', '_')
    # CPU percentage
    cpu = c.get('CPUPerc', '0%').rstrip('%')
    print(f'podman_container_cpu_percent{{name=\"{c[\"Name\"]}\"}} {cpu}')
    # Memory usage
    mem = c.get('MemUsage', '0B / 0B').split('/')[0].strip()
    print(f'podman_container_mem_usage_info{{name=\"{c[\"Name\"]}\"}} 1')
    # PIDs
    pids = c.get('PIDs', '0')
    print(f'podman_container_pids{{name=\"{c[\"Name\"]}\"}} {pids}')
" >> "$OUTPUT_FILE"
SCRIPT

sudo chmod +x /usr/local/bin/podman-metrics.sh

# Run it every 30 seconds via a systemd timer
sudo tee /etc/systemd/system/podman-metrics.service << 'EOF'
[Unit]
Description=Export Podman metrics to Prometheus

[Service]
Type=oneshot
ExecStart=/usr/local/bin/podman-metrics.sh
EOF

sudo tee /etc/systemd/system/podman-metrics.timer << 'EOF'
[Unit]
Description=Run Podman metrics exporter

[Timer]
OnUnitActiveSec=30s
OnBootSec=10s

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now podman-metrics.timer
```

## Useful PromQL Queries for Container Monitoring

```promql
# Total CPU usage across all containers (with cAdvisor)
sum(rate(container_cpu_usage_seconds_total{image!=""}[5m])) by (name)

# Memory usage per container
container_memory_usage_bytes{image!=""}

# Network receive bytes per container
rate(container_network_receive_bytes_total{image!=""}[5m])

# Number of running containers
count(container_last_seen{image!=""})
```

## Create a Grafana Dashboard

Import Grafana dashboard ID `14282` (cAdvisor dashboard) or build a custom one using the queries above. The cAdvisor approach provides the most comprehensive container metrics, while the textfile approach is lighter weight and does not require running another container.
