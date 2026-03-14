# Automating Cilium Agent Shell Commands

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Automation, Kubernetes, Shell, Scripting, Monitoring

Description: Automate cilium-agent shell operations for scheduled health checks, bulk endpoint inspection, and integration with monitoring systems across Kubernetes clusters.

---

## Introduction

The cilium-agent shell provides interactive access to the agent's internal state, but its real power emerges when you automate it. Scripted shell operations enable scheduled health audits, automated endpoint inventories, and integration with alerting systems.

By wrapping cilium-agent shell commands in automation scripts, you transform ad-hoc debugging into systematic observability. This is especially valuable for teams managing multiple clusters where manual inspection does not scale.

This guide covers automation patterns for cilium-agent shell commands, from simple cron scripts to Kubernetes-native monitoring jobs.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- `kubectl` access to the cluster
- Bash scripting environment
- Optional: Prometheus Pushgateway for metrics export

## Scripted Health Checks

Create a comprehensive health check that runs non-interactively:

```bash
#!/bin/bash
# cilium-health-check.sh
# Automated health check using cilium-agent commands

set -euo pipefail

NAMESPACE="${CILIUM_NAMESPACE:-kube-system}"
EXIT_CODE=0

check_pod() {
  local pod="$1"
  local node

  node=$(kubectl -n "$NAMESPACE" get pod "$pod" \
    -o jsonpath='{.spec.nodeName}')

  echo "=== Node: $node (Pod: $pod) ==="

  # Check agent status
  STATUS=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg status --brief 2>/dev/null || echo "UNREACHABLE")

  if echo "$STATUS" | grep -q "OK"; then
    echo "  Health: OK"
  else
    echo "  Health: DEGRADED"
    echo "  $STATUS"
    EXIT_CODE=1
  fi

  # Count endpoints
  EP_COUNT=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg endpoint list -o json 2>/dev/null | \
    python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  echo "  Endpoints: $EP_COUNT"

  # Check for endpoints in not-ready state
  NOT_READY=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg endpoint list 2>/dev/null | \
    grep -c "not-ready" || echo "0")
  if [ "$NOT_READY" -gt 0 ]; then
    echo "  WARNING: $NOT_READY endpoints not ready"
    EXIT_CODE=1
  fi
}

# Iterate all Cilium pods
PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{.items[*].metadata.name}')

for pod in $PODS; do
  check_pod "$pod"
  echo ""
done

exit $EXIT_CODE
```

## Bulk Endpoint Inventory

Collect endpoint data from all nodes into a single report:

```bash
#!/bin/bash
# cilium-endpoint-inventory.sh
# Collect endpoint inventory across all Cilium agents

set -euo pipefail

OUTPUT="/tmp/cilium-endpoints-$(date +%Y%m%d).json"
NAMESPACE="kube-system"

echo "[" > "$OUTPUT"
FIRST=true

PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{range .items[*]}{.metadata.name},{.spec.nodeName}{"\n"}{end}')

while IFS=',' read -r pod node; do
  [ -z "$pod" ] && continue

  ENDPOINTS=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg endpoint list -o json 2>/dev/null || echo "[]")

  # Annotate each endpoint with the node name
  ANNOTATED=$(echo "$ENDPOINTS" | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
for ep in data:
    ep['_node'] = '$node'
    ep['_pod'] = '$pod'
json.dump(data, sys.stdout)
" 2>/dev/null || echo "[]")

  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$OUTPUT"
  fi
  echo "$ANNOTATED" >> "$OUTPUT"
done <<< "$PODS"

echo "]" >> "$OUTPUT"

# Flatten nested arrays
python3 -c "
import json
with open('$OUTPUT') as f:
    data = json.load(f)
flat = []
for item in data:
    if isinstance(item, list):
        flat.extend(item)
    else:
        flat.append(item)
with open('$OUTPUT', 'w') as f:
    json.dump(flat, f, indent=2)
print(f'Total endpoints: {len(flat)}')
"
```

## Integration with Kubernetes CronJob

```yaml
# cilium-shell-monitor.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cilium-shell-monitor
  namespace: kube-system
spec:
  schedule: "*/30 * * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cilium
          containers:
          - name: monitor
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              PODS=$(kubectl -n kube-system get pods -l k8s-app=cilium \
                -o jsonpath='{.items[*].metadata.name}')
              TOTAL_EPS=0
              UNHEALTHY=0
              for pod in $PODS; do
                STATUS=$(kubectl -n kube-system exec "$pod" -c cilium-agent -- \
                  cilium-dbg status --brief 2>/dev/null || echo "FAIL")
                if ! echo "$STATUS" | grep -q "OK"; then
                  UNHEALTHY=$((UNHEALTHY + 1))
                  echo "UNHEALTHY: $pod"
                fi
              done
              echo "Summary: $UNHEALTHY unhealthy agents out of $(echo $PODS | wc -w)"
              [ "$UNHEALTHY" -gt 0 ] && exit 1 || exit 0
          restartPolicy: OnFailure
```

## Exporting Metrics to Prometheus

```bash
#!/bin/bash
# cilium-shell-metrics.sh
# Push cilium-agent metrics to Prometheus Pushgateway

PUSHGATEWAY="${PUSHGATEWAY_URL:-http://localhost:9091}"
NAMESPACE="kube-system"
JOB_NAME="cilium_shell_monitor"

PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{.items[*].metadata.name}')

TOTAL_PODS=$(echo "$PODS" | wc -w)
HEALTHY=0

for pod in $PODS; do
  STATUS=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg status --brief 2>/dev/null || echo "FAIL")
  echo "$STATUS" | grep -q "OK" && HEALTHY=$((HEALTHY + 1))
done

# Push to Pushgateway
cat << METRICS | curl -s --data-binary @- "$PUSHGATEWAY/metrics/job/$JOB_NAME"
# HELP cilium_agents_total Total number of Cilium agent pods
# TYPE cilium_agents_total gauge
cilium_agents_total $TOTAL_PODS
# HELP cilium_agents_healthy Number of healthy Cilium agents
# TYPE cilium_agents_healthy gauge
cilium_agents_healthy $HEALTHY
METRICS

echo "Pushed metrics: $HEALTHY/$TOTAL_PODS healthy"
```

## Verification

```bash
# Test health check script
bash cilium-health-check.sh

# Test endpoint inventory
bash cilium-endpoint-inventory.sh
cat /tmp/cilium-endpoints-*.json | python3 -m json.tool | head -20

# Verify CronJob
kubectl apply -f cilium-shell-monitor.yaml
kubectl -n kube-system get cronjob cilium-shell-monitor
```

## Troubleshooting

- **Scripts timeout on large clusters**: Add `--request-timeout=120s` to kubectl commands and parallelize pod iteration with `xargs -P`.
- **Permission denied on exec**: Ensure the ServiceAccount has the required RBAC rules for pods/exec.
- **JSON parsing errors**: Some commands may output non-JSON to stderr. Always redirect stderr with `2>/dev/null`.
- **CronJob never succeeds**: Check job logs with `kubectl -n kube-system logs job/cilium-shell-monitor-<id>`.

## Conclusion

Automating cilium-agent shell commands transforms manual debugging into systematic monitoring. By scripting health checks, building endpoint inventories, and integrating with Prometheus, you gain continuous visibility into Cilium agent health across your entire cluster fleet.
