# How to Monitor Circuit Breaker Status in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Circuit Breaking, Monitoring, Prometheus, Kubernetes

Description: How to monitor circuit breaker activity in Istio using Envoy stats, Prometheus metrics, and Grafana dashboards to catch issues before they become outages.

---

Configuring circuit breakers in Istio is only half the job. If you are not monitoring them, you have no idea whether they are actually protecting your services or just sitting there doing nothing. Even worse, overly aggressive circuit breaker settings might be silently rejecting valid traffic. This guide covers how to get visibility into circuit breaker behavior using Envoy stats, Prometheus, and Grafana.

## Envoy Stats for Circuit Breaker Monitoring

Every Envoy sidecar exposes detailed statistics about circuit breaker activity. You can query these directly from the sidecar proxy.

### Connection Pool Overflow Stats

These metrics tell you when connection limits are being hit:

```bash
# Check all overflow-related stats
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "overflow"
```

Key metrics:

- `upstream_rq_pending_overflow` - Requests rejected because the pending queue was full
- `upstream_cx_overflow` - Connection attempts rejected because maxConnections was reached
- `upstream_rq_retry_overflow` - Retries rejected because the retry budget was exhausted

### Outlier Detection Stats

These metrics show ejection activity:

```bash
# Check outlier detection metrics
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "outlier"
```

Key metrics:

- `outlier_detection.ejections_active` - Number of currently ejected hosts
- `outlier_detection.ejections_total` - Total ejections over the lifetime of the proxy
- `outlier_detection.ejections_detected_consecutive_5xx` - Ejections triggered by consecutive 5xx errors
- `outlier_detection.ejections_enforced_total` - Ejections that were actually enforced (not just detected)
- `outlier_detection.ejections_overflow` - Ejections that were not enforced because maxEjectionPercent was reached

### Per-Host Health Status

Check the health of individual upstream instances:

```bash
# See all upstream hosts and their status
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/clusters | grep -E "health_flags|cx_active|rq_active"
```

The output shows each upstream host with its health flags. A healthy host has no flags. An ejected host shows `health_flags::/failed_outlier_check`.

## Setting Up Prometheus Monitoring

Istio exposes Envoy metrics to Prometheus automatically. The relevant metrics for circuit breaking are:

### Connection Pool Metrics

```yaml
# PromQL queries for connection pool monitoring

# Pending request overflow rate (circuit breaker trips)
rate(envoy_cluster_upstream_rq_pending_overflow{cluster_name="outbound|8080||my-service.default.svc.cluster.local"}[5m])

# Active connections to a service
envoy_cluster_upstream_cx_active{cluster_name="outbound|8080||my-service.default.svc.cluster.local"}

# Connection overflow rate
rate(envoy_cluster_upstream_cx_overflow{cluster_name="outbound|8080||my-service.default.svc.cluster.local"}[5m])
```

### Outlier Detection Metrics

```yaml
# Current ejections
envoy_cluster_outlier_detection_ejections_active{cluster_name="outbound|8080||my-service.default.svc.cluster.local"}

# Ejection rate
rate(envoy_cluster_outlier_detection_ejections_total{cluster_name="outbound|8080||my-service.default.svc.cluster.local"}[5m])
```

## Prometheus Alert Rules

Set up alerts to catch circuit breaker issues early:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-circuit-breaker-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-circuit-breaker
      rules:
        # Alert when requests are being rejected by circuit breaker
        - alert: CircuitBreakerOverflow
          expr: |
            sum(rate(envoy_cluster_upstream_rq_pending_overflow[5m])) by (cluster_name)
            > 0
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Circuit breaker rejecting requests for {{ $labels.cluster_name }}"
            description: "Requests are being rejected because connection pool limits are exceeded."

        # Alert when hosts are being ejected
        - alert: OutlierDetectionEjections
          expr: |
            sum(envoy_cluster_outlier_detection_ejections_active) by (cluster_name)
            > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Hosts ejected for {{ $labels.cluster_name }}"
            description: "One or more upstream hosts are ejected due to outlier detection."

        # Alert when too many hosts are ejected
        - alert: HighEjectionRate
          expr: |
            sum(envoy_cluster_outlier_detection_ejections_active) by (cluster_name)
            / sum(envoy_cluster_membership_total) by (cluster_name)
            > 0.3
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High ejection rate for {{ $labels.cluster_name }}"
            description: "More than 30% of hosts are ejected."
