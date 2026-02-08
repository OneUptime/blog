# How to Monitor Docker Registry Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Registry, Monitoring, Prometheus, Grafana, Metrics, Performance, Observability

Description: Set up comprehensive monitoring for your Docker registry with Prometheus metrics, Grafana dashboards, and alerting rules.

---

Running a Docker registry is straightforward until it becomes slow and nobody knows why. Maybe pulls are timing out for CI pipelines. Maybe push operations are backing up. Maybe the storage backend is the bottleneck, or maybe it is the network. Without monitoring, you are guessing.

The Docker registry has built-in support for Prometheus metrics. Enabling it gives you visibility into request rates, latencies, storage operations, and error counts. Combined with Grafana for visualization and alerting, you get a complete observability setup for your registry.

## What to Monitor

A healthy Docker registry needs monitoring across four dimensions:

1. **Request metrics** - How many pulls and pushes are happening, and how fast they complete
2. **Storage metrics** - How storage operations perform (reads, writes, deletes)
3. **Error rates** - Authentication failures, storage errors, client errors
4. **Resource utilization** - CPU, memory, and network usage of the registry container

## Enabling Prometheus Metrics

The registry exposes metrics on a configurable endpoint. Enable it in the registry configuration:

```yaml
# config.yml - Registry with Prometheus metrics enabled
version: 0.1

storage:
  filesystem:
    rootdirectory: /var/lib/registry
  cache:
    blobdescriptor: inmemory
  delete:
    enabled: true

http:
  addr: :5000
  debug:
    addr: :5001
    prometheus:
      enabled: true
      path: /metrics

health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
```

The metrics endpoint runs on a separate port (5001) so you can keep it isolated from the main registry port. This prevents unauthorized users from scraping your metrics.

## Docker Compose with Monitoring Stack

```yaml
# Registry with Prometheus and Grafana monitoring
version: "3.8"

services:
  # Docker Registry with metrics enabled
  registry:
    image: registry:2
    ports:
      - "5000:5000"
    expose:
      - "5001"
    volumes:
      - ./config.yml:/etc/docker/registry/config.yml:ro
      - registry-data:/var/lib/registry
    restart: unless-stopped
    networks:
      - registry-network

  # Prometheus - metrics collection and storage
  prometheus:
    image: prom/prometheus:v2.49.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/rules:/etc/prometheus/rules:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - registry-network

  # Grafana - visualization and dashboards
  grafana:
    image: grafana/grafana:10.3.1
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: grafana
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus
    restart: unless-stopped
    networks:
      - registry-network

volumes:
  registry-data:
  prometheus-data:
  grafana-data:

networks:
  registry-network:
    driver: bridge
```

## Prometheus Configuration

```yaml
# prometheus/prometheus.yml - Scrape configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  # Scrape the Docker registry metrics endpoint
  - job_name: "docker-registry"
    metrics_path: /metrics
    static_configs:
      - targets: ["registry:5001"]
        labels:
          instance: "primary-registry"

  # Scrape Prometheus itself
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]
```

## Key Metrics to Track

After starting the stack, you can explore the available metrics:

```bash
# Fetch all available metrics from the registry
curl -s http://localhost:5001/metrics | head -50

# Count the number of distinct metric names
curl -s http://localhost:5001/metrics | grep "^# HELP" | wc -l
```

The most important metrics are:

### HTTP Request Metrics

```promql
# Total number of HTTP requests by method and status code
registry_http_requests_total

# Request duration histogram - useful for latency analysis
registry_http_request_duration_seconds_bucket

# In-flight requests - shows current load
registry_http_in_flight_requests
```

### Storage Metrics

```promql
# Storage action duration - shows how fast your backend responds
registry_storage_action_seconds_bucket

# Breakdown by action type: GetContent, PutContent, Stat, List, Delete
registry_storage_action_seconds_count{action="GetContent"}
```

### Upload and Blob Metrics

```promql
# Blob upload duration
registry_storage_blob_upload_seconds_bucket

# Number of active blob uploads
registry_storage_blob_upload_in_progress
```

## Grafana Data Source Provisioning

