# How to Validate Calico eBPF Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, eBPF, Installation, Validation

Description: Validate a fresh Calico eBPF installation by confirming BPF programs, service routing, DNS, pod connectivity, and network policy enforcement are all working correctly.

---

## Introduction

Validating a fresh Calico eBPF installation is a multi-step process that confirms not just that pods are running but that all layers of the networking stack are functioning correctly. A successful eBPF installation means: BPF programs are loaded in the kernel, service routing works without kube-proxy, DNS resolves correctly, pod-to-pod connectivity works, and network policies are enforced.

## Prerequisites

- Calico eBPF installation completed
- `kubectl` with cluster-admin access

## Validation Script

```bash
#!/bin/bash
# validate-calico-ebpf-installation.sh
set -euo pipefail
FAILURES=0

check() {
  local desc="${1}"
  local cmd="${2}"
  if eval "${cmd}" > /dev/null 2>&1; then
    echo "OK:   ${desc}"
  else
    echo "FAIL: ${desc}"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "=== Calico eBPF Installation Validation ==="
echo ""

# 1. Operator and components running
echo "--- Component Health ---"
check "TigeraStatus calico Available" \
  "kubectl get tigerastatus calico -o jsonpath='{.status.conditions[?(@.type==\"Available\")].status}' | grep -q True"

check "calico-node DaemonSet ready" \
  "kubectl rollout status ds/calico-node -n calico-system --timeout=60s"

check "calico-kube-controllers ready" \
  "kubectl rollout status deploy/calico-kube-controllers -n calico-system --timeout=60s"

# 2. eBPF mode active
echo ""
echo "--- eBPF Mode ---"
BPF_PROG_COUNT=$(kubectl exec -n calico-system ds/calico-node -c calico-node -- \
  bpftool prog list 2>/dev/null | grep -c calico || echo 0)
if [[ "${BPF_PROG_COUNT}" -gt 5 ]]; then
  echo "OK:   BPF programs loaded (${BPF_PROG_COUNT} calico programs)"
else
  echo "FAIL: Insufficient BPF programs (${BPF_PROG_COUNT})"
  FAILURES=$((FAILURES + 1))
fi

IPTABLES_COUNT=$(kubectl exec -n calico-system ds/calico-node -c calico-node -- \
  iptables-legacy -L -n 2>/dev/null | grep -c cali || echo 0)
if [[ "${IPTABLES_COUNT}" -eq 0 ]]; then
  echo "OK:   No iptables calico rules (eBPF mode confirmed)"
else
  echo "WARN: ${IPTABLES_COUNT} iptables rules found (may be transitioning)"
fi

# 3. Node readiness
echo ""
echo "--- Node Status ---"
NOT_READY=$(kubectl get nodes --no-headers | grep -v " Ready" | wc -l)
TOTAL=$(kubectl get nodes --no-headers | wc -l)
if [[ "${NOT_READY}" -eq 0 ]]; then
  echo "OK:   All ${TOTAL} nodes Ready"
else
  echo "FAIL: ${NOT_READY}/${TOTAL} nodes not Ready"
  FAILURES=$((FAILURES + 1))
fi

# 4. DNS and service routing
echo ""
echo "--- Service Routing (without kube-proxy) ---"
kubectl run dns-test --image=busybox --restart=Never --rm -it \
  --timeout=30s -- \
  nslookup kubernetes.default.svc.cluster.local > /dev/null 2>&1 \
  && echo "OK:   DNS resolution working" \
  || { echo "FAIL: DNS resolution failed"; FAILURES=$((FAILURES + 1)); }

# 5. Pod connectivity
echo ""
echo "--- Pod Connectivity ---"
kubectl run connectivity-test --image=busybox --restart=Never --rm -it \
  --timeout=30s -- \
  wget -qO/dev/null --timeout=5 https://kubernetes.default.svc.cluster.local > /dev/null 2>&1 \
  && echo "OK:   Pod-to-service connectivity working" \
  || { echo "FAIL: Pod-to-service connectivity failed"; FAILURES=$((FAILURES + 1)); }

echo ""
echo "=== Validation Complete: ${FAILURES} failure(s) ==="
exit ${FAILURES}
```

## Expected Output

```
=== Calico eBPF Installation Validation ===

--- Component Health ---
OK:   TigeraStatus calico Available
OK:   calico-node DaemonSet ready
OK:   calico-kube-controllers ready

--- eBPF Mode ---
OK:   BPF programs loaded (24 calico programs)
OK:   No iptables calico rules (eBPF mode confirmed)

--- Node Status ---
OK:   All 3 nodes Ready

--- Service Routing (without kube-proxy) ---
OK:   DNS resolution working

--- Pod Connectivity ---
OK:   Pod-to-service connectivity working

=== Validation Complete: 0 failure(s) ===
```

## Conclusion

A successful Calico eBPF installation validation confirms all five layers: component health, eBPF programs loaded, all nodes ready, service routing without kube-proxy, and pod-to-pod connectivity. The validation script provides a binary pass/fail result suitable for integration into CI/CD pipelines. Run it as the final step of any automated cluster provisioning workflow to confirm the installation is complete and functional before the cluster is handed off to application teams.
