# How to Validate Calico Cluster Diagnostics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Diagnostic, Validation

Description: Validate cluster-wide Calico health by running comprehensive checks on TigeraStatus, IPAM consistency, cross-node connectivity, and policy enforcement to confirm the entire Calico installation is...

---

## Introduction

Validating Calico cluster health requires more than checking that pods are Running. A healthy-looking cluster can have silent failures: IPAM inconsistencies that cause future pod scheduling failures, unavailable operator-managed components, or route propagation gaps that affect specific pod CIDR ranges. Comprehensive cluster validation catches these before they cause incidents.

## Cluster Validation Script

```bash
#!/bin/bash
# validate-calico-cluster.sh

PASS=0
FAIL=0
WARN=0

check_pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
check_fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }
check_warn() { echo "WARN: $1"; WARN=$((WARN + 1)); }

# 1. TigeraStatus
if TIGERA_STATUS=$(kubectl get tigerastatus --no-headers 2>/dev/null); then
  NOT_AVAILABLE=$(echo "${TIGERA_STATUS}" | awk '$2 != "True"' | wc -l)
  [ "${NOT_AVAILABLE}" -eq 0 ] && \
    check_pass "All TigeraStatus components Available" || \
    check_fail "${NOT_AVAILABLE} TigeraStatus components not Available"
else
  check_fail "Unable to get TigeraStatus resources"
fi

# 2. calico-system pods
if CALICO_PODS=$(kubectl get pods -n calico-system --no-headers 2>/dev/null); then
  NOT_RUNNING=$(echo "${CALICO_PODS}" | awk '$3 != "Running"' | wc -l)
  [ "${NOT_RUNNING}" -eq 0 ] && \
    check_pass "All calico-system pods Running" || \
    check_fail "${NOT_RUNNING} calico-system pods not Running"
else
  check_fail "Unable to get calico-system pods"
fi

# 3. IPAM consistency
if calicoctl ipam check >/tmp/calico-ipam-check.out 2>&1; then
  check_pass "IPAM consistent"
else
  check_fail "IPAM inconsistency detected"
fi

# 4. IPAM utilization
IPAM_USED=$(calicoctl ipam show 2>/dev/null | \
  awk -F'|' '$2 ~ /IP Pool/ && match($5, /\([0-9]+%\)/) {
    used = substr($5, RSTART + 1, RLENGTH - 3)
    if (used > max) max = used
  } END { if (max != "") print max }')
if [ -z "${IPAM_USED}" ]; then
  check_warn "Unable to determine IPAM utilization"
elif [ "${IPAM_USED}" -gt 85 ]; then
  check_warn "IPAM utilization at ${IPAM_USED}% (>85%)"
else
  check_pass "IPAM utilization at ${IPAM_USED}%"
fi

echo ""
echo "Validation: ${PASS} passed, ${WARN} warnings, ${FAIL} failed"
[ "${FAIL}" -gt 0 ] && exit 1 || exit 0
```

## Validate Cross-Node Routing

```bash
# Deploy test pods on different nodes
kubectl run net-test-a --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<node-a>"}}' \
  --restart=Never -- sleep 300

kubectl run net-test-b --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<node-b>"}}' \
  --restart=Never -- sleep 300

kubectl wait --for=condition=Ready pod/net-test-a --timeout=60s
kubectl wait --for=condition=Ready pod/net-test-b --timeout=60s

IP_B=$(kubectl get pod net-test-b -o jsonpath='{.status.podIP}')
kubectl exec net-test-a -- ping -c 3 "${IP_B}"

# Cleanup
kubectl delete pod net-test-a net-test-b
```

## Validation Architecture

```mermaid
flowchart LR
    A[validate-calico-cluster.sh] --> B[TigeraStatus check]
    A --> C[Pod health check]
    A --> D[IPAM consistency]
    A --> E[IPAM utilization]
    F[Cross-node routing test] --> G[Data plane validation]
    B --> H{All PASS?}
    C --> H
    D --> H
    E --> H
    G --> H
    H -->|Yes| I[Cluster validated]
    H -->|No| J[Investigation required]
```

## Conclusion

Cluster validation runs five checks: TigeraStatus, pod health, IPAM consistency, IPAM utilization, and cross-node routing. The IPAM consistency check is the most important - `calicoctl ipam check` detects leaked IP allocations that won't appear in any other health signal until the cluster runs out of IPs. Run the validation script weekly in production and after any major change (Calico upgrade, node replacement, IPPool modification).
