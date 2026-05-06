# How to Set Up cAdvisor for Container Metrics with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, cAdvisor, Container Metrics, Prometheus, Monitoring

Description: Learn how to deploy cAdvisor (Container Advisor) as a Portainer stack to collect real-time CPU, memory, network, and disk metrics from all Docker containers.

## What Is cAdvisor?

cAdvisor (Container Advisor) is a Google-maintained tool that automatically discovers all containers on a Docker host and collects resource usage metrics. It exposes these metrics in Prometheus format.

## Metrics cAdvisor Collects

- CPU usage (total, per-core)
- Memory usage (working set, resident set, limits)
- Network I/O (bytes sent/received, packets, errors)
- Filesystem usage and I/O
- Container start time and OOM events

## Deploy cAdvisor via Portainer

**Stacks → Add Stack → cadvisor**

```yaml
services:
  cadvisor:
    image: ghcr.io/google/cadvisor:v0.56.2
    container_name: cadvisor
    restart: unless-stopped
    privileged: true
    devices:
      - /dev/kmsg:/dev/kmsg
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    ports:
      - "8080:8080"
    networks:
      - monitoring
    command:
      # Optional: reduce cardinality by disabling unused collectors
      - '--disable_metrics=percpu,sched,tcp,udp,hugetlb,referenced_memory,resctrl,cpuset,advtcp,memory_numa'

networks:
  monitoring:
    name: monitoring
    external: true
```

Note: The external `monitoring` network must already exist, and your Prometheus container must also be attached to it for `cadvisor:8080` to resolve. The `privileged: true` and `/dev/kmsg` settings match cAdvisor's current Docker quick-start for full host and container metrics.

## Verify cAdvisor Is Working

```bash
# Check cAdvisor web UI

curl http://localhost:8080/containers/

# Check metrics endpoint
curl http://localhost:8080/metrics | head -50

# Count unique metric families
curl -s http://localhost:8080/metrics | grep "^# TYPE" | wc -l
```

## Configure Prometheus to Scrape cAdvisor

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'cadvisor'
    scrape_interval: 15s
    static_configs:
      - targets: ['cadvisor:8080']
    metric_relabel_configs:
      # Keep only container metrics
      - source_labels: [id]
        regex: '^/?$'
        action: drop
```

## Key cAdvisor Metrics for Grafana

| Metric | Description |
|--------|-------------|
| `container_cpu_usage_seconds_total` | Cumulative CPU time |
| `container_memory_working_set_bytes` | Memory actually in use |
| `container_network_receive_bytes_total` | Network bytes received |
| `container_network_transmit_bytes_total` | Network bytes sent |
| `container_fs_reads_bytes_total` | Filesystem reads |

## Grafana Dashboard

Import dashboard ID `14282` (cAdvisor Exporter) or use these queries:

```promql
# Container CPU usage (cores)
sum by (name) (
  rate(container_cpu_usage_seconds_total{name!=""}[5m])
)

# Container memory usage
container_memory_working_set_bytes{name!=""}

# Network receive rate (bytes/sec)
sum by (name) (
  rate(container_network_receive_bytes_total{name!=""}[5m])
)
```

## Performance Tuning

cAdvisor can be resource-intensive. Reduce overhead:

```yaml
command:
  # Increase housekeeping interval
  - '--housekeeping_interval=30s'
  # Reduce local storage duration
  - '--storage_duration=1m'
  # Disable unused collectors
  - '--disable_metrics=hugetlb,referenced_memory,resctrl,cpuset'
```

## Conclusion

cAdvisor provides the deepest visibility into container resource usage of any tool in the Docker ecosystem. Deployed as a Portainer stack and scraped by Prometheus, it feeds your Grafana dashboards with per-container metrics across CPU, memory, network, and disk - giving you the observability needed to right-size containers and detect performance issues.
