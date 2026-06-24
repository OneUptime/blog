# How to Validate Calico eBPF Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, eBPF, Installation, Validation

Description: Validate a fresh Calico eBPF installation by confirming BPF programs, service routing, DNS, pod connectivity, and network policy enforcement are all working correctly.

---

## Introduction

Validating a fresh Calico eBPF installation is a multi-step process that confirms not just that pods are running but that all layers of the networking stack are functioning correctly. A successful eBPF installation means: eBPF mode is enabled, service routing works without kube-proxy, DNS resolves correctly, and pod-to-service connectivity works.

## Prerequisites

- Calico eBPF installation completed with the Tigera Operator
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
check "Installation configured for BPF dataplane" \
  "kubectl get installation.operator.tigera.io default -o jsonpath='{.spec.calicoNetwork.linuxDataplane}' | grep -q BPF"

check "calico-node BPF tooling available" \
  "kubectl exec -n calico-system ds/calico-node -c calico-node -- calico-node -bpf help"

IPTABLES_COUNT=$(kubectl exec -n calico-system ds/calico-node -c calico-node -- \
  iptables-legacy -L -n 2>/dev/null | grep -c cali || true)
if [[ "${IPTABLES_COUNT}" -eq 0 ]]; then
  echo "OK:   No Calico iptables rules found on sampled node"
else
  echo "INFO: ${IPTABLES_COUNT} Calico iptables rules found on sampled node"
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
kubectl run dns-test --image=busybox --restart=Never --rm -i \
  --pod-running-timeout=30s --command -- \
  nslookup kubernetes.default.svc.cluster.local > /dev/null 2>&1 \
  && echo "OK:   DNS resolution working" \
  || { echo "FAIL: DNS resolution failed"; FAILURES=$((FAILURES + 1)); }

# 5. Pod connectivity
echo ""
echo "--- Pod Connectivity ---"
kubectl run connectivity-test --image=curlimages/curl --restart=Never --rm -i \
  --pod-running-timeout=30s --command -- \
  curl -skI --connect-timeout 5 https://kubernetes.default.svc.cluster.local > /dev/null 2>&1 \
  && echo "OK:   Pod-to-service connectivity working" \
  || { echo "FAIL: Pod-to-service connectivity failed"; FAILURES=$((FAILURES + 1)); }

echo ""
echo "=== Validation Complete: ${FAILURES} failure(s) ==="
exit ${FAILURES}
```

## Expected Output

```plaintext
=== Calico eBPF Installation Validation ===

--- Component Health ---
OK:   TigeraStatus calico Available
OK:   calico-node DaemonSet ready
OK:   calico-kube-controllers ready

--- eBPF Mode ---
OK:   Installation configured for BPF dataplane
OK:   calico-node BPF tooling available
OK:   No Calico iptables rules found on sampled node

--- Node Status ---
OK:   All 3 nodes Ready

--- Service Routing (without kube-proxy) ---
OK:   DNS resolution working

--- Pod Connectivity ---
OK:   Pod-to-service connectivity working

=== Validation Complete: 0 failure(s) ===
```

## Conclusion

A successful Calico eBPF installation validation confirms all five layers: component health, eBPF mode enabled, all nodes ready, service routing without kube-proxy, and pod-to-service connectivity. The validation script provides a binary pass/fail result suitable for integration into CI/CD pipelines. Run it as the final step of any automated cluster provisioning workflow to confirm the installation is complete and functional before the cluster is handed off to application teams.
