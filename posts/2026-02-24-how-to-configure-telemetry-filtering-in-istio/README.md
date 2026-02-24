# How to Configure Telemetry Filtering in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Filtering, Metrics, Observability, Prometheus

Description: How to filter and customize telemetry data in Istio by selectively including or excluding metrics, labels, trace spans, and access log entries.

---

Not all telemetry data is equally useful. In a busy mesh, you generate massive amounts of metrics, traces, and logs, but only a fraction of it is actually actionable. Telemetry filtering lets you keep the data you need and discard the rest, reducing storage costs, query times, and the performance overhead on your sidecars.

## Filtering Metrics with the Telemetry API

The Telemetry API is the primary way to filter metrics in Istio. You can control which metrics are generated, which labels they include, and even transform label values.

### Removing Specific Metrics

If you do not need certain metrics at all, you can disable them:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: filter-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_SIZE
        mode: CLIENT_AND_SERVER
      disabled: true
    - match:
        metric: RESPONSE_SIZE
        mode: CLIENT_AND_SERVER
      disabled: true
```

This disables the `istio_request_bytes` and `istio_response_bytes` metrics entirely. If you do not use request/response size data in your dashboards or alerts, removing these metrics saves a significant number of time series.

Available metric names you can filter:
- `REQUEST_COUNT` (istio_requests_total)
- `REQUEST_DURATION` (istio_request_duration_milliseconds)
- `REQUEST_SIZE` (istio_request_bytes)
- `RESPONSE_SIZE` (istio_response_bytes)
- `TCP_OPENED_CONNECTIONS` (istio_tcp_connections_opened_total)
- `TCP_CLOSED_CONNECTIONS` (istio_tcp_connections_closed_total)
- `TCP_SENT_BYTES` (istio_tcp_sent_bytes_total)
- `TCP_RECEIVED_BYTES` (istio_tcp_received_bytes_total)
- `GRPC_REQUEST_MESSAGES` (istio_request_messages_total)
- `GRPC_RESPONSE_MESSAGES` (istio_response_messages_total)

### Filtering Labels (Tag Overrides)

Labels are the biggest driver of metric cardinality. Each unique label value multiplies the number of time series. Remove labels you do not use:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: label-filter
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
      tagOverrides:
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
        request_protocol:
          operation: REMOVE
        grpc_response_status:
          operation: REMOVE
        response_flags:
          operation: REMOVE
```

### Transforming Label Values

Instead of removing a label entirely, you can transform its value to reduce cardinality:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: transform-labels
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        response_code:
          value: "response.code >= 500 ? '5xx' : (response.code >= 400 ? '4xx' : '2xx')"
        destination_port:
          value: "string(destination.port)"
```

The expression language used here is based on Common Expression Language (CEL). You can access request and response attributes to compute new label values.

## Filtering by Mode (Client vs Server)

Each sidecar generates metrics from two perspectives:
- **CLIENT** mode: metrics about requests the sidecar sends to other services
- **SERVER** mode: metrics about requests the sidecar receives from other services

If you only need one perspective, disable the other:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: server-metrics-only
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        mode: CLIENT
      disabled: true
```

This cuts the number of Istio metrics roughly in half by only reporting server-side metrics. You still get request counts, latency, and error rates, but only from the destination's perspective.

The trade-off: you lose visibility into which callers are sending traffic to a service. Server-mode metrics show you who is being called but not who is doing the calling.

## Per-Namespace Metric Filtering

Apply different filtering rules to different namespaces:

```yaml
# Production: minimal metrics for efficiency
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: production-metrics
  namespace: production
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
      tagOverrides:
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
        response_flags:
          operation: REMOVE
---
# Staging: full metrics for debugging
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: staging-metrics
  namespace: staging
spec:
  metrics:
  - providers:
    - name: prometheus
```

Production strips unnecessary labels for efficiency, while staging keeps everything for debugging.

## Per-Workload Metric Filtering

