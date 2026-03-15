# How to Validate Resolution of CIDRNotAvailable Errors with Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubeadm, CIDR, IPAM, Kubernetes, Validation, Verification

Description: A structured approach to validating that CIDRNotAvailable errors have been fully resolved and will not recur in Calico-based Kubernetes clusters.

---

## Introduction

After applying a fix for CIDRNotAvailable errors, validation is the critical step that confirms the issue is actually resolved. Skipping thorough validation can lead to false confidence, where the immediate symptom disappears but the underlying problem persists and resurfaces during the next scaling event or node replacement.

Proper validation goes beyond simply checking that a single test pod can be created. It involves verifying IPAM consistency across the entire cluster, confirming that the fix survives node restarts, and ensuring that monitoring will catch any recurrence.

This guide provides a comprehensive validation framework that operators can follow after any CIDRNotAvailable remediation.

## Prerequisites

- CIDRNotAvailable error has been diagnosed and a fix applied
- `kubectl` and `calicoctl` CLI access with cluster-admin privileges
- Access to cluster nodes for validation
- Monitoring stack (Prometheus/Grafana) for ongoing verification

## Step 1: Validate IPAM State

Start by confirming the overall IPAM state is healthy:

```bash
# Check IPAM summary
calicoctl ipam show

# Check for any leaked or orphaned IPs
calicoctl ipam check

# Verify block allocation across nodes
calicoctl ipam show --show-blocks
```

Expected outcome: No errors from `ipam check`, reasonable utilization percentage, and blocks distributed across active nodes.

## Step 2: Validate IPPool Configuration

Confirm the IPPool configuration is correct and aligned:

```bash
# Verify IPPool details
calicoctl get ippools -o yaml

# Confirm CIDR alignment with kubeadm
KUBEADM_CIDR=$(kubectl get configmap -n kube-system kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' | grep podSubnet | awk '{print $2}')
CALICO_CIDR=$(calicoctl get ippools -o jsonpath='{.items[0].spec.cidr}')

echo "kubeadm CIDR:  $KUBEADM_CIDR"
echo "Calico CIDR:   $CALICO_CIDR"

if [ "$KUBEADM_CIDR" = "$CALICO_CIDR" ]; then
  echo "PASS: CIDRs are aligned"
else
  echo "FAIL: CIDRs do not match"
fi
```

## Step 3: Validate Node CIDR Assignments

Ensure every node has a valid pod CIDR assigned:

```bash
# List all nodes and their CIDRs
kubectl get nodes -o custom-columns=NAME:.metadata.name,CIDR:.spec.podCIDR,STATUS:.status.conditions[-1].type

# Check for nodes without CIDR
MISSING=$(kubectl get nodes -o json | jq -r '.items[] | select(.spec.podCIDR == null) | .metadata.name')
if [ -z "$MISSING" ]; then
  echo "PASS: All nodes have CIDR assignments"
else
  echo "FAIL: Nodes without CIDR: $MISSING"
fi
```

## Step 4: Validate Pod Creation Across Nodes

Test that pods can be scheduled on every node:

```bash
# Create a test pod on each node
for NODE in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  kubectl run "cidr-test-${NODE}" \
    --image=busybox \
    --overrides="{\"spec\":{\"nodeName\":\"${NODE}\"}}" \
    --command -- sleep 60
done

# Wait for pods to start
sleep 15

# Check pod status and IPs
kubectl get pods -l run -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,IP:.status.podIP,STATUS:.status.phase | grep cidr-test

# Verify all pods have IPs
TOTAL=$(kubectl get pods -o name | grep cidr-test | wc -l)
WITH_IP=$(kubectl get pods -o json | jq '[.items[] | select(.metadata.name | startswith("cidr-test")) | select(.status.podIP != null)] | length')
echo "Pods with IPs: $WITH_IP / $TOTAL"

# Clean up test pods
kubectl delete pods -l run --field-selector=metadata.name!=dummy --grace-period=0 2>/dev/null
for NODE in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  kubectl delete pod "cidr-test-${NODE}" --grace-period=0 2>/dev/null
done
```

## Step 5: Validate Previously Pending Pods

Check that pods that were stuck due to the CIDR error have recovered:

```bash
# Check for remaining pending pods
PENDING=$(kubectl get pods --all-namespaces --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l)
echo "Pending pods: $PENDING"

# If pods are still pending, check their events
if [ "$PENDING" -gt 0 ]; then
  kubectl get pods --all-namespaces --field-selector=status.phase=Pending -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,NODE:.spec.nodeName
fi

# Check for recent CIDR-related events
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | grep -i "cidr\|CIDRNotAvailable" | tail -5
```