```yaml
# grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

## Useful PromQL Queries for Dashboards

### Request Rate

```promql
# Requests per second by method
rate(registry_http_requests_total[5m])
```

### Request Latency (P95)

```promql
# 95th percentile request latency
histogram_quantile(0.95, rate(registry_http_request_duration_seconds_bucket[5m]))
```

### Error Rate

```promql
# Error rate (4xx and 5xx responses)
sum(rate(registry_http_requests_total{code=~"4..|5.."}[5m]))
/
sum(rate(registry_http_requests_total[5m]))
```

### Storage Latency by Operation

```promql
# Average storage operation latency by action type
rate(registry_storage_action_seconds_sum[5m])
/
rate(registry_storage_action_seconds_count[5m])
```

### Push vs Pull Traffic

```promql
# Pull requests (GET on blobs and manifests)
sum(rate(registry_http_requests_total{method="GET", handler=~".*blobs.*|.*manifests.*"}[5m]))

# Push requests (PUT/PATCH on blobs and manifests)
sum(rate(registry_http_requests_total{method=~"PUT|PATCH", handler=~".*blobs.*|.*manifests.*"}[5m]))
```

## Alert Rules

Create alert rules in Prometheus to catch problems early:

```yaml
# prometheus/rules/registry-alerts.yml
groups:
  - name: docker-registry
    rules:
      # Alert when error rate exceeds 5%
      - alert: RegistryHighErrorRate
        expr: |
          sum(rate(registry_http_requests_total{code=~"5.."}[5m]))
          /
          sum(rate(registry_http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Docker registry error rate above 5%"
          description: "The registry is returning server errors at {{ $value | humanizePercentage }} rate."

      # Alert when P95 latency exceeds 5 seconds
      - alert: RegistryHighLatency
        expr: |
          histogram_quantile(0.95, rate(registry_http_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Docker registry P95 latency above 5 seconds"

      # Alert when storage operations are slow
      - alert: RegistrySlowStorage
        expr: |
          rate(registry_storage_action_seconds_sum[5m])
          /
          rate(registry_storage_action_seconds_count[5m]) > 1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Docker registry storage operations averaging over 1 second"

      # Alert when the registry is down
      - alert: RegistryDown
        expr: up{job="docker-registry"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Docker registry is unreachable"
```

## Load Testing

Generate some traffic to see your monitoring in action:

```bash
# Push multiple images to generate metrics
for i in $(seq 1 10); do
  docker tag alpine:latest localhost:5000/test/image-$i:latest
  docker push localhost:5000/test/image-$i:latest
done

# Pull them back
for i in $(seq 1 10); do
  docker rmi localhost:5000/test/image-$i:latest
  docker pull localhost:5000/test/image-$i:latest
done
```

## Container-Level Monitoring

Beyond registry-specific metrics, monitor the container itself:

```bash
# Check container resource usage in real time
docker stats registry

# Get detailed resource stats as JSON
docker inspect --format='{{json .State}}' registry
```

For automated collection, add cAdvisor to your compose stack:

```yaml
# cAdvisor collects container-level resource metrics
cadvisor:
  image: gcr.io/cadvisor/cadvisor:v0.47.2
  ports:
    - "8080:8080"
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
  networks:
    - registry-network
```

Add it as a Prometheus scrape target:

```yaml
# Add to prometheus.yml scrape_configs
- job_name: "cadvisor"
  static_configs:
    - targets: ["cadvisor:8080"]
```

## Troubleshooting Performance Issues

When you spot a problem on the dashboard, here is how to drill down:

```bash
# Check if the storage backend is the bottleneck
curl -s http://localhost:5001/metrics | grep storage_action_seconds

# Look for slow individual requests in registry logs
docker compose logs registry 2>&1 | grep -E "duration=[0-9]+\.[0-9]s"

# Check disk I/O on the host
iostat -x 1 5

# Check network throughput
docker compose exec registry sh -c "cat /proc/net/dev"
```

## Summary

Monitoring your Docker registry prevents outages from sneaking up on you. The built-in Prometheus metrics give you deep visibility into request patterns, storage performance, and error rates. Grafana dashboards make this data accessible to the whole team, and alerting rules catch problems before users notice them. If you run a registry in production, monitoring is not optional.
