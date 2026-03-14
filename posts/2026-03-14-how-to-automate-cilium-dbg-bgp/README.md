# Automating Cilium BGP Debug Operations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, BGP, Automation, Kubernetes, Monitoring

Description: Automate cilium-dbg bgp command execution across cluster nodes for BGP health monitoring, route validation, and peering state tracking.

---

## Introduction

Monitoring BGP state manually on each Cilium node does not scale in production. Automating cilium-dbg bgp command execution across all nodes enables continuous validation, early detection of peering issues, and integration with alerting systems.

This guide covers automation patterns for cilium-dbg bgp operations, from scheduled collection scripts to Kubernetes CronJobs and alerting integration.

## Prerequisites

- Kubernetes cluster with Cilium and BGP enabled
- `kubectl` with cluster access
- CiliumBGPPeeringPolicy configured
- Optional: Prometheus Pushgateway or webhook endpoint for alerts

## Multi-Node BGP State Collection

```bash
#!/bin/bash
# collect-bgp-state.sh
set -euo pipefail

NAMESPACE="${CILIUM_NAMESPACE:-kube-system}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="/tmp/cilium-bgp-$TIMESTAMP"
mkdir -p "$OUTPUT_DIR"

PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{range .items[*]}{.metadata.name},{.spec.nodeName}{"\n"}{end}')

HEALTHY=0
UNHEALTHY=0

while IFS=',' read -r pod node; do
  [ -z "$pod" ] && continue
  echo "Collecting BGP state from $node..."

  for subcmd in "peers" "routes" "route-policies"; do
    kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
      cilium-dbg bgp $subcmd > "$OUTPUT_DIR/${node}-${subcmd}.txt" 2>/dev/null || \
      echo "FAILED" > "$OUTPUT_DIR/${node}-${subcmd}.txt"
  done

  if grep -qi "established" "$OUTPUT_DIR/${node}-peers.txt" 2>/dev/null; then
    HEALTHY=$((HEALTHY + 1))
  else
    UNHEALTHY=$((UNHEALTHY + 1))
    echo "  WARNING: No established peers on $node"
  fi
done <<< "$PODS"

echo ""
echo "Results: $HEALTHY healthy, $UNHEALTHY unhealthy"
echo "Output: $OUTPUT_DIR"
```

## Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cilium-bgp-monitor
  namespace: kube-system
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cilium
          containers:
          - name: bgp-check
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              FAIL=0
              PODS=$(kubectl -n kube-system get pods -l k8s-app=cilium \
                -o jsonpath='{.items[*].metadata.name}')
              for pod in $PODS; do
                PEERS=$(kubectl -n kube-system exec "$pod" -c cilium-agent -- \
                  cilium-dbg bgp peers 2>/dev/null || echo "FAILED")
                if ! echo "$PEERS" | grep -qi "established"; then
                  NODE=$(kubectl -n kube-system get pod "$pod" -o jsonpath='{.spec.nodeName}')
                  echo "ALERT: No established BGP peers on $NODE"
                  FAIL=$((FAIL + 1))
                fi
              done
              echo "BGP check: $FAIL nodes with issues"
              [ "$FAIL" -gt 0 ] && exit 1 || exit 0
          restartPolicy: OnFailure
```

## Alerting Integration

```bash
#!/bin/bash
# bgp-alert.sh
NAMESPACE="kube-system"
WEBHOOK_URL="${ALERT_WEBHOOK:-}"

PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{.items[*].metadata.name}')

ISSUES=""
for pod in $PODS; do
  PEERS=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg bgp peers 2>/dev/null || echo "UNREACHABLE")
  if ! echo "$PEERS" | grep -qi "established"; then
    NODE=$(kubectl -n "$NAMESPACE" get pod "$pod" -o jsonpath='{.spec.nodeName}')
    ISSUES="$ISSUES\n- BGP peers not established on $NODE"
  fi
done

if [ -n "$ISSUES" ]; then
  echo -e "BGP Issues:$ISSUES"
  [ -n "$WEBHOOK_URL" ] && curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"Cilium BGP Alert:$ISSUES\"}"
  exit 1
fi
echo "All BGP checks passed"
```

## Prometheus Metrics Export

```bash
#!/bin/bash
# bgp-metrics.sh
NAMESPACE="kube-system"

PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{range .items[*]}{.metadata.name},{.spec.nodeName}{"\n"}{end}')

while IFS=',' read -r pod node; do
  [ -z "$pod" ] && continue
  PEERS=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg bgp peers 2>/dev/null)
  ESTABLISHED=$(echo "$PEERS" | grep -ci "established" || echo 0)
  ROUTES=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg bgp routes 2>/dev/null | tail -n +2 | grep -c . || echo 0)

  cat << METRICS
cilium_bgp_peers_established{node="$node"} $ESTABLISHED
cilium_bgp_routes_total{node="$node"} $ROUTES
METRICS
done <<< "$PODS"
```

## Verification

```bash
bash collect-bgp-state.sh
ls /tmp/cilium-bgp-*/
kubectl apply -f cilium-bgp-monitor.yaml
kubectl -n kube-system get cronjob cilium-bgp-monitor
```

## Troubleshooting

- **Collection timeout**: Increase `--request-timeout` and parallelize with `xargs -P`.
- **CronJob always fails**: Some nodes may not have BGP configured. Filter by node labels.
- **Webhook not receiving alerts**: Verify the URL and test with a manual curl.
- **Metrics missing nodes**: Pods may be restarting. Add error handling and retry logic.

## Conclusion

Automating cilium-dbg bgp operations enables continuous BGP monitoring at scale. Scheduled collection, alerting integration, and metrics export transform ad-hoc BGP debugging into systematic infrastructure observability.
