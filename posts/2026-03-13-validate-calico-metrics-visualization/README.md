# How to Validate Calico Metrics Visualization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Metric, Grafana, Validation

Description: Validate that Calico Grafana dashboards are correctly displaying data, all panels are populated, and visualization accurately reflects cluster network state.

---

## Introduction

Validating Calico dashboards goes beyond confirming they load - it requires verifying that each panel shows accurate data that matches the cluster's actual state. A dashboard panel showing "0" when there are active network policies, or showing data from only 3 of 10 nodes, is a false negative that misleads operators.

## Validation Approach

```bash
#!/bin/bash
# validate-calico-dashboards.sh

GRAFANA_URL="${GRAFANA_URL:-http://grafana.monitoring.svc:3000}"
GRAFANA_TOKEN="${GRAFANA_TOKEN}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus-operated.monitoring.svc:9090}"

echo "=== Calico Dashboard Validation ==="
FAILURES=0

# 1. Get expected values from Prometheus
EXPECTED_POLICIES=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=max(felix_cluster_num_policies)" | \
  jq -r '.data.result[0].value[1] // "0"')
EXPECTED_NODES=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=count(felix_active_local_policies)" | \
  jq -r '.data.result[0].value[1] // "0"')
TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)

echo "Expected metrics:"
echo "  - Active policies: ${EXPECTED_POLICIES}"
echo "  - Nodes with Felix metrics: ${EXPECTED_NODES}/${TOTAL_NODES}"

# 2. Validate dashboard accessibility
for uid in calico-overview calico-felix-perf calico-ipam; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "${GRAFANA_URL}/api/dashboards/uid/${uid}" \
    -H "Authorization: Bearer ${GRAFANA_TOKEN}")

  if [[ "${status}" == "200" ]]; then
    echo "OK:   Dashboard ${uid} accessible"
  else
    echo "FAIL: Dashboard ${uid} returned HTTP ${status}"
    FAILURES=$((FAILURES + 1))
  fi
done

# 3. Validate key metrics are non-zero
for metric in felix_active_local_policies felix_active_local_endpoints; do
  value=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(${metric})" | \
    jq -r '.data.result[0].value[1] // "0"')

  if [[ "${value}" != "0" ]]; then
    echo "OK:   ${metric} = ${value}"
  else
    echo "WARN: ${metric} = 0 (check if this is expected)"
  fi
done

echo ""
echo "=== Validation: ${FAILURES} failure(s) ==="
```

## Manual Panel-by-Panel Validation

For each panel in the overview dashboard:

| Panel | Expected Value | How to Check |
|-------|---------------|--------------|
| Active Policies | matches configured Calico policies | `calicoctl get globalnetworkpolicy -o json \| jq 'length'` and `calicoctl get networkpolicy --all-namespaces -o json \| jq 'length'` |
| IP Pool Usage | matches Calico IPAM allocation | `calicoctl ipam show --show-blocks` |
| Nodes with Felix | = total node count | `kubectl get nodes --no-headers \| wc -l` |
| Policy Latency | low calculation graph update duration when updates occur | Query `felix_calc_graph_update_time_seconds` in Prometheus |

## Conclusion

Validating Calico dashboards requires cross-referencing dashboard values with ground truth from `kubectl` and `calicoctl` commands. The automated validation script checks dashboard accessibility and verifies key metrics are non-zero. Run this validation after every Calico upgrade, Grafana update, or Prometheus configuration change to ensure the visualization layer remains accurate and trustworthy.
