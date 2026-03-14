# How to Automate Calico VPP Troubleshooting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, Troubleshooting, Automation

Description: Automate Calico VPP diagnostic data collection with scripts that gather VPP state, trace logs, and interface statistics for rapid incident resolution.

---

## Introduction

Automating VPP diagnostic collection reduces the time needed to gather context during incidents. VPP diagnostics require running multiple `vppctl` commands across all VPP-enabled nodes, which is time-consuming manually but straightforward to automate.

## Automated VPP Diagnostic Bundle

```bash
#!/bin/bash
# collect-calico-vpp-diagnostics.sh
set -euo pipefail

BUNDLE_DIR="calico-vpp-diag-$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BUNDLE_DIR}"

VPP_NAMESPACE="${VPP_NAMESPACE:-calico-vpp-dataplane}"

# Collect from each VPP node
for pod in $(kubectl get pods -n "${VPP_NAMESPACE}" -l app=calico-vpp-node \
  -o jsonpath='{.items[*].metadata.name}'); do

  NODE=$(kubectl get pod -n "${VPP_NAMESPACE}" "${pod}" \
    -o jsonpath='{.spec.nodeName}')
  NODE_DIR="${BUNDLE_DIR}/nodes/${NODE}"
  mkdir -p "${NODE_DIR}"

  echo "Collecting VPP state from ${NODE} (${pod})..."

  # Interface state
  kubectl exec -n "${VPP_NAMESPACE}" "${pod}" -c vpp -- \
    vppctl show interface > "${NODE_DIR}/interfaces.txt" 2>/dev/null || true

  kubectl exec -n "${VPP_NAMESPACE}" "${pod}" -c vpp -- \
    vppctl show interface addr > "${NODE_DIR}/interface-addrs.txt" 2>/dev/null || true

  # Routing
  kubectl exec -n "${VPP_NAMESPACE}" "${pod}" -c vpp -- \
    vppctl show ip fib > "${NODE_DIR}/ip-fib.txt" 2>/dev/null || true

  # NAT (service routing)
  kubectl exec -n "${VPP_NAMESPACE}" "${pod}" -c vpp -- \
    vppctl show nat44 summary > "${NODE_DIR}/nat44-summary.txt" 2>/dev/null || true

  # Version
  kubectl exec -n "${VPP_NAMESPACE}" "${pod}" -c vpp -- \
    vppctl show version > "${NODE_DIR}/vpp-version.txt" 2>/dev/null || true

  # calico-vpp manager logs
  kubectl logs -n "${VPP_NAMESPACE}" "${pod}" -c calico-vpp-manager \
    --tail=500 > "${NODE_DIR}/manager-logs.txt" 2>/dev/null || true

done

# Package
tar -czf "${BUNDLE_DIR}.tar.gz" "${BUNDLE_DIR}/"
echo "VPP diagnostic bundle: ${BUNDLE_DIR}.tar.gz"
```

## Automated VPP Health Check

```bash
#!/bin/bash
# check-calico-vpp-health.sh
FAILURES=0
VPP_NAMESPACE="${VPP_NAMESPACE:-calico-vpp-dataplane}"

echo "=== Calico VPP Health Check ==="

for pod in $(kubectl get pods -n "${VPP_NAMESPACE}" -l app=calico-vpp-node \
  -o jsonpath='{.items[*].metadata.name}'); do

  NODE=$(kubectl get pod -n "${VPP_NAMESPACE}" "${pod}" \
    -o jsonpath='{.spec.nodeName}')

  echo -n "Node ${NODE}: "

  # Check VPP is responding
  if kubectl exec -n "${VPP_NAMESPACE}" "${pod}" -c vpp -- \
      vppctl show version > /dev/null 2>&1; then
    echo "VPP healthy"
  else
    echo "VPP NOT RESPONDING"
    FAILURES=$((FAILURES + 1))
  fi
done

echo ""
echo "Health check: ${FAILURES} failures"
exit ${FAILURES}
```

## CronJob for Continuous VPP Health Monitoring

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-vpp-health-check
  namespace: calico-vpp-dataplane
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calico-vpp-monitor
          containers:
            - name: health-check
              image: bitnami/kubectl:latest
              command: ["/scripts/check-calico-vpp-health.sh"]
          restartPolicy: OnFailure
```

## Conclusion

Automating Calico VPP diagnostic collection ensures that when incidents occur, the diagnostic bundle is gathered quickly and consistently across all VPP nodes. The health check script provides a simple pass/fail signal that can be integrated into your monitoring pipeline. Schedule the health check as a CronJob to detect VPP unresponsiveness early, before it causes networking issues that impact applications.