```

## Building a Grafana Dashboard

Create a Grafana dashboard to visualize circuit breaker status. Here are the panels you should include:

### Panel 1: Circuit Breaker Overflow Rate

```text
# PromQL
sum(rate(envoy_cluster_upstream_rq_pending_overflow[5m])) by (cluster_name)
```

This shows how often the circuit breaker is tripping. Any value above zero means requests are being rejected.

### Panel 2: Active Ejections

```text
# PromQL
sum(envoy_cluster_outlier_detection_ejections_active) by (cluster_name)
```

Shows the current number of ejected hosts per service. Spikes indicate health issues.

### Panel 3: Connection Utilization

```text
# PromQL
sum(envoy_cluster_upstream_cx_active) by (cluster_name)
```

Shows active connections. Compare this against your `maxConnections` limit to see how close you are to the ceiling.

### Panel 4: Ejection vs Membership

```text
# PromQL - Percentage of ejected hosts
sum(envoy_cluster_outlier_detection_ejections_active) by (cluster_name)
/ sum(envoy_cluster_membership_total) by (cluster_name) * 100
```

Shows the percentage of hosts currently ejected. This is the most useful metric for understanding the overall health impact.

## Quick Health Check Script

Here is a script that gives you a quick overview of circuit breaker status across your mesh:

```bash
#!/bin/bash
# circuit-breaker-status.sh

echo "=== Circuit Breaker Status ==="
echo ""

# Get all pods with istio-proxy
for pod in $(kubectl get pods -l security.istio.io/tlsMode=istio -o jsonpath='{.items[*].metadata.name}'); do
  overflow=$(kubectl exec $pod -c istio-proxy -- curl -s localhost:15000/stats 2>/dev/null | grep "upstream_rq_pending_overflow" | awk '{sum+=$2} END {print sum}')
  ejections=$(kubectl exec $pod -c istio-proxy -- curl -s localhost:15000/stats 2>/dev/null | grep "ejections_active" | awk '{sum+=$2} END {print sum}')

  if [ "$overflow" -gt 0 ] || [ "$ejections" -gt 0 ]; then
    echo "Pod: $pod"
    echo "  Pending Overflow: $overflow"
    echo "  Active Ejections: $ejections"
    echo ""
  fi
done

echo "=== Done ==="
```

Run it periodically or integrate it into your runbooks.

## What the Metrics Tell You

Here is how to interpret what you see:

**High `pending_overflow`, low `ejections_active`:** Your connection pool limits are too low for the traffic volume. Either increase `maxConnections` and `http1MaxPendingRequests`, or add more service replicas.

**Low `pending_overflow`, high `ejections_active`:** Your services have unhealthy instances. Check pod logs and Kubernetes events for the affected pods. The circuit breaker is doing its job by routing traffic away from broken pods.

**High `pending_overflow` AND high `ejections_active`:** Both connection limits and unhealthy instances are causing issues. This is typically during an incident - capacity is reduced due to ejections, causing the remaining instances to hit connection limits.

**Both at zero:** Your circuit breakers are configured but have not needed to activate. This is the happy path, but it also means they might be set too conservatively. Run a load test to verify they would actually trip when needed.

## Monitoring During Deployments

Rolling deployments temporarily reduce capacity as old pods terminate and new pods start. Monitor circuit breaker activity during deployments:

```bash
# Watch ejections during a deployment
watch -n 2 "kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats 2>/dev/null | \
  grep -E 'ejections_active|pending_overflow'"
```

If you see ejection spikes during every deployment, consider:
- Increasing `baseEjectionTime` so ejected pods stay out through the deployment
- Adding preStop hooks to drain connections gracefully
- Using PodDisruptionBudgets to control the pace of pod termination

Circuit breaker monitoring is not glamorous, but it is the difference between catching a problem when one pod starts failing and catching it when half your users are seeing errors. Set up the metrics, build the dashboards, configure the alerts, and check them regularly.
