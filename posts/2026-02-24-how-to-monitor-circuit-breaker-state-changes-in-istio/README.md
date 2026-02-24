# How to Monitor Circuit Breaker State Changes in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Circuit Breaker, Outlier Detection, Monitoring, Envoy

Description: How to monitor and alert on circuit breaker activations and state transitions in Istio using Envoy metrics and Prometheus.

---

Circuit breakers in Istio prevent cascading failures by stopping traffic to unhealthy endpoints. When they trigger, they are doing their job - but you still need to know about it. A circuit breaker opening means something is wrong with your upstream service, and if you are not monitoring for it, you are flying blind.

## How Circuit Breakers Work in Istio

Istio implements circuit breaking through two mechanisms:

1. **Connection pool limits** - Hard caps on connections and pending requests (covered by DestinationRule connectionPool settings)
2. **Outlier detection** - Actively ejects unhealthy hosts from the load balancing pool

Outlier detection is the more interesting one for monitoring because it dynamically changes which endpoints receive traffic. Here is a typical configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-circuit-breaker
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
```

With this config, if an endpoint returns 5 consecutive 5xx errors within 10 seconds, it gets ejected from the pool for at least 30 seconds. No more than 50% of endpoints can be ejected at once.

## Key Metrics for Circuit Breaker Monitoring

### Outlier Detection Metrics

```promql
# Number of times a host was ejected
envoy_cluster_outlier_detection_ejections_total

# Number of currently ejected hosts
envoy_cluster_outlier_detection_ejections_active

# Ejections due to consecutive 5xx errors
envoy_cluster_outlier_detection_ejections_enforced_consecutive_5xx

# Ejections due to consecutive gateway errors
envoy_cluster_outlier_detection_ejections_enforced_consecutive_gateway_failure

# Ejection overflow (when max ejection percent is reached)
envoy_cluster_outlier_detection_ejections_overflow

# Ejections that were detected but not enforced (informational mode)
envoy_cluster_outlier_detection_ejections_detected_consecutive_5xx
```

### Connection Pool Circuit Breaker Metrics

```promql
# Connection limit circuit breaker tripped
envoy_cluster_upstream_cx_overflow

# Pending request limit circuit breaker tripped
envoy_cluster_upstream_rq_pending_overflow

# Active circuit breaker state
envoy_cluster_circuit_breakers_default_cx_open
envoy_cluster_circuit_breakers_default_rq_open
envoy_cluster_circuit_breakers_default_rq_pending_open
```

## Checking Circuit Breaker State from CLI

Quick inspection of circuit breaker status:

```bash
# Check outlier detection stats
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET stats | grep "outlier_detection"

# Check specific upstream cluster
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET stats | grep "outbound|8080||my-service" | grep "outlier"

# View cluster health info
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET clusters | grep "my-service"
```

The `clusters` endpoint shows you which hosts are healthy and which are ejected:

```bash
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET "clusters?format=json" | jq '.cluster_statuses[] | select(.name | contains("my-service")) | .host_statuses[] | {address: .address, health: .health_status}'
```

## Setting Up Prometheus Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-circuit-breaker-alerts
  namespace: istio-system
spec:
  groups:
  - name: istio-circuit-breakers
    rules:
    - alert: IstioCircuitBreakerEjection
      expr: |
        rate(envoy_cluster_outlier_detection_ejections_total[5m]) > 0
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "Circuit breaker ejections on {{ $labels.pod }}"
        description: "Hosts are being ejected from cluster {{ $labels.cluster_name }} at {{ $value }} ejections/sec"
    - alert: IstioHighEjectionCount
      expr: |
        envoy_cluster_outlier_detection_ejections_active > 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Multiple hosts ejected from {{ $labels.cluster_name }}"
        description: "{{ $value }} hosts are currently ejected from the load balancing pool for {{ $labels.cluster_name }}"
    - alert: IstioEjectionOverflow
      expr: |
        rate(envoy_cluster_outlier_detection_ejections_overflow[5m]) > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Circuit breaker ejection overflow on {{ $labels.cluster_name }}"
        description: "Max ejection percent reached. More hosts need ejecting but cannot be. Service stability is at risk."
    - alert: IstioAllHostsEjected
      expr: |
        envoy_cluster_outlier_detection_ejections_active
        ==
        envoy_cluster_membership_total
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "All hosts ejected from {{ $labels.cluster_name }}"
        description: "Every endpoint has been ejected. All requests will fail."
    - alert: IstioConnectionCircuitBreakerOpen
      expr: |
        envoy_cluster_circuit_breakers_default_cx_open > 0
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Connection circuit breaker open for {{ $labels.cluster_name }}"
```

