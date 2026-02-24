# How to Monitor Connection Pool Exhaustion in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Connection Pool, DestinationRule, Monitoring, Envoy

Description: How to detect and monitor connection pool exhaustion in Istio, including key metrics, alerting rules, and tuning strategies.

---

Connection pool exhaustion is one of those problems that looks like random failures from the outside. Requests start getting 503 errors, but the destination service seems perfectly healthy. The issue is that the Envoy proxy has run out of connections in its pool and is rejecting new requests before they even reach the upstream service. Knowing how to monitor for this saves a lot of debugging headaches.

## How Connection Pools Work in Istio

Every outbound connection from an Envoy proxy goes through a connection pool. Istio lets you configure these pools through DestinationRule resources:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-pool
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 30ms
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
        maxRetries: 3
```

When any of these limits are reached, new requests get a 503 response with an `UO` (upstream overflow) flag in the Envoy access logs.

## Key Metrics for Connection Pool Monitoring

Envoy exposes detailed connection pool statistics for every upstream cluster:

### Overflow Metrics

```promql
# Number of times the connection pool overflowed
envoy_cluster_upstream_cx_overflow

# Requests that were pending and got rejected
envoy_cluster_upstream_rq_pending_overflow

# Total number of pending requests
envoy_cluster_upstream_rq_pending_total
```

### Active Connection Metrics

```promql
# Current active connections per upstream cluster
envoy_cluster_upstream_cx_active

# Maximum observed active connections
envoy_cluster_upstream_cx_max

# Total connections created
envoy_cluster_upstream_cx_total
```

### Request Queue Metrics

```promql
# Currently pending requests (waiting for a connection)
envoy_cluster_upstream_rq_pending_active

# Active requests on established connections
envoy_cluster_upstream_rq_active

# Requests that timed out while pending
envoy_cluster_upstream_rq_pending_failure_eject
```

## Checking Connection Pool Stats from the CLI

For a quick look at any pod's connection pool status:

```bash
# Get all upstream connection stats
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_cx"

# Look specifically at overflow events
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET stats | grep "overflow"

# Check pending requests
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET stats | grep "pending"
```

For a specific upstream cluster:

```bash
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET stats | grep "outbound|8080||my-service.default.svc.cluster.local"
```

## Setting Up Prometheus Alerts

Here are the alert rules you need:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-connection-pool-alerts
  namespace: istio-system
spec:
  groups:
  - name: istio-connection-pools
    rules:
    - alert: IstioConnectionPoolOverflow
      expr: |
        rate(envoy_cluster_upstream_cx_overflow[5m]) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Connection pool overflow on {{ $labels.pod }}"
        description: "{{ $labels.pod }} is experiencing connection pool overflow to cluster {{ $labels.cluster_name }} at {{ $value }} overflows/sec"
    - alert: IstioPendingRequestOverflow
      expr: |
        rate(envoy_cluster_upstream_rq_pending_overflow[5m]) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pending request overflow on {{ $labels.pod }}"
        description: "Requests to {{ $labels.cluster_name }} are being rejected due to pending queue being full"
    - alert: IstioHighPendingRequests
      expr: |
        envoy_cluster_upstream_rq_pending_active > 50
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High number of pending requests on {{ $labels.pod }}"
        description: "{{ $value }} requests are waiting for a connection to {{ $labels.cluster_name }}"
    - alert: IstioConnectionPoolNearLimit
      expr: |
        envoy_cluster_upstream_cx_active
        /
        envoy_cluster_circuit_breakers_default_cx_open * 0 + 100
        > 0.80
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Connection pool nearing capacity on {{ $labels.pod }}"
```

## Detecting Overflow in Access Logs

When connection pool exhaustion happens, Envoy logs it with specific response flags. Look for the `UO` flag:

```bash
kubectl logs deploy/my-app -c istio-proxy | grep "UO"
```

A typical overflow log entry looks like:

```
[2024-01-15T10:30:45.123Z] "GET /api/data HTTP/1.1" 503 UO upstream_reset_before_response_started{overflow} - "-" 0 81 0 - "10.0.0.5" "curl/7.68.0" "abc-123" "my-service:8080" "-" - - 10.0.0.10:8080 10.0.0.5:45678 - -
```

The `UO` flag tells you this 503 was caused by upstream overflow, not by the destination service actually failing.

## Building a Connection Pool Dashboard

```json
{
  "dashboard": {
    "title": "Istio Connection Pool Health",
    "panels": [
      {
        "title": "Connection Pool Overflow Rate",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(rate(envoy_cluster_upstream_cx_overflow[5m])) by (pod, cluster_name)",
          "legendFormat": "{{ pod }} -> {{ cluster_name }}"
        }]
      },
      {
        "title": "Active Connections by Cluster",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(envoy_cluster_upstream_cx_active) by (cluster_name)",
          "legendFormat": "{{ cluster_name }}"
        }]
      },
      {
        "title": "Pending Requests",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(envoy_cluster_upstream_rq_pending_active) by (pod, cluster_name)",
          "legendFormat": "{{ pod }} -> {{ cluster_name }}"
        }]
      },
      {
        "title": "Pending Request Overflow Rate",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(rate(envoy_cluster_upstream_rq_pending_overflow[5m])) by (pod, cluster_name)",
          "legendFormat": "{{ pod }} -> {{ cluster_name }}"
        }]
      },
      {
        "title": "Connection Creation Rate",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(rate(envoy_cluster_upstream_cx_total[5m])) by (cluster_name)",
          "legendFormat": "{{ cluster_name }}"
        }]
      }
    ]
  }
}
```

## Tuning Connection Pools

When you detect exhaustion, you have two options: increase the pool limits or reduce the demand.

### Increasing Limits

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: increased-pool
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        http1MaxPendingRequests: 500
        http2MaxRequests: 5000
        maxRequestsPerConnection: 0
```

Setting `maxRequestsPerConnection` to 0 means unlimited requests per connection, which reduces connection churn.

### Using HTTP/2

HTTP/2 multiplexes many requests over a single connection, dramatically reducing the number of connections needed:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: h2-pool
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
```

### Reducing Retries

If retries are amplifying the load:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reduce-retries
  namespace: default
spec:
  hosts:
  - my-service
  http:
  - retries:
      attempts: 1
      retryOn: 5xx
    route:
    - destination:
        host: my-service
```

## Correlating Pool Exhaustion with Service Health

Connection pool exhaustion often correlates with downstream service problems. When a service slows down, connections stay open longer, the pool fills up, and new requests get rejected. Monitor the correlation:

```promql
# Plot these together to see the correlation
# 1. Connection pool active connections
envoy_cluster_upstream_cx_active{cluster_name=~"outbound.*my-service.*"}

# 2. Destination service latency
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="my-service.default.svc.cluster.local"}[5m])) by (le))

# 3. Overflow events
rate(envoy_cluster_upstream_cx_overflow{cluster_name=~"outbound.*my-service.*"}[5m])
```

When you see latency spike, connections climb, and overflow events appear at the same time, the root cause is usually the destination service being slow rather than the connection pool being too small.

Connection pool monitoring gives you early warning of capacity issues and helps you right-size your mesh configuration. Make it part of your standard monitoring setup and you will be able to tune connection pools based on actual data rather than guessing.
