# How to Monitor Application Health During Dapr Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Upgrade, Prometheus, Observability

Description: Learn how to monitor application health metrics and Dapr sidecar behavior during version upgrades to detect issues early and make informed rollback decisions.

---

## Why Health Monitoring Matters During Upgrades

Even with careful planning, Dapr upgrades can introduce subtle issues that only manifest under real traffic. Real-time health monitoring during upgrades provides the data needed to decide whether to proceed, pause, or rollback. The key metrics to watch are error rates, latency, circuit breaker state, and pod restart counts.

## Pre-Upgrade Metric Baselines

Capture baseline metrics before starting the upgrade:

```bash
#!/bin/bash
# capture-baseline.sh

PROMETHEUS_URL="http://prometheus.monitoring:9090"

echo "=== Pre-Upgrade Metric Baseline - $(date) ===" > baseline-metrics.txt

# Dapr service invocation error rate
curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(dapr_http_server_request_count{status!=\"200\"}[5m])" \
  | jq '.data.result[] | {metric: .metric, value: .value[1]}' >> baseline-metrics.txt

# State store operation latency (p99)
curl -s "$PROMETHEUS_URL/api/v1/query?query=histogram_quantile(0.99,rate(dapr_component_state_latencies_bucket[5m]))" \
  | jq '.data.result[] | {metric: .metric, p99: .value[1]}' >> baseline-metrics.txt

# Pub/sub message failure rate
curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(dapr_component_pubsub_ingress_count{status!=\"success\"}[5m])" \
  | jq '.data.result[] | {metric: .metric, failures: .value[1]}' >> baseline-metrics.txt

echo "Baseline captured to baseline-metrics.txt"
```

## Prometheus Alert Rules for Upgrade Monitoring

Deploy temporary alert rules during the upgrade window:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-upgrade-monitor
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
spec:
  groups:
  - name: dapr.upgrade
    interval: 15s
    rules:
    - alert: DaprUpgradeHighErrorRate
      expr: |
        rate(dapr_http_server_request_count{status!~"2.."}[2m]) /
        rate(dapr_http_server_request_count[2m]) > 0.05
      for: 2m
      labels:
        severity: critical
        context: upgrade
      annotations:
        summary: "Error rate > 5% during Dapr upgrade"
        description: "{{ $value | humanizePercentage }} error rate on {{ $labels.app_id }}"

    - alert: DaprUpgradeCrashLoop
      expr: increase(kube_pod_container_status_restarts_total{container="daprd"}[5m]) > 2
      for: 0m
      labels:
        severity: critical
        context: upgrade
      annotations:
        summary: "Dapr sidecar crash looping during upgrade"
        description: "Pod {{ $labels.pod }} sidecar is crash looping"

    - alert: DaprUpgradeHighLatency
      expr: |
        histogram_quantile(0.99, rate(dapr_http_server_latency_bucket[2m])) > 500
      for: 3m
      labels:
        severity: warning
        context: upgrade
      annotations:
        summary: "p99 latency > 500ms during Dapr upgrade"
```

## Live Monitoring Script

Run this script in a terminal during the upgrade to get real-time health status:

```bash
#!/bin/bash
# live-upgrade-monitor.sh

NAMESPACE="production"
PROMETHEUS_URL="http://localhost:9090"
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
sleep 2

echo "Monitoring Dapr upgrade... (Ctrl+C to stop)"
echo ""

while true; do
    clear
    echo "=== Dapr Upgrade Health Monitor - $(date) ==="
    echo ""

    echo "--- Pod Status ---"
    kubectl get pods -n "$NAMESPACE" \
      --sort-by='.metadata.creationTimestamp' | tail -10

    echo ""
    echo "--- Dapr Sidecar Restarts (last 5m) ---"
    kubectl get events -n "$NAMESPACE" \
      --field-selector reason=BackOff \
      --sort-by='.metadata.creationTimestamp' | tail -5

    echo ""
    echo "--- Error Rate ---"
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=rate(dapr_http_server_request_count{namespace=\"${NAMESPACE}\",status!=\"200\"}[2m])" \
      | jq -r '.data.result[] | "\(.metric.app_id): \(.value[1])"' 2>/dev/null || echo "Prometheus unavailable"

    sleep 15
done
```

## Upgrade Go/No-Go Decision Criteria

Define clear criteria for proceeding vs. rolling back:

```bash
#!/bin/bash
# upgrade-health-check.sh

NAMESPACE="production"
PROMETHEUS_URL="http://prometheus.monitoring:9090"
ROLLBACK=false

# Check error rate threshold (>1% = rollback)
ERROR_RATE=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(dapr_http_server_request_count{namespace=\"$NAMESPACE\",status!=\"200\"}[5m])/rate(dapr_http_server_request_count{namespace=\"$NAMESPACE\"}[5m])" \
  | jq -r '.data.result[0].value[1] // "0"')

if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "ROLLBACK: Error rate $ERROR_RATE exceeds 1% threshold"
  ROLLBACK=true
fi

# Check for crash loops
CRASH_LOOPS=$(kubectl get pods -n "$NAMESPACE" \
  | grep -c CrashLoopBackOff || true)
if [ "$CRASH_LOOPS" -gt 0 ]; then
  echo "ROLLBACK: $CRASH_LOOPS pods in CrashLoopBackOff"
  ROLLBACK=true
fi

if $ROLLBACK; then
  echo "Initiating automatic rollback..."
  helm rollback dapr -n dapr-system --wait
else
  echo "PROCEED: Health checks passed"
fi
```

## Summary

Monitoring application health during Dapr upgrades requires capturing pre-upgrade metric baselines, deploying temporary Prometheus alert rules with tight thresholds for the upgrade window, and running a live monitoring script that watches pod status, restart counts, and error rates in real time. Define clear go/no-go decision criteria (error rate, crash loop count, latency thresholds) before starting the upgrade, and automate rollback when these thresholds are breached. Remove the upgrade-specific alert rules after the upgrade window closes.
