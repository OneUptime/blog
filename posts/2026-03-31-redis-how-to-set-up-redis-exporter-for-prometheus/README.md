# How to Set Up Redis Exporter for Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Prometheus, Monitoring, Observability, DevOps

Description: Learn how to install and configure redis_exporter to expose Redis metrics for Prometheus, including authentication, TLS, and multi-instance scraping.

---

## What Is redis_exporter

`redis_exporter` is an open-source exporter maintained by Oliver006 that reads Redis metrics via the INFO command and exposes them in Prometheus format on an HTTP endpoint. Prometheus scrapes this endpoint at regular intervals to store the metrics in its time-series database.

GitHub: https://github.com/oliver006/redis_exporter

## Installation

### Binary Installation

```bash
# Download the latest release
wget https://github.com/oliver006/redis_exporter/releases/download/v1.82.0/redis_exporter-v1.82.0.linux-amd64.tar.gz

# Extract
tar xzf redis_exporter-v1.82.0.linux-amd64.tar.gz
cd redis_exporter-v1.82.0.linux-amd64

# Run with defaults (connects to redis://localhost:6379)
./redis_exporter
```

### Docker Installation

```bash
docker run -d \
  --name redis_exporter \
  -p 9121:9121 \
  oliver006/redis_exporter \
  --redis.addr redis://your-redis-host:6379
```

### With Authentication

```bash
docker run -d \
  --name redis_exporter \
  -p 9121:9121 \
  oliver006/redis_exporter \
  --redis.addr redis://your-redis-host:6379 \
  --redis.password yourpassword
```

## Verify the Exporter is Running

```bash
curl http://localhost:9121/metrics | head -50
```

```text
# HELP redis_up Information about the Redis instance
# TYPE redis_up gauge
redis_up 1

# HELP redis_connected_clients Number of client connections
# TYPE redis_connected_clients gauge
redis_connected_clients 42

# HELP redis_memory_used_bytes Total number of bytes allocated by Redis
# TYPE redis_memory_used_bytes gauge
redis_memory_used_bytes 5.368709120e+09

# HELP redis_keyspace_hits_total Number of successful lookup of keys in the main dictionary
# TYPE redis_keyspace_hits_total counter
redis_keyspace_hits_total 3.8291847e+07
```

## Running as a systemd Service

```bash
# Create a dedicated user
sudo useradd -rs /bin/false redis_exporter

# Copy the binary
sudo cp redis_exporter /usr/local/bin/
sudo chmod +x /usr/local/bin/redis_exporter
```

Create `/etc/systemd/system/redis_exporter.service`:
```text
[Unit]
Description=Redis Exporter for Prometheus
After=network.target

[Service]
Type=simple
User=redis_exporter
ExecStart=/usr/local/bin/redis_exporter \
  --redis.addr=redis://localhost:6379 \
  --redis.password=yourpassword \
  --web.listen-address=:9121 \
  --web.telemetry-path=/metrics
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable redis_exporter
sudo systemctl start redis_exporter
sudo systemctl status redis_exporter
```

## Configuring Prometheus to Scrape

Add to `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'redis'
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets:
          - localhost:9121
```

Reload Prometheus (requires Prometheus to be started with `--web.enable-lifecycle`):
```bash
curl -X POST http://localhost:9090/-/reload
```

## Monitoring Multiple Redis Instances

Use Prometheus relabeling to route scrape requests through a single exporter:
```yaml
scrape_configs:
  - job_name: 'redis_exporter'
    static_configs:
      - targets:
          - redis://redis-primary:6379
          - redis://redis-replica-1:6379
          - redis://redis-replica-2:6379
    metrics_path: /scrape
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: redis-exporter:9121
```

## Key Metrics to Track

| Metric | Description |
|--------|-------------|
| `redis_up` | 1 if Redis is accessible, 0 if down |
| `redis_connected_clients` | Active client connections |
| `redis_memory_used_bytes` | Current memory usage |
| `redis_memory_max_bytes` | maxmemory setting |
| `redis_keyspace_hits_total` | Cache hits (counter) |
| `redis_keyspace_misses_total` | Cache misses (counter) |
| `redis_evicted_keys_total` | Keys evicted due to maxmemory |
| `redis_expired_keys_total` | Keys expired by TTL |
| `redis_commands_processed_total` | Total commands executed |
| `redis_mem_fragmentation_ratio` | Memory fragmentation |
| `redis_connected_slave_lag_seconds` | Replica lag (on replicas) |

## Useful PromQL Queries

Cache hit rate:
```text
rate(redis_keyspace_hits_total[5m]) /
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

Memory usage percentage:
```text
redis_memory_used_bytes / redis_memory_max_bytes * 100
```

Eviction rate (keys/sec):
```text
rate(redis_evicted_keys_total[5m])
```

Commands per second:
```text
rate(redis_commands_processed_total[1m])
```

## Enabling Per-Command Metrics

redis_exporter automatically exposes per-command statistics from the `INFO commandstats` section. No additional flags are needed:
```bash
redis_exporter \
  --redis.addr=redis://localhost:6379
```

Per-command calls and duration:
```text
redis_commands_total{cmd="get"} 3.8291847e+07
redis_commands_duration_seconds_total{cmd="get"} 7.28e+00
```

## Summary

`redis_exporter` is the standard way to expose Redis metrics to Prometheus. Install it as a systemd service alongside each Redis instance, configure Prometheus to scrape it every 15 seconds, and use the key metrics - hit rate, memory usage, eviction rate, and replication lag - to build dashboards and alerts. For multi-instance deployments, use Prometheus relabeling to route scrape requests through a single exporter.
