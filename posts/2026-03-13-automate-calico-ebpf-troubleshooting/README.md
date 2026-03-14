# How to Automate Calico eBPF Troubleshooting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, EBPF, Troubleshooting, Automation

Description: Automate Calico eBPF diagnostic data collection with scripts that gather BPF state, Felix logs, and connectivity test results for faster incident resolution.

---

## Introduction

When a Calico eBPF issue occurs in production, time spent manually collecting diagnostic information delays resolution. Automating the diagnostic collection process means you can run a single command and get a complete picture of the eBPF state within seconds, rather than running dozens of commands manually.

Automated eBPF troubleshooting scripts also create reproducible diagnostic bundles that can be shared with the Calico support team or used for post-incident analysis.

## Prerequisites

- Calico with eBPF mode
- `kubectl` with cluster-admin access

## Automated Diagnostic Bundle Script

```bash
#!/bin/bash
# collect-calico-ebpf-diagnostics.sh
set -euo pipefail

BUNDLE_DIR="calico-ebpf-diag-$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BUNDLE_DIR}"

log() { echo "[$(date +%H:%M:%S)] $*"; }

collect_component() {
  local name="${1}"
  local cmd="${2}"
  log "Collecting: ${name}"
  eval "${cmd}" > "${BUNDLE_DIR}/${name}.txt" 2>&1 || true
}

# 1. Basic state
collect_component "tigerastatus" \
  "kubectl get tigerastatus -o yaml"

collect_component "installation" \
  "kubectl get installation default -o yaml"

collect_component "pods-calico-system" \
  "kubectl get pods -n calico-system -o wide"

collect_component "nodes" \
  "kubectl get nodes -o wide"

# 2. eBPF state from each node
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  POD=$(kubectl get pod -n calico-system -l k8s-app=calico-node \
    --field-selector=spec.nodeName=${node} \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

  if [[ -z "${POD}" ]]; then
    log "No calico-node pod found on ${node}"
    continue
  fi

  NODE_DIR="${BUNDLE_DIR}/nodes/${node}"
  mkdir -p "${NODE_DIR}"

  # BPF programs
  kubectl exec -n calico-system "${POD}" -c calico-node -- \
    bpftool prog list 2>/dev/null > "${NODE_DIR}/bpf-programs.txt" || true

  # BPF maps
  kubectl exec -n calico-system "${POD}" -c calico-node -- \
    bpftool map list 2>/dev/null > "${NODE_DIR}/bpf-maps.txt" || true

  # NAT table
  kubectl exec -n calico-system "${POD}" -c calico-node -- \
    calico-node -bpf-nat-dump 2>/dev/null > "${NODE_DIR}/nat-table.txt" || true

  # Conntrack
  kubectl exec -n calico-system "${POD}" -c calico-node -- \
    calico-node -bpf-conntrack-dump 2>/dev/null > "${NODE_DIR}/conntrack.txt" || true

  # Felix logs (last 500 lines)
  kubectl logs -n calico-system "${POD}" -c calico-node \
    --tail=500 > "${NODE_DIR}/felix-logs.txt" 2>/dev/null || true

  log "Collected eBPF state for node: ${node}"
done

# 3. Events
collect_component "events-calico-system" \
  "kubectl get events -n calico-system --sort-by='.lastTimestamp'"

# 4. Package and summarize
tar -czf "${BUNDLE_DIR}.tar.gz" "${BUNDLE_DIR}/"
log "Diagnostic bundle created: ${BUNDLE_DIR}.tar.gz"

# Print summary
echo ""
echo "=== SUMMARY ==="
echo "Nodes collected: $(ls ${BUNDLE_DIR}/nodes/ | wc -l)"
echo "Total size: $(du -sh ${BUNDLE_DIR}.tar.gz | cut -f1)"
echo "Bundle: ${BUNDLE_DIR}.tar.gz"
```

## Automated Connectivity Test

```bash
#!/bin/bash
# auto-connectivity-test.sh
# Run from a pod to systematically test connectivity

POD_NAMESPACE="${1:-default}"
SERVICES_TO_TEST=(
  "kubernetes.default.svc.cluster.local:443:HTTPS"
  "kube-dns.kube-system.svc.cluster.local:53:DNS"
)

echo "=== Automated Connectivity Tests ==="
for svc in "${SERVICES_TO_TEST[@]}"; do
  IFS=: read -r host port proto <<< "${svc}"
  echo -n "Testing ${proto} to ${host}:${port}... "
  if timeout 5 bash -c "</dev/tcp/${host}/${port}" 2>/dev/null; then
    echo "OK"
  else
    echo "FAILED"
  fi
done
```

## Automated BPF Health Check

```bash
#!/bin/bash
# auto-bpf-health-check.sh
FAILURES=0
TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)
EBPF_NODES=0

for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  POD=$(kubectl get pod -n calico-system -l k8s-app=calico-node \
    --field-selector=spec.nodeName=${node} \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

  [[ -z "${POD}" ]] && continue

  programs=$(kubectl exec -n calico-system "${POD}" -c calico-node -- \
    bpftool prog list 2>/dev/null | grep -c calico || echo 0)

  if [[ "${programs}" -gt 5 ]]; then
    EBPF_NODES=$((EBPF_NODES + 1))
  else
    echo "WARNING: Node ${node} has only ${programs} BPF programs"
    FAILURES=$((FAILURES + 1))
  fi
done

echo "eBPF nodes: ${EBPF_NODES}/${TOTAL_NODES}"
exit ${FAILURES}
```

## Conclusion

Automating Calico eBPF troubleshooting data collection reduces mean time to resolution by providing a complete diagnostic bundle in seconds. The diagnostic bundle script gathers BPF program state, NAT tables, conntrack tables, and Felix logs from every node in a single run, creating a reproducible package that can be shared for collaborative debugging. Integrate the automated health check into your monitoring pipeline for continuous eBPF status validation.
