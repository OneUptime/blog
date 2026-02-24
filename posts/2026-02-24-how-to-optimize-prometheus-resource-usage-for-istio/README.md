# How to Optimize Prometheus Resource Usage for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Performance, Resource Optimization, Kubernetes

Description: Practical techniques to reduce Prometheus CPU, memory, and disk usage when monitoring Istio service mesh workloads in Kubernetes clusters.

---

Prometheus is the default metrics backend for Istio, and it works well until your mesh grows beyond a few dozen services. At that point, you start noticing Prometheus using gigabytes of memory, queries taking seconds instead of milliseconds, and disk usage climbing fast. The good news is that most of these problems are solvable with proper configuration.

This guide covers the specific optimizations that make the biggest difference for Istio workloads.

## Understanding Where Resources Go

Prometheus resource usage is driven by three factors:

1. **Active time series**: The number of unique label combinations across all metrics. This directly drives memory usage.
2. **Ingestion rate**: How many samples per second are being scraped. This drives CPU usage.
3. **Storage**: How much historical data is kept on disk.

For Istio, the primary resource hog is active time series. Each Envoy sidecar exposes hundreds of metrics, and the standard Istio metrics have many label dimensions.

Check your current stats:

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090 &

# Active time series count
curl -s localhost:9090/api/v1/status/tsdb | jq '.data.headStats.numSeries'

# Ingestion rate
curl -s 'localhost:9090/api/v1/query?query=rate(prometheus_tsdb_head_samples_appended_total[5m])' | jq '.data.result[0].value[1]'
```

## Optimization 1: Reduce Scrape Targets

Not every pod needs to be scraped individually. If you have replicas of the same service, they generate nearly identical metrics. Consider scraping only a subset:

```yaml
scrape_configs:
- job_name: 'envoy-stats'
  sample_limit: 20000
  scrape_interval: 30s
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_container_name]
    action: keep
    regex: istio-proxy
  # Only scrape pods whose name hash ends in 0-3 (roughly 40% of pods)
  - source_labels: [__meta_kubernetes_pod_name]
    modulus: 10
    target_label: __tmp_hash
    action: hashmod
  - source_labels: [__tmp_hash]
    regex: '[0-3]'
    action: keep
```

This reduces the number of scrape targets by 60%. You lose per-pod granularity but keep service-level visibility.

## Optimization 2: Increase Scrape Interval

The default 15-second scrape interval is aggressive for large meshes. Increasing it to 30 or 60 seconds cuts resource usage proportionally:

```yaml
scrape_configs:
- job_name: 'envoy-stats'
  scrape_interval: 30s
  scrape_timeout: 25s
```

For control plane metrics (istiod), keep the 15-second interval since there are few targets. For sidecar metrics with thousands of targets, 30 seconds is a reasonable trade-off.

## Optimization 3: Drop Metrics at Scrape Time

Remove metrics you will never query. This is one of the highest-impact optimizations:

```yaml
metric_relabel_configs:
# Drop all envoy internal metrics, keep only istio standard metrics
- source_labels: [__name__]
  regex: 'envoy_.*'
  action: drop

# Or keep specific metrics
- source_labels: [__name__]
  regex: 'istio_requests_total|istio_request_duration_milliseconds_bucket|istio_tcp_sent_bytes_total|istio_tcp_received_bytes_total|pilot_xds_pushes|pilot_xds_push_time_bucket'
  action: keep
```

## Optimization 4: Drop High-Cardinality Labels

Every unique label combination creates a new time series. Dropping labels you do not use in dashboards or alerts reduces cardinality significantly:

```yaml
metric_relabel_configs:
- regex: 'source_principal|destination_principal|connection_security_policy|response_flags|request_protocol'
  action: labeldrop
- regex: 'pod_template_hash|chart|heritage|release'
  action: labeldrop
```

## Optimization 5: Use Istio Telemetry API to Limit Metric Generation

Instead of generating metrics in Envoy and dropping them in Prometheus, tell Istio not to generate them in the first place:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: optimize-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    # Disable request size and response size metrics
    - match:
        metric: REQUEST_SIZE
      disabled: true
    - match:
        metric: RESPONSE_SIZE
      disabled: true
    # Remove unnecessary dimensions from request count
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
        connection_security_policy:
          operation: REMOVE
```

This saves CPU on every Envoy sidecar in addition to reducing Prometheus load.

## Optimization 6: Tune Prometheus Resource Limits

Based on your active series count, set appropriate resource limits. A rough guideline:

- 1 million active series: ~4 GB memory, 2 CPU cores
- 5 million active series: ~16 GB memory, 4 CPU cores
- 10 million active series: ~32 GB memory, 8 CPU cores

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
spec:
  resources:
    requests:
      cpu: "2"
      memory: 8Gi
    limits:
      cpu: "4"
      memory: 16Gi
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

Use fast SSDs for storage. Prometheus writes are sequential, but compaction and queries benefit enormously from fast random reads.

## Optimization 7: Reduce Retention

If you use Thanos or remote write for long-term storage, reduce local Prometheus retention aggressively:

```yaml
spec:
  retention: 6h
  retentionSize: 10GB
```

Short local retention means less disk usage and faster startup after a restart.

## Optimization 8: Use Recording Rules

Replace expensive queries with pre-computed recording rules:

```yaml
groups:
- name: istio-recordings
  interval: 30s
  rules:
  - record: istio:service:request_rate_5m
    expr: sum(rate(istio_requests_total[5m])) by (destination_service, response_code)

  - record: istio:service:error_rate_5m
    expr: |
      sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service)
      / sum(rate(istio_requests_total[5m])) by (destination_service)

  - record: istio:service:p99_latency_5m
    expr: histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service))
```

Then update your Grafana dashboards to use the recorded metrics. Queries become instant instead of aggregating millions of raw samples.

## Optimization 9: Shard Prometheus

For very large meshes, split the scraping workload across multiple Prometheus instances using hash-based sharding:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus-shard-0
spec:
  shards: 3
```

The Prometheus Operator handles the sharding automatically. Each shard scrapes a subset of targets based on consistent hashing.

Use Thanos Querier to merge results from all shards into a single query endpoint.

## Optimization 10: Limit Concurrent Queries

Expensive queries can spike Prometheus CPU and memory. Set query concurrency limits:

```yaml
spec:
  queryLogFile: /dev/null  # Optional: log slow queries
  query:
    maxConcurrency: 10
    maxSamples: 50000000
    timeout: 2m
```

## Measuring Improvement

After applying optimizations, track these metrics:

```promql
# Memory usage trend
process_resident_memory_bytes{job="prometheus"}

# Active series count
prometheus_tsdb_head_series

# Ingestion rate
rate(prometheus_tsdb_head_samples_appended_total[5m])

# Query latency
histogram_quantile(0.99, rate(prometheus_engine_query_duration_seconds_bucket[5m]))
```

Create a dashboard to monitor Prometheus itself so you can see the impact of each optimization.

Start with the changes that have the biggest impact for the least effort: dropping unused metrics and labels, increasing the scrape interval, and using the Istio Telemetry API to reduce metric generation. These three changes alone can cut your Prometheus resource usage by 50% or more.
