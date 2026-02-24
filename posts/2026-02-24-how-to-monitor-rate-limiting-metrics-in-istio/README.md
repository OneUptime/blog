# How to Monitor Rate Limiting Metrics in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Monitoring, Prometheus, Grafana

Description: How to monitor and visualize rate limiting metrics in Istio using Prometheus, Grafana, and Envoy proxy statistics for production observability.

---

Setting up rate limiting is only half the battle. If you cannot see how your limits are performing in production, you are flying blind. Are clients getting rate limited too aggressively? Are some endpoints being hit harder than expected? Is the rate limit service itself healthy? Monitoring answers these questions and helps you tune your limits based on real data.

## Envoy Rate Limit Statistics

Every Envoy proxy exposes detailed statistics about rate limiting. You can access them directly from the sidecar admin interface.

For local rate limiting:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats | grep local_rate_limiter
```

This outputs stats like:

```
http_local_rate_limiter.enabled: 5000
http_local_rate_limiter.enforced: 150
http_local_rate_limiter.ok: 4850
http_local_rate_limiter.rate_limited: 150
```

For global rate limiting:

```bash
kubectl exec deploy/istio-ingressgateway -n istio-system -c istio-proxy -- curl -s localhost:15000/stats | grep ratelimit
```

Which shows:

```
ratelimit.api-gateway.ok: 9500
ratelimit.api-gateway.over_limit: 500
ratelimit.api-gateway.error: 3
ratelimit.api-gateway.failure_mode_allowed: 2
```

The `error` and `failure_mode_allowed` counters tell you when the rate limit service was unreachable and requests were allowed through (if failure_mode_deny is false).

## Scraping Metrics with Prometheus

Istio already configures Envoy to expose metrics in Prometheus format on port 15020. The rate limit stats are included in this exposition.

Verify that Prometheus is scraping your sidecars:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15020/stats/prometheus | grep rate_limit
```

If you are using the Istio Prometheus addon, it is already configured to scrape these metrics. For a custom Prometheus setup, make sure your scrape config includes the istio-proxy endpoints:

```yaml
scrape_configs:
- job_name: 'envoy-stats'
  metrics_path: /stats/prometheus
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_container_name]
    action: keep
    regex: istio-proxy
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    target_label: __address__
    regex: (.+)
    replacement: ${1}:15020
```

## Key Prometheus Queries

Here are the Prometheus queries you need for rate limiting visibility:

### Rate of Rate-Limited Requests

```promql
sum(rate(envoy_http_local_rate_limit_rate_limited{pod=~"my-service.*"}[5m]))
```

### Percentage of Requests Being Rate Limited

```promql
sum(rate(envoy_http_local_rate_limit_rate_limited[5m]))
/
sum(rate(envoy_http_local_rate_limit_enabled[5m]))
* 100
```

### Global Rate Limit Service Error Rate

```promql
sum(rate(envoy_ratelimit_error[5m]))
/
(sum(rate(envoy_ratelimit_ok[5m])) + sum(rate(envoy_ratelimit_over_limit[5m])) + sum(rate(envoy_ratelimit_error[5m])))
* 100
```

### Rate Limit Decisions Over Time

```promql
sum by (response_code) (rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local", response_code=~"429|200"}[5m]))
```

## Setting Up Grafana Dashboards

Create a Grafana dashboard that shows rate limiting at a glance. Here is a JSON dashboard definition for the key panels:

```json
{
  "panels": [
    {
      "title": "Rate Limited Requests per Second",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(envoy_http_local_rate_limit_rate_limited[1m])) by (pod)",
          "legendFormat": "{{pod}}"
        }
      ]
    },
    {
      "title": "Rate Limit Percentage",
      "type": "gauge",
      "targets": [
        {
          "expr": "sum(rate(envoy_http_local_rate_limit_rate_limited[5m])) / sum(rate(envoy_http_local_rate_limit_enabled[5m])) * 100"
        }
      ]
    },
    {
      "title": "429 Responses Over Time",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(istio_requests_total{response_code=\"429\"}[5m])) by (destination_service)",
          "legendFormat": "{{destination_service}}"
        }
      ]
    }
  ]
}
```

Import this into Grafana or build the panels manually using the Grafana UI.

## Monitoring the Rate Limit Service

The Envoy rate limit service itself exposes metrics. If you deployed it with stats enabled, you can scrape it:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ratelimit
  namespace: rate-limit
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "6070"
    prometheus.io/path: /metrics
spec:
  selector:
    app: ratelimit
  ports:
  - name: grpc
    port: 8081
  - name: http
    port: 8080
  - name: debug
    port: 6070
```

The debug port (6070) exposes runtime stats including:

- Total rate limit requests handled
- Latency of Redis operations
- Error counts per domain and descriptor

## Redis Monitoring

Redis health directly impacts rate limiting reliability. Monitor these Redis metrics:

```bash
kubectl exec -n rate-limit deploy/redis -- redis-cli info stats | grep -E "instantaneous_ops|keyspace_hits|keyspace_misses|used_memory"
```

Key things to watch:

- `instantaneous_ops_per_sec` - how many operations Redis is handling
- `keyspace_hits` vs `keyspace_misses` - cache efficiency
- `used_memory` - should stay below your configured maxmemory

For Prometheus-based Redis monitoring, use a Redis exporter:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: rate-limit
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9121"
    spec:
      containers:
      - name: exporter
        image: oliver006/redis_exporter:latest
        ports:
        - containerPort: 9121
        env:
        - name: REDIS_ADDR
          value: redis.rate-limit.svc.cluster.local:6379
```

## Alerting on Rate Limiting Issues

Set up Prometheus alerts for critical rate limiting conditions:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rate-limit-alerts
  namespace: monitoring
spec:
  groups:
  - name: rate-limiting
    rules:
    - alert: HighRateLimitPercentage
      expr: |
        sum(rate(istio_requests_total{response_code="429"}[5m]))
        /
        sum(rate(istio_requests_total[5m]))
        > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "More than 10% of requests are being rate limited"
    - alert: RateLimitServiceDown
      expr: |
        sum(rate(envoy_ratelimit_error[5m])) > 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Rate limit service is returning errors"
    - alert: RedisHighMemory
      expr: |
        redis_memory_used_bytes / redis_memory_max_bytes > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Redis is using more than 90% of its configured memory"
```

## Debugging Rate Limit Issues

When something seems off, use these debugging steps:

Check if the rate limit filter is active:

```bash
istioctl proxy-config listener deploy/my-service --port 15006 -o json | grep -A 10 "local_ratelimit"
```

Verify descriptor values being sent:

```bash
kubectl exec deploy/istio-ingressgateway -n istio-system -c istio-proxy -- curl -s localhost:15000/config_dump | grep -A 20 "rate_limits"
```

Check rate limit service logs for decision details:

```bash
kubectl logs -n rate-limit deploy/ratelimit --tail=100 | grep "over_limit\|error"
```

## Summary

Monitoring rate limiting in Istio involves three layers: Envoy proxy statistics (local and global rate limit counters), the rate limit service metrics (if using global limiting), and Redis health metrics. Use Prometheus to scrape all three and build Grafana dashboards that show the percentage of rate-limited requests, error rates, and trends over time. Set up alerts for high rate-limiting percentages and rate limit service failures. This observability lets you tune limits confidently and catch issues before they impact users.
