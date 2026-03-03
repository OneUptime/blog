# How to Monitor Rate Limiting Effectiveness in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Monitoring, Prometheus, Grafana, Observability

Description: How to set up monitoring and dashboards to measure whether your Istio rate limiting configuration is working correctly and effectively.

---

Setting up rate limiting is only half the battle. You also need to verify that it is actually working, that the limits are appropriate for your traffic patterns, and that legitimate users are not getting caught by overly aggressive rules. Monitoring rate limiting effectiveness requires tracking several dimensions: how many requests are being limited, who is being affected, and whether the limits are actually protecting your services.

## Key Questions Your Monitoring Should Answer

Before setting up dashboards, think about what you need to know:

1. How many requests are being rate limited right now?
2. What percentage of total traffic is being rejected?
3. Are specific users or IPs being disproportionately affected?
4. Is the rate limit service itself healthy and responsive?
5. Are the limits actually preventing service degradation?

## Envoy Rate Limit Metrics

Envoy exposes rate limit stats that are automatically scraped by Prometheus if you have standard Istio monitoring set up. Check what is available:

```bash
kubectl exec my-service-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ratelimit
```

For global rate limiting, you will see metrics like:

```text
cluster.rate_limit_cluster.upstream_rq_total: 5000
cluster.rate_limit_cluster.upstream_rq_200: 4900
cluster.rate_limit_cluster.upstream_rq_timeout: 5
ratelimit.my-domain.over_limit: 150
ratelimit.my-domain.ok: 4850
ratelimit.my-domain.error: 0
ratelimit.my-domain.failure_mode_allowed: 0
```

For local rate limiting:

```text
http_local_rate_limiter.http_local_rate_limit.enabled: 5000
http_local_rate_limiter.http_local_rate_limit.enforced: 5000
http_local_rate_limiter.http_local_rate_limit.ok: 4850
http_local_rate_limiter.http_local_rate_limit.rate_limited: 150
```

## Prometheus Queries for Rate Limit Monitoring

Here are the essential Prometheus queries you need:

### Rate Limited Request Percentage

```promql
# Percentage of requests being rate limited (using Istio standard metrics)
sum(rate(istio_requests_total{response_code="429", destination_service_name="my-service"}[5m]))
/
sum(rate(istio_requests_total{destination_service_name="my-service"}[5m]))
* 100
```

### Rate Limited Requests Over Time

```promql
# Rate of 429 responses per second
sum(rate(istio_requests_total{response_code="429", destination_service_name="my-service"}[5m]))
```

### Rate Limit Service Health

```promql
# Rate limit service response time
histogram_quantile(0.99,
  sum(rate(envoy_cluster_upstream_rq_time_bucket{cluster_name="rate_limit_cluster"}[5m])) by (le)
)

# Rate limit service error rate
sum(rate(envoy_cluster_upstream_rq_xx{cluster_name="rate_limit_cluster", envoy_response_code_class="5"}[5m]))
```

### Rate Limit Failures (requests allowed due to rate limit service being down)

```promql
sum(rate(ratelimit_failure_mode_allowed_total[5m]))
```

## Building a Grafana Dashboard

Create a comprehensive rate limiting dashboard with these panels:

### Panel 1: Rate Limited Traffic Overview

```json
{
  "title": "Rate Limited Requests (429s)",
  "targets": [
    {
      "expr": "sum(rate(istio_requests_total{response_code=\"429\", destination_service_name=\"my-service\"}[5m]))",
      "legendFormat": "Rate Limited"
    },
    {
      "expr": "sum(rate(istio_requests_total{response_code!=\"429\", destination_service_name=\"my-service\"}[5m]))",
      "legendFormat": "Allowed"
    }
  ],
  "type": "timeseries"
}
```

### Panel 2: Rate Limit Percentage

```json
{
  "title": "Percentage of Requests Rate Limited",
  "targets": [
    {
      "expr": "sum(rate(istio_requests_total{response_code=\"429\", destination_service_name=\"my-service\"}[5m])) / sum(rate(istio_requests_total{destination_service_name=\"my-service\"}[5m])) * 100",
      "legendFormat": "% Rate Limited"
    }
  ],
  "type": "gauge",
  "thresholds": [
    {"value": 0, "color": "green"},
    {"value": 5, "color": "yellow"},
    {"value": 20, "color": "red"}
  ]
}
```

### Panel 3: Rate Limit Service Latency

