# How to Set Up Remote Write for Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Remote Write, Monitoring, Metrics Storage

Description: How to configure Prometheus remote write to send Istio service mesh metrics to external storage backends like Thanos, Cortex, Mimir, or any compatible endpoint.

---

Prometheus remote write is the standard way to ship metrics from a local Prometheus instance to a remote storage backend. For Istio deployments, this is especially useful because mesh metrics can be high volume and you often need them stored longer than what a local Prometheus can handle. Remote write lets you push Istio metrics to backends like Grafana Mimir, Thanos Receive, Cortex, Victoria Metrics, or any Prometheus-compatible remote storage.

## Why Remote Write for Istio

Istio generates a lot of metrics. Every request that flows through an Envoy sidecar produces data points for request count, latency, request size, and response size. Multiply that by the number of services, pods, and response codes, and you get a metric volume that can overwhelm a single Prometheus instance.

Remote write solves this by:

- Offloading storage to a dedicated backend with better retention capabilities
- Enabling multi-cluster aggregation without federation overhead
- Allowing you to scale metric ingestion independently from querying

## Basic Remote Write Configuration

Add a `remote_write` section to your Prometheus configuration. If you are using the Prometheus Operator, this goes in the Prometheus custom resource:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: istio-system
spec:
  remoteWrite:
  - url: "http://mimir.monitoring.svc:9009/api/v1/push"
    writeRelabelConfigs:
    - sourceLabels: [__name__]
      regex: 'istio_.*|pilot_.*|envoy_.*'
      action: keep
```

If you are using a plain Prometheus config file:

```yaml
remote_write:
- url: "http://mimir.monitoring.svc:9009/api/v1/push"
  write_relabel_configs:
  - source_labels: [__name__]
    regex: 'istio_.*|pilot_.*|envoy_.*'
    action: keep
```

The `write_relabel_configs` filter is important. Without it, Prometheus sends all metrics to the remote backend, not just Istio metrics. This wastes bandwidth and storage.

## Filtering Istio Metrics

You want to be selective about which metrics you send. Here is a more targeted filter:

```yaml
remote_write:
- url: "http://mimir.monitoring.svc:9009/api/v1/push"
  write_relabel_configs:
  # Keep core Istio request metrics
  - source_labels: [__name__]
    regex: 'istio_requests_total|istio_request_duration_milliseconds_bucket|istio_request_bytes_bucket|istio_response_bytes_bucket'
    action: keep
  # Also keep TCP metrics
  - source_labels: [__name__]
    regex: 'istio_tcp_.*'
    action: keep
  # And control plane metrics
  - source_labels: [__name__]
    regex: 'pilot_.*|galley_.*|citadel_.*'
    action: keep
```

Wait, that will not work as expected. When you have multiple `keep` actions, they are applied sequentially and each one drops everything that does not match. You need to combine them into a single regex:

```yaml
remote_write:
- url: "http://mimir.monitoring.svc:9009/api/v1/push"
  write_relabel_configs:
  - source_labels: [__name__]
    regex: 'istio_requests_total|istio_request_duration_milliseconds_bucket|istio_request_bytes_bucket|istio_response_bytes_bucket|istio_tcp_.*|pilot_.*'
    action: keep
```

## Adding External Labels

When you have multiple clusters sending metrics to the same backend, you need to distinguish them. Add external labels to identify the source cluster:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: istio-system
spec:
  externalLabels:
    cluster: "production-us-east-1"
    environment: "production"
  remoteWrite:
  - url: "http://mimir.monitoring.svc:9009/api/v1/push"
```

In plain Prometheus config:

```yaml
global:
  external_labels:
    cluster: "production-us-east-1"
    environment: "production"

remote_write:
- url: "http://mimir.monitoring.svc:9009/api/v1/push"
```

## Configuring Queue Parameters

Remote write uses a queue to buffer samples before sending them. Tuning the queue parameters affects reliability and resource usage:

```yaml
remote_write:
- url: "http://mimir.monitoring.svc:9009/api/v1/push"
  queue_config:
    capacity: 10000
    max_shards: 30
    min_shards: 1
    max_samples_per_send: 5000
    batch_send_deadline: 5s
    min_backoff: 30ms
    max_backoff: 5s
    retry_on_http_429: true
```

For Istio workloads with high metric volume, increase `max_shards` and `capacity`. Each shard sends metrics in parallel, so more shards means higher throughput but also more connections to the remote endpoint.

## Authentication

Most remote storage backends require authentication. Here are common approaches:

### Basic Auth

```yaml
remote_write:
- url: "https://mimir.example.com/api/v1/push"
  basic_auth:
    username: "istio-metrics"
    password_file: "/etc/prometheus/remote-write-password"
```

Store the password in a Kubernetes secret and mount it:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: remote-write-auth
  namespace: istio-system
type: Opaque
stringData:
  password: "your-secure-password"
```

### Bearer Token

```yaml
remote_write:
- url: "https://mimir.example.com/api/v1/push"
  authorization:
    type: Bearer
    credentials_file: "/etc/prometheus/token"
```

### TLS Configuration

```yaml
remote_write:
- url: "https://mimir.example.com/api/v1/push"
  tls_config:
    ca_file: "/etc/prometheus/ca.crt"
    cert_file: "/etc/prometheus/client.crt"
    key_file: "/etc/prometheus/client.key"
```

## Reducing Label Cardinality Before Sending

High-cardinality labels dramatically increase storage costs. Drop labels you do not need at the remote write stage:

```yaml
remote_write:
- url: "http://mimir.monitoring.svc:9009/api/v1/push"
  write_relabel_configs:
  - source_labels: [__name__]
    regex: 'istio_.*|pilot_.*'
    action: keep
  # Drop high-cardinality labels
  - regex: 'instance|pod|pod_template_hash|chart|heritage'
    action: labeldrop
```

This removes labels like `instance` and `pod` that are unique per pod and create enormous cardinality. You lose per-pod granularity in the remote store, but the storage savings are significant.

## Monitoring Remote Write Health

Prometheus exposes metrics about the remote write queue:

```promql
# Samples pending in the queue
prometheus_remote_storage_pending_samples

# Failed sample sends
rate(prometheus_remote_storage_failed_samples_total[5m])

# Samples successfully sent
rate(prometheus_remote_storage_succeeded_samples_total[5m])

# Queue shards currently in use
prometheus_remote_storage_shards
```

Set up alerts for remote write failures:

```yaml
groups:
- name: remote-write
  rules:
  - alert: PrometheusRemoteWriteFailing
    expr: rate(prometheus_remote_storage_failed_samples_total[5m]) > 0
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Prometheus remote write is failing"
```

## Using Prometheus Agent Mode

If you do not need to query the local Prometheus and only want to forward metrics, consider running Prometheus in agent mode. Agent mode disables local storage and the query engine, reducing resource usage:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: istio-system
spec:
  mode: Agent
  remoteWrite:
  - url: "http://mimir.monitoring.svc:9009/api/v1/push"
```

Agent mode is well suited for clusters where all querying happens on a central system and the local Prometheus just needs to collect and forward Istio metrics.

## Testing the Setup

After configuring remote write, verify that metrics are arriving at the backend:

```bash
# Query the remote backend for Istio metrics
curl -G 'http://mimir.monitoring.svc:9009/prometheus/api/v1/query' \
  --data-urlencode 'query=istio_requests_total{cluster="production-us-east-1"}'
```

Check Prometheus logs for remote write errors:

```bash
kubectl logs -n istio-system -l app.kubernetes.io/name=prometheus | grep remote
```

Remote write is the most flexible way to get Istio metrics into a centralized storage backend. Combined with proper filtering and label management, it scales much better than federation for multi-cluster setups.