## Step 6: Validate Under Load

Simulate scaling to confirm the fix holds under load:

```bash
# Create a deployment with multiple replicas
kubectl create deployment cidr-load-test --image=busybox --replicas=20 -- sleep 3600

# Wait for rollout
kubectl rollout status deployment cidr-load-test --timeout=120s

# Check all replicas have IPs
kubectl get pods -l app=cidr-load-test -o custom-columns=NAME:.metadata.name,IP:.status.podIP,STATUS:.status.phase

# Count successful pod creations
RUNNING=$(kubectl get pods -l app=cidr-load-test --field-selector=status.phase=Running --no-headers | wc -l)
echo "Running pods: $RUNNING / 20"

# Clean up
kubectl delete deployment cidr-load-test
```

## Step 7: Validate Calico Component Health

Confirm all Calico components are healthy after the fix:

```bash
# Check calico-node DaemonSet
kubectl get daemonset -n calico-system calico-node
kubectl get pods -n calico-system -l k8s-app=calico-node -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount

# Check Typha (if deployed)
kubectl get deployment -n calico-system calico-typha 2>/dev/null
kubectl get pods -n calico-system -l k8s-app=calico-typha 2>/dev/null

# Check for errors in calico-node logs since the fix
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --since=30m --tail=50 | grep -i "error\|cidr\|ipam"
```

## Step 8: Validate Monitoring Alerts Have Cleared

Ensure monitoring reflects the resolution:

```bash
# Check if IPAM alerts have cleared in Prometheus
# (adjust the URL to your Prometheus endpoint)
kubectl exec -n monitoring $(kubectl get pod -n monitoring -l app.kubernetes.io/name=prometheus -o name | head -1) -- wget -qO- 'http://localhost:9090/api/v1/alerts' 2>/dev/null | grep -i "CalicoIPAM"

# Verify current IPAM utilization is below alert thresholds
calicoctl ipam show
```

## Full Validation Script

Combine all checks into a single validation script:

```bash
#!/bin/bash
# validate-cidr-fix.sh

PASS=0
FAIL=0

check() {
  if [ $1 -eq 0 ]; then
    echo "PASS: $2"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $2"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== CIDRNotAvailable Resolution Validation ==="
echo "Date: $(date)"
echo ""

# 1. IPAM health
calicoctl ipam check > /dev/null 2>&1
check $? "IPAM consistency check"

# 2. CIDR alignment
KUBEADM_CIDR=$(kubectl get configmap -n kube-system kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' 2>/dev/null | grep podSubnet | awk '{print $2}')
CALICO_CIDR=$(calicoctl get ippools -o jsonpath='{.items[0].spec.cidr}' 2>/dev/null)
[ "$KUBEADM_CIDR" = "$CALICO_CIDR" ]
check $? "CIDR alignment (kubeadm=$KUBEADM_CIDR, calico=$CALICO_CIDR)"

# 3. All nodes have CIDRs
MISSING=$(kubectl get nodes -o json | jq '[.items[] | select(.spec.podCIDR == null)] | length')
[ "$MISSING" -eq 0 ]
check $? "All nodes have CIDR assignments"

# 4. No pending pods
PENDING=$(kubectl get pods --all-namespaces --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')
[ "$PENDING" -eq 0 ]
check $? "No pending pods ($PENDING found)"

echo ""
echo "Results: $PASS passed, $FAIL failed"
```

## Verification

Run the full validation script and confirm all checks pass:

```bash
chmod +x validate-cidr-fix.sh
./validate-cidr-fix.sh
```

All checks should show PASS. Any FAIL indicates the resolution is incomplete.

## Troubleshooting

**Test pods fail on specific nodes**: The fix may not have propagated to all nodes. Restart the calico-node pod on the affected node and re-run validation.

**IPAM check reports inconsistencies**: Run `calicoctl ipam release` for any leaked addresses identified by the check. Then re-validate.

**Load test fails but individual pods succeed**: This may indicate that the CIDR has enough space for a few pods but not enough for sustained scaling. Review the IPAM utilization and consider expanding the IP pool.

## Conclusion

Validating the resolution of CIDRNotAvailable errors requires checking every layer of the stack: IPAM state, IPPool configuration, node CIDR assignments, pod creation across all nodes, and monitoring alert status. The validation script provided here can be integrated into your runbook and run after every remediation to ensure the fix is complete and durable. Never close an incident without running through the full validation checklist.
