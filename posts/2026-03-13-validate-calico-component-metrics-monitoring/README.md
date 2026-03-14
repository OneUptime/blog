# How to Validate Calico Component Metrics Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Metrics, Prometheus, Validation

Description: Validate that Calico component metrics are correctly flowing into Prometheus, alert rules are working, and all expected metric families are present.

---

## Introduction

Validating Calico metrics monitoring means confirming not just that Prometheus has targets configured, but that actual metric data is flowing and covers the expected metric families. A commonly missed validation step is confirming that metrics from ALL nodes are present — if a ServiceMonitor has a selector that misses some pods, you'll have partial data without obvious errors.

## Prerequisites

- Calico metrics enabled and ServiceMonitors configured
- Prometheus running and accessible

## Validation Script

```bash
#!/bin/bash
# validate-calico-metrics-monitoring.sh
PROMETHEUS_URL="${1:-http://localhost:9090}"
FAILURES=0

query() {
  curl -s "${PROMETHEUS_URL}/api/v1/query?query=${1}" | \
    jq -r '.data.result | length'
}

echo "=== Calico Metrics Validation ==="

# 1. Felix metrics
echo ""
echo "--- Felix Metrics ---"
FELIX_NODES=$(query "count(felix_active_local_policies) by (node)")
TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)

echo "Felix metrics from ${FELIX_NODES}/${TOTAL_NODES} nodes"
[[ "${FELIX_NODES}" -eq "${TOTAL_NODES}" ]] || \
  { echo "FAIL: Missing Felix metrics from some nodes"; FAILURES=$((FAILURES + 1)); }

# 2. Key Felix metrics present
for metric in felix_active_local_policies felix_ipsets_total felix_iptables_rules \
              felix_int_dataplane_apply_time_seconds_count; do
  count=$(query "${metric}")
  if [[ "${count}" -gt 0 ]]; then
    echo "OK:   ${metric} present (${count} series)"
  else
    echo "FAIL: ${metric} missing"
    FAILURES=$((FAILURES + 1))
  fi
done

# 3. Typha metrics
echo ""
echo "--- Typha Metrics ---"
TYPHA_COUNT=$(query "typha_connections_total")
if [[ "${TYPHA_COUNT}" -gt 0 ]]; then
  echo "OK:   Typha metrics present"
else
  echo "WARN: No Typha metrics (normal if Typha is not deployed)"
fi

# 4. kube-controllers metrics
echo ""
echo "--- kube-controllers Metrics ---"
KC_COUNT=$(query "calico_kube_controllers_reconcile_duration_seconds_count")
if [[ "${KC_COUNT}" -gt 0 ]]; then
  echo "OK:   kube-controllers metrics present"
else
  echo "FAIL: kube-controllers metrics missing"
  FAILURES=$((FAILURES + 1))
fi

echo ""
echo "=== Validation Complete: ${FAILURES} failure(s) ==="
exit ${FAILURES}
```

## Validate Alert Rules Work

```bash
# Manually trigger a test alert to verify alert routing
# Create a test PrometheusRule that always fires
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-alert-test
  namespace: monitoring
  labels:
    app: kube-prometheus-stack
spec:
  groups:
    - name: calico.test
      rules:
        - alert: CalicoMetricsTestAlert
          expr: vector(1)
          for: 0m
          labels:
            severity: info
          annotations:
            summary: "Test alert - delete this after verification"
EOF

sleep 30

# Verify the alert fired
curl -s http://localhost:9090/api/v1/alerts | \
  jq '.data.alerts[] | select(.labels.alertname == "CalicoMetricsTestAlert")'

# Cleanup
kubectl delete prometheusrule calico-alert-test -n monitoring
```

## Metrics Coverage Matrix

| Component | Expected Metrics | Min Series Count |
|-----------|-----------------|------------------|
| Felix | felix_active_local_policies | = node count |
| Felix | felix_ipsets_total | = node count |
| Felix | felix_int_dataplane_apply_time_seconds | = node count |
| Typha | typha_connections_total | 1 (if deployed) |
| Typha | typha_ping_latency_seconds | 1 (if deployed) |
| kube-controllers | calico_kube_controllers_reconcile_duration_seconds | 1+ |

## Conclusion

Validating Calico metrics monitoring requires checking that metrics from ALL nodes are present (not just that targets exist), that key metric families are populated, and that alert rules are correctly routed to your notification systems. The validation script provides a binary pass/fail result suitable for CI/CD integration. Run it after every cluster provisioning, after Calico upgrades, and after changes to the monitoring stack to confirm observability coverage is maintained.