## Building a Circuit Breaker Dashboard

```json
{
  "dashboard": {
    "title": "Istio Circuit Breaker Status",
    "panels": [
      {
        "title": "Active Ejections by Cluster",
        "type": "timeseries",
        "targets": [{
          "expr": "envoy_cluster_outlier_detection_ejections_active",
          "legendFormat": "{{ cluster_name }}"
        }]
      },
      {
        "title": "Ejection Rate",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(rate(envoy_cluster_outlier_detection_ejections_total[5m])) by (cluster_name)",
          "legendFormat": "{{ cluster_name }}"
        }]
      },
      {
        "title": "Healthy vs Ejected Hosts",
        "type": "bargauge",
        "targets": [
          {
            "expr": "envoy_cluster_membership_healthy",
            "legendFormat": "Healthy - {{ cluster_name }}"
          },
          {
            "expr": "envoy_cluster_outlier_detection_ejections_active",
            "legendFormat": "Ejected - {{ cluster_name }}"
          }
        ]
      },
      {
        "title": "Connection Overflow Events",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(rate(envoy_cluster_upstream_cx_overflow[5m])) by (cluster_name)",
          "legendFormat": "{{ cluster_name }}"
        }]
      },
      {
        "title": "Cluster Membership",
        "type": "stat",
        "targets": [{
          "expr": "envoy_cluster_membership_total",
          "legendFormat": "{{ cluster_name }}"
        }]
      }
    ]
  }
}
```

## Understanding Ejection Behavior

When Envoy ejects a host, the ejection time increases exponentially with repeated ejections. The first ejection lasts `baseEjectionTime`, the second lasts `2 * baseEjectionTime`, and so on. This means a repeatedly failing host stays ejected longer each time.

You can observe this pattern in the metrics:

```promql
# Total ejections over time (cumulative)
envoy_cluster_outlier_detection_ejections_total

# How many are active right now
envoy_cluster_outlier_detection_ejections_active
```

If ejections_total keeps climbing but ejections_active is low, hosts are being ejected and then recovering. If ejections_active stays high, hosts are staying ejected because they keep failing when readmitted.

## Testing Circuit Breakers

Verify your circuit breaker configuration is working with a load test:

```bash
# Deploy a test app that can return errors
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fault-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fault-service
  template:
    metadata:
      labels:
        app: fault-service
    spec:
      containers:
      - name: httpbin
        image: kennethreitz/httpbin
        ports:
        - containerPort: 80
EOF
```

Then apply a DestinationRule with outlier detection and generate traffic that includes errors. Watch the ejection metrics in real time:

```bash
watch -n 1 "kubectl exec deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep outlier"
```

## Correlating Ejections with Service Health

Circuit breaker events should be viewed alongside the health of the service they protect:

```promql
# Plot together:
# 1. Service error rate
sum(rate(istio_requests_total{response_code=~"5.*",destination_service="my-service.default.svc.cluster.local"}[1m]))

# 2. Ejection events
rate(envoy_cluster_outlier_detection_ejections_total{cluster_name=~".*my-service.*"}[1m])

# 3. Service request rate (should drop as hosts are ejected)
sum(rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local"}[1m]))
```

You should see error rates rise first, then ejections kick in, and then error rates drop as unhealthy hosts are removed. If error rates stay high after ejection, the problem might be affecting all hosts or the ejection thresholds need adjustment.

Circuit breaker monitoring is essential for understanding how your mesh is protecting itself. When these metrics light up, treat it as an early warning signal and go investigate the root cause on the upstream service.
