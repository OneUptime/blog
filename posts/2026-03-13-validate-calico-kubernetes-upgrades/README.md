# How to Validate Calico on Kubernetes Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrades, Validation

Description: Validate a successful Calico upgrade on Kubernetes by verifying version consistency, network connectivity, policy enforcement, and IPAM integrity.

---

## Introduction

Post-upgrade validation for Calico is a multi-step process that confirms the upgrade was complete and correct. Version consistency validation checks every component is on the target version. Functional validation tests network connectivity and policy enforcement. IPAM validation ensures no IP addresses were lost or duplicated during the upgrade.

## Complete Upgrade Validation Script

```bash
#!/bin/bash
# validate-calico-post-upgrade.sh
TARGET_VERSION="${1:?Provide target Calico version}"
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

echo "=== Calico Post-Upgrade Validation: ${TARGET_VERSION} ==="
echo ""

# 1. Version consistency
echo "--- Version Check ---"
RUNNING_VERSION=$(kubectl get installation default \
  -o jsonpath='{.status.calicoVersion}')
if [[ "${RUNNING_VERSION}" == "${TARGET_VERSION}" ]]; then
  echo "OK:   Running version: ${RUNNING_VERSION}"
else
  echo "FAIL: Version mismatch. Expected: ${TARGET_VERSION}, Got: ${RUNNING_VERSION}"
  FAILURES=$((FAILURES + 1))
fi

# All calico-node images should be target version
WRONG_VERSION_PODS=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | \
  grep -v "${TARGET_VERSION}" | wc -l)
if [[ "${WRONG_VERSION_PODS}" -eq 0 ]]; then
  echo "OK:   All calico-node pods on ${TARGET_VERSION}"
else
  echo "FAIL: ${WRONG_VERSION_PODS} pods not on ${TARGET_VERSION}"
  FAILURES=$((FAILURES + 1))
fi

# 2. Component health
echo ""
echo "--- Component Health ---"
check "TigeraStatus Available" \
  "kubectl get tigerastatus calico -o jsonpath='{.status.conditions[?(@.type==\"Available\")].status}' | grep True"

check "calico-node DaemonSet healthy" \
  "kubectl rollout status ds/calico-node -n calico-system --timeout=60s"

check "kube-controllers Deployment healthy" \
  "kubectl rollout status deploy/calico-kube-controllers -n calico-system --timeout=60s"

# 3. Network connectivity
echo ""
echo "--- Network Connectivity ---"
kubectl run upgrade-test-pod --image=busybox --restart=Never -- sleep 60
kubectl wait pod/upgrade-test-pod --for=condition=Ready --timeout=60s > /dev/null 2>&1

check "Pod-to-API connectivity" \
  "kubectl exec upgrade-test-pod -- wget -qO/dev/null https://kubernetes.default.svc --timeout=5"

check "DNS resolution" \
  "kubectl exec upgrade-test-pod -- nslookup kubernetes.default.svc.cluster.local"

kubectl delete pod upgrade-test-pod --force > /dev/null 2>&1

# 4. IPAM integrity
echo ""
echo "--- IPAM Integrity ---"
check "IP pools exist" \
  "calicoctl get ippools --no-headers | grep -q ."

check "No IPAM conflicts" \
  "calicoctl ipam check --show-all-ips 2>&1 | grep -q 'No problems found'"

echo ""
echo "=== Validation Complete: ${FAILURES} failure(s) ==="
exit ${FAILURES}
```

## IPAM Integrity Check Detail

```bash
# After upgrade, verify IPAM consistency
calicoctl ipam check

# Expected output:
# Checking IPAM for inconsistencies...
# [INFO] Found 3 blocks with 10 IPs each
# [INFO] Found 30 pods with valid IP allocations
# No problems found.

# If problems found:
calicoctl ipam check --show-all-ips
# This shows which IPs are leaked or have conflicts
# Follow up with: calicoctl ipam release <problem-ip>
```

## Conclusion

Post-upgrade Calico validation must cover four areas: version consistency (all components on target version), component health (TigeraStatus, DaemonSet, Deployment readiness), functional networking (pod connectivity, DNS), and IPAM integrity (no leaked IPs, no allocation conflicts). Run this validation script as the final step of every upgrade and treat any failure as a blocking issue that must be resolved before declaring the upgrade successful. Save validation output as evidence for your upgrade change ticket.