```json
{
  "title": "Rate Limit Service Response Time",
  "targets": [
    {
      "expr": "histogram_quantile(0.50, sum(rate(envoy_cluster_upstream_rq_time_bucket{cluster_name=\"rate_limit_cluster\"}[5m])) by (le))",
      "legendFormat": "p50"
    },
    {
      "expr": "histogram_quantile(0.99, sum(rate(envoy_cluster_upstream_rq_time_bucket{cluster_name=\"rate_limit_cluster\"}[5m])) by (le))",
      "legendFormat": "p99"
    }
  ],
  "type": "timeseries"
}
```

## Setting Up Alerts

Configure alerts for rate limiting anomalies:

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
    # Alert when too many requests are being rate limited
    - alert: HighRateLimitPercentage
      expr: |
        (
          sum(rate(istio_requests_total{response_code="429", destination_service_name="my-service"}[5m]))
          /
          sum(rate(istio_requests_total{destination_service_name="my-service"}[5m]))
        ) > 0.20
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "More than 20% of requests to my-service are being rate limited"
        description: "{{ $value | humanizePercentage }} of requests are returning 429"

    # Alert when rate limit service is slow
    - alert: RateLimitServiceSlow
      expr: |
        histogram_quantile(0.99,
          sum(rate(envoy_cluster_upstream_rq_time_bucket{
            cluster_name="rate_limit_cluster"
          }[5m])) by (le)
        ) > 100
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Rate limit service p99 latency exceeds 100ms"

    # Alert when rate limit service is unreachable
    - alert: RateLimitServiceDown
      expr: |
        sum(rate(envoy_cluster_upstream_rq_xx{
          cluster_name="rate_limit_cluster",
          envoy_response_code_class="5"
        }[5m])) > 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Rate limit service is returning errors"

    # Alert when failure mode is allowing requests through
    - alert: RateLimitFailureMode
      expr: |
        sum(rate(ratelimit_failure_mode_allowed_total[5m])) > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Requests are being allowed through rate limit failure mode"
```

## Correlating Rate Limits with Service Health

The whole point of rate limiting is to protect your services. Your monitoring should show whether rate limiting is actually helping:

```promql
# Service error rate (should decrease when rate limiting kicks in)
sum(rate(istio_requests_total{
  response_code=~"5.*",
  destination_service_name="my-service"
}[5m]))
/
sum(rate(istio_requests_total{
  destination_service_name="my-service"
}[5m]))

# Service latency (should stabilize when rate limiting kicks in)
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="destination"
  }[5m])) by (le)
)
```

Plot these alongside your rate limiting metrics. When rate limiting activates, you should see service error rates and latency stabilize or improve.

## Monitoring Redis Health (for Global Rate Limiting)

If you are using global rate limiting, Redis health directly impacts your rate limiting:

```bash
# Check Redis connectivity
kubectl exec -n rate-limit redis-pod -- redis-cli ping

# Check Redis memory usage
kubectl exec -n rate-limit redis-pod -- redis-cli info memory

# Count rate limit keys
kubectl exec -n rate-limit redis-pod -- redis-cli dbsize
```

Add Redis metrics to your monitoring:

```promql
# Redis memory usage
redis_memory_used_bytes

# Redis connected clients
redis_connected_clients

# Redis commands per second
rate(redis_commands_processed_total[5m])
```

## Log Analysis

Beyond metrics, check Envoy access logs for rate-limited requests:

```bash
kubectl logs my-service-pod -c istio-proxy | grep "429"
```

For structured log analysis, configure JSON access logs and ship them to your log aggregation system (Elasticsearch, Loki, etc.). Look for patterns:

- Which source IPs are getting rate limited most often?
- Which endpoints are hitting limits?
- What time of day do rate limits get triggered?

## Tuning Limits Based on Monitoring Data

Use your monitoring data to tune rate limits:

1. **If 0% of traffic is rate limited** - Your limits might be too high. They are not providing protection.
2. **If more than 10% is rate limited** - Your limits might be too low, or you have a real traffic problem that needs investigation.
3. **If rate limited traffic spikes at specific times** - You might need dynamic limits that adjust based on time of day.
4. **If the rate limit service adds more than 5ms of latency** - Consider scaling it up or switching to local rate limiting for latency-sensitive paths.

## Summary

Monitoring rate limiting effectiveness requires tracking both the rate limiting mechanism itself and its impact on service health. Use Prometheus to track 429 response rates, rate limit service health, and failure mode activations. Build Grafana dashboards that correlate rate limiting activity with service error rates and latency. Set up alerts for anomalous rate limiting patterns. And use the data to continuously tune your limits so they protect your services without blocking legitimate traffic.