For noisy or high-traffic workloads, apply aggressive filtering:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: high-traffic-filter
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-gateway
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_SIZE
      disabled: true
    - match:
        metric: RESPONSE_SIZE
      disabled: true
    - match:
        metric: ALL_METRICS
      tagOverrides:
        source_workload:
          operation: REMOVE
        source_namespace:
          operation: REMOVE
```

The API gateway handles many different callers, making `source_workload` and `source_namespace` very high cardinality. Removing these labels from the gateway's metrics reduces cardinality significantly.

## Filtering Envoy-Native Stats

Beyond Istio standard metrics, you can control which Envoy-native stats are exposed:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionRegexps:
        - ".*circuit_breakers.*"
        - ".*upstream_rq_retry.*"
        - ".*outlier_detection.*"
        exclusionRegexps:
        - ".*rbac.*"
        - ".*wasm.*"
```

By default, most Envoy-native stats are not exposed to Prometheus. The `inclusionRegexps` list adds specific stats you want. The `exclusionRegexps` list removes stats you do not want even if they would otherwise be included.

Per-workload stat filtering:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyStatsMatcher:
            inclusionRegexps:
            - ".*upstream_rq_pending.*"
            - ".*circuit_breakers.*"
```

## Filtering Access Logs

### Disable Access Logs for Specific Workloads

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: disable-noisy-logs
  namespace: default
spec:
  selector:
    matchLabels:
      app: health-checker
  accessLogging:
  - providers:
    - name: envoy
    disabled: true
```

### Filter Access Logs by Response Code

Use an EnvoyFilter to only log errors:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: error-only-access-log
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          access_log:
          - name: envoy.access_loggers.file
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
              path: /dev/stdout
              log_format:
                json_format:
                  start_time: "%START_TIME%"
                  method: "%REQ(:METHOD)%"
                  path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
                  response_code: "%RESPONSE_CODE%"
                  response_flags: "%RESPONSE_FLAGS%"
                  duration: "%DURATION%"
                  upstream_host: "%UPSTREAM_HOST%"
            filter:
              or_filter:
                filters:
                - status_code_filter:
                    comparison:
                      op: GE
                      value:
                        default_value: 400
                        runtime_key: access_log_min_status_error
                - duration_filter:
                    comparison:
                      op: GE
                      value:
                        default_value: 1000
                        runtime_key: access_log_min_duration
```

This logs only requests that either returned a 400+ status code or took more than 1 second. For most production services, this captures the interesting events while dramatically reducing log volume.

## Filtering Traces

### Sampling-Based Filtering

The simplest trace filter is the sampling rate:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: trace-filter
  namespace: istio-system
spec:
  tracing:
  - randomSamplingPercentage: 0.5
```

0.5% sampling means only 1 in 200 requests generates a trace.

### Per-Workload Trace Sampling

Override sampling for specific workloads:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: high-sample-debug
  namespace: default
spec:
  selector:
    matchLabels:
      app: problematic-service
  tracing:
  - randomSamplingPercentage: 50.0
```

## Verifying Filters Are Applied

After applying filters, verify they are working:

```bash
# Check the Telemetry resources in effect
kubectl get telemetry --all-namespaces

# Check metrics from a specific sidecar
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15020/stats/prometheus | grep istio_requests_total | head -5

# Count the labels on a metric
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15020/stats/prometheus | grep "istio_requests_total{" | head -1 | tr ',' '\n' | wc -l

# Check Prometheus for cardinality
# (from within the Prometheus pod or via port-forward)
curl -s 'localhost:9090/api/v1/query?query=count(istio_requests_total)' | python3 -m json.tool
```

## Impact Assessment

Before and after applying filters, measure the impact:

```promql
# Total time series count (before and after)
count({__name__=~"istio_.*"})

# Scrape duration (should decrease after filtering)
scrape_duration_seconds{job="envoy-stats"}

# Samples scraped per target
scrape_samples_scraped{job="envoy-stats"}
```

Telemetry filtering is about finding the right balance between visibility and overhead. Start by removing metrics and labels you know you do not use, then progressively filter more aggressively based on what you learn about your actual observability needs. The Telemetry API makes this easy to do incrementally without disrupting your existing monitoring.
