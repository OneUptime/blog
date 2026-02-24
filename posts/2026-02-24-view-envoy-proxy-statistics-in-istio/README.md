# How to View Envoy Proxy Statistics in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Statistics, Monitoring, Observability, Kubernetes

Description: Complete guide to viewing and understanding Envoy proxy statistics in Istio for monitoring, debugging, and performance analysis.

---

Envoy generates an enormous number of statistics. Every connection, every request, every retry, every timeout, every circuit breaker trip gets counted. These statistics are the raw data behind the dashboards you see in Grafana and the alerts you set up in Prometheus. Understanding how to access and interpret them directly is a valuable debugging skill.

## Where Envoy Statistics Live

Each Envoy sidecar maintains its own statistics in memory. There are three ways to access them:

1. **Admin interface** - curl the `/stats` endpoint on port 15000
2. **Prometheus endpoint** - scrape `/stats/prometheus` on port 15090
3. **istioctl** - use `istioctl experimental envoy-stats`

## Accessing Stats from the Admin Interface

The raw stats endpoint gives you every metric Envoy tracks:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats
```

This returns thousands of lines. Filter to what you need:

```bash
# Filter by prefix
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/stats?filter=cluster.outbound"

# Only used (non-zero) stats
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/stats?usedonly"

# Prometheus format
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats/prometheus

# JSON format
kubectl exec <pod-name> -c istio-proxy -- curl -s "localhost:15000/stats?format=json"
```

## Understanding the Stats Naming Convention

Envoy stats follow a hierarchical naming pattern:

```
<category>.<subcategory>.<metric_name>
```

For Istio, the most important categories are:

**Cluster stats** (outbound traffic):
```
cluster.outbound|8080||my-service.default.svc.cluster.local.upstream_rq_total
cluster.outbound|8080||my-service.default.svc.cluster.local.upstream_rq_200
cluster.outbound|8080||my-service.default.svc.cluster.local.upstream_rq_5xx
cluster.outbound|8080||my-service.default.svc.cluster.local.upstream_cx_active
```

**Listener stats** (inbound traffic):
```
listener.0.0.0.0_8080.downstream_cx_total
listener.0.0.0.0_8080.downstream_cx_active
```

**HTTP stats**:
```
http.inbound_0.0.0.0_8080.downstream_rq_total
http.inbound_0.0.0.0_8080.downstream_rq_2xx
http.inbound_0.0.0.0_8080.downstream_rq_5xx
```

## Essential Statistics for Debugging

### Request Volume and Error Rates

```bash
# Total outbound requests to a service
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*upstream_rq_total"

# Requests by response code
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*upstream_rq_[2345]"

# Request timeouts
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*upstream_rq_timeout"

# Request retries
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*upstream_rq_retry"
```

### Connection Statistics

```bash
# Active connections to upstream
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*upstream_cx_active"

# Connection failures
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*upstream_cx_connect_fail"

# Total connections made
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*upstream_cx_total"

# Connection timeouts
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*upstream_cx_connect_timeout"
```

### Circuit Breaker Statistics

```bash
# Circuit breaker overflow (requests rejected)
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*upstream_rq_pending_overflow"

# Max connections hit
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*circuit_breakers"

# Outlier detection ejections
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*outlier_detection"
```

### Latency Statistics

Envoy tracks latency as histograms:

```bash
# Upstream request time (P50, P95, P99)
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*upstream_rq_time"
```

The output shows histogram buckets:

```
cluster.outbound|8080||my-service.default.svc.cluster.local.upstream_rq_time: P0(1,1) P25(3,3) P50(5,5) P75(12,12) P90(25,25) P95(50,50) P99(100,100) P99.5(200,200) P99.9(500,500) P100(1000,1000)
```

### TLS/mTLS Statistics

```bash
# TLS handshake successes and failures
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "ssl"

# Specific cluster TLS stats
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "my-service.*ssl"
```

## Prometheus Endpoint

For monitoring systems, the Prometheus endpoint on port 15090 provides metrics in Prometheus exposition format:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15090/stats/prometheus
```

This includes Istio-specific metrics:

```
istio_requests_total{} - Total requests
istio_request_duration_milliseconds{} - Request latency
istio_request_bytes{} - Request body size
istio_response_bytes{} - Response body size
istio_tcp_connections_opened_total{} - TCP connections opened
istio_tcp_connections_closed_total{} - TCP connections closed
```

These are the metrics that populate the standard Istio Grafana dashboards.

## Controlling Which Stats Are Generated

By default, Envoy generates stats for every cluster, listener, and route. In large meshes this uses significant memory. Control what gets generated:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
        - "cluster.outbound"
        - "cluster.inbound"
        - "listener"
        - "http"
        inclusionRegexps:
        - ".*circuit_breakers.*"
        - ".*outlier_detection.*"
        - ".*upstream_rq_retry.*"
        - ".*upstream_rq_time.*"
```

This keeps only the stats you care about and drops the rest, saving memory and CPU.

For per-pod customization:

```yaml
annotations:
  proxy.istio.io/config: |
    proxyStatsMatcher:
      inclusionPrefixes:
      - "cluster.outbound|8080||critical-service"
```

## Adding Custom Stats Tags

Add custom tags to all Envoy metrics for better filtering in your monitoring system:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      extraStatTags:
      - "request_operation"
```

Combine with Istio's Telemetry API to define tag values:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-tags
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
      tagOverrides:
        request_operation:
          value: "request.url_path"
```

## Viewing Stats in Grafana

The standard Istio Grafana dashboards visualize Envoy statistics. If you have Grafana installed:

```bash
kubectl port-forward -n istio-system svc/grafana 3000:3000
```

The key dashboards are:

- **Mesh Dashboard** - Overall mesh traffic and error rates
- **Service Dashboard** - Per-service metrics including latency percentiles
- **Workload Dashboard** - Per-workload metrics

## Comparing Stats Between Pods

When debugging, comparing stats between a healthy and unhealthy pod is very useful:

```bash
# Save stats from both pods
kubectl exec healthy-pod -c istio-proxy -- curl -s "localhost:15000/stats?usedonly" > healthy.txt
kubectl exec unhealthy-pod -c istio-proxy -- curl -s "localhost:15000/stats?usedonly" > unhealthy.txt

# Compare
diff healthy.txt unhealthy.txt
```

Look for differences in error counts, connection failures, and outlier detection ejections.

## Resetting Statistics

During debugging, you might want to reset statistics to get a clean baseline:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s -X POST localhost:15000/reset_counters
```

This resets all counters to zero. Gauges and histograms are not affected.

## Key Metrics to Monitor in Production

Set up alerts for these critical statistics:

- `upstream_rq_5xx` - Server errors to upstream services
- `upstream_cx_connect_fail` - Failed connection attempts
- `upstream_rq_timeout` - Request timeouts
- `upstream_rq_pending_overflow` - Circuit breaker rejections
- `outlier_detection.ejections_active` - Currently ejected endpoints
- `downstream_cx_active` - Active inbound connections (watch for leaks)
- `ssl_handshake_error` - TLS problems

Envoy statistics are the foundation of Istio observability. Whether you access them through the admin interface during debugging or scrape them with Prometheus for dashboards and alerts, understanding what they mean and where to find them makes operating a service mesh much more manageable. The key is knowing which stats to look at for each type of problem.
