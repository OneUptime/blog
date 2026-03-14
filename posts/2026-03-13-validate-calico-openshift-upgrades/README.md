# How to Validate Calico on OpenShift Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, Upgrades, Validation

Description: Validate Calico upgrades on OpenShift by checking OCP-specific components including cluster operators, SCC bindings, and network operator compatibility alongside standard Calico validation.

---

## Introduction

Validating Calico upgrades on OpenShift requires both standard Calico checks and OpenShift-specific validation. The additional OCP checks confirm that the upgrade didn't disrupt OpenShift's own networking infrastructure or operator framework.

## Complete OCP Calico Upgrade Validation

```bash
#!/bin/bash
# validate-calico-openshift-upgrade.sh
TARGET_VERSION="${1:?Provide target version}"
FAILURES=0

echo "=== OpenShift Calico Upgrade Validation ==="

echo ""
echo "--- Standard Calico Checks ---"

# Version
RUNNING=$(kubectl get installation default -o jsonpath='{.status.calicoVersion}')
[[ "${RUNNING}" == "${TARGET_VERSION}" ]] && echo "OK:   Version ${TARGET_VERSION}" || \
  { echo "FAIL: Version mismatch: ${RUNNING} vs ${TARGET_VERSION}"; FAILURES=$((FAILURES + 1)); }

# TigeraStatus
STATUS=$(kubectl get tigerastatus calico \
  -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')
[[ "${STATUS}" == "True" ]] && echo "OK:   TigeraStatus Available" || \
  { echo "FAIL: TigeraStatus: ${STATUS}"; FAILURES=$((FAILURES + 1)); }

# calico-system pods
NOT_RUNNING=$(kubectl get pods -n calico-system --no-headers | grep -v Running | wc -l)
[[ "${NOT_RUNNING}" -eq 0 ]] && echo "OK:   All calico-system pods Running" || \
  { echo "FAIL: ${NOT_RUNNING} pods not Running"; FAILURES=$((FAILURES + 1)); }

echo ""
echo "--- OpenShift-Specific Checks ---"

# SCC exists and is correct
oc get scc calico-node > /dev/null 2>&1 && echo "OK:   calico-node SCC exists" || \
  { echo "FAIL: calico-node SCC missing"; FAILURES=$((FAILURES + 1)); }

# Cluster operators healthy
CO_DEGRADED=$(oc get co -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.conditions[?(@.type=="Degraded")].status}{"\n"}{end}' | \
  grep " True" | wc -l)
[[ "${CO_DEGRADED}" -eq 0 ]] && echo "OK:   No cluster operators degraded" || \
  { echo "WARN: ${CO_DEGRADED} cluster operators degraded"; }

# Network operator status
NET_STATUS=$(oc get co network -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')
[[ "${NET_STATUS}" == "True" ]] && echo "OK:   OCP Network operator Available" || \
  { echo "WARN: OCP Network operator not Available"; }

# MachineConfigPools stable
MCP_UPDATING=$(oc get mcp -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="Updating")].status}{"\n"}{end}' | \
  grep -c True)
[[ "${MCP_UPDATING}" -eq 0 ]] && echo "OK:   All MCPs stable" || \
  echo "INFO: ${MCP_UPDATING} MCPs still updating (may still be completing)"

echo ""
echo "--- Network Connectivity ---"
oc run ocp-connectivity-test --image=busybox --restart=Never -- \
  nslookup kubernetes.default.svc.cluster.local > /dev/null 2>&1 && \
  echo "OK:   DNS resolution working" || \
  { echo "FAIL: DNS resolution failed"; FAILURES=$((FAILURES + 1)); }

oc delete pod ocp-connectivity-test 2>/dev/null

echo ""
echo "=== Validation: ${FAILURES} failure(s) ==="
exit ${FAILURES}
```

## OCP-Specific Validation Matrix

| Check | What to Look For | OCP Command |
|-------|-----------------|-------------|
| SCC binding | calico-node SA has calico-node SCC | `oc adm policy who-can use scc calico-node` |
| Network CO | Available=True, Degraded=False | `oc get co network` |
| MCPs stable | UPDATED=True, UPDATING=False | `oc get mcp` |
| No new node issues | No newly SchedulingDisabled nodes | `oc get nodes` |

## Conclusion

OpenShift Calico upgrade validation adds SCC, cluster operator, and MachineConfigPool checks on top of standard Calico validation. The automated validation script provides a binary pass/fail result covering all these areas. Run it immediately after the upgrade completes and again 24 hours later to catch any delayed failures from MCP updates that may have been running in parallel.
