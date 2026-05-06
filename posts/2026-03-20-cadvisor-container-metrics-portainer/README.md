# How to Monitor Container Metrics with cAdvisor and Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, cAdvisor, Monitoring, Docker, Metric, Observability

Description: Learn how to deploy cAdvisor alongside Portainer to collect and expose per-container resource metrics for Prometheus scraping.

---

cAdvisor (Container Advisor) is an open-source daemon that collects, aggregates, and exports resource usage metrics for running containers. Deploying it alongside Portainer gives you per-container CPU, memory, network, and disk metrics.

---

## Deploy cAdvisor via Portainer Stack

In Portainer, go to **Stacks** → **Add stack** and paste:

```yaml
services:
  cadvisor:
    image: ghcr.io/google/cadvisor:v0.55.1
    container_name: cadvisor
    restart: unless-stopped
    privileged: true
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    devices:
      - /dev/kmsg
```

---

## Access the cAdvisor UI

Open `http://<host>:8080` to view the built-in dashboard with:
- Per-container CPU and memory usage
- Network I/O per interface
- Filesystem usage
- Container process list

---

## Scrape cAdvisor with Prometheus

```yaml
# prometheus.yml

scrape_configs:
  - job_name: cadvisor
    static_configs:
      - targets: ["cadvisor:8080"]
    scrape_interval: 15s
```

Key metrics exposed:
- `container_cpu_usage_seconds_total`
- `container_memory_usage_bytes`
- `container_network_receive_bytes_total`
- `container_fs_usage_bytes`

---

## Useful Prometheus Queries

```promql
# CPU usage per container (rate over 5 minutes)
rate(container_cpu_usage_seconds_total{name!=""}[5m]) * 100

# Memory usage per container
container_memory_usage_bytes{name!=""}

# Network receive rate
rate(container_network_receive_bytes_total{name!=""}[5m])
```

---

## Summary

Deploy cAdvisor with the `privileged: true` flag and required volume mounts for full host access. It exposes a Prometheus-compatible `/metrics` endpoint on port 8080. Configure Prometheus to scrape it and use Grafana dashboards (e.g., dashboard 14282) to visualize container resource utilization alongside Portainer-managed deployments.
