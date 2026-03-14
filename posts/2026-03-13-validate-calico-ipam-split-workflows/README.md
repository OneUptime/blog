# Validating Calico IPAM Split Operations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, IPAM

Description: Systematically validate a completed Calico IPAM split - confirming IPAM consistency, correct pool assignment by node zone, allocation distribution, and that no pods are still using IPs from the...

---

## Introduction

After completing an IPAM split, you need systematic proof that every aspect of the new configuration is working correctly. This is not just a quick `calicoctl ipam check` - it means verifying that each node draws IPs from the correct pool, that new pod allocations are going to the right sub-pool, and that no pods are still stranded on the original pool's CIDR range.

This post provides a complete validation checklist with the specific commands to execute each check.

---

## Prerequisites

- A completed Calico IPAM split (sub-pools created, original pool disabled, nodes labeled)
- `calicoctl` v3.x installed and configured
- `kubectl` cluster-admin access
- At least 10 minutes since the split completed (to allow any in-progress allocations to finish)

---

## Step 1: Validate IPAM Consistency

The first check is always consistency:

```bash
# Run the authoritative IPAM consistency check
calicoctl ipam check

# Expected output includes: "IPAM is consistent"
# Any other output indicates a problem - do not proceed until this passes
```

If `calicoctl ipam check` reports inconsistencies, stop the validation and investigate using the troubleshoot post in this series.

---

## Step 2: Validate Pool Configuration

Confirm the sub-pools are configured correctly and the original pool is disabled:

```bash
# List all pools with their configuration
calicoctl get ippool -o wide

# Verify sub-pool A exists with the correct CIDR and nodeSelector
calicoctl get ippool prod-pool-zone-a -o yaml | \
  grep -E "cidr|nodeSelector|disabled|blockSize"

# Verify sub-pool B exists with the correct CIDR and nodeSelector
calicoctl get ippool prod-pool-zone-b -o yaml | \
  grep -E "cidr|nodeSelector|disabled|blockSize"

# Verify the original pool is disabled (not deleted)
ORIGINAL_DISABLED=$(calicoctl get ippool default-ipv4-ippool \
  -o jsonpath='{.spec.disabled}' 2>/dev/null)
echo "Original pool disabled: $ORIGINAL_DISABLED"
# Expected: true
```

---

## Step 3: Validate Node Label Coverage

Every node must match exactly one pool's `nodeSelector`. Nodes without a matching label cannot get new IPs:

```bash
# Find nodes without the zone label (they won't match zone-specific pools)
echo "=== Nodes without zone label ==="
kubectl get nodes -o json | jq -r \
  '.items[] | select(.metadata.labels.zone == null) | .metadata.name'
# Expected: empty output

# Verify zone label distribution
echo "=== Zone label distribution ==="
kubectl get nodes -o json | jq -r \
  '.items[] | .metadata.labels.zone' | sort | uniq -c
# Expected: roughly equal counts per zone
```

---

## Step 4: Validate New Allocations Go to Correct Pools

Create test pods in each zone and confirm they receive IPs from the correct CIDR:

```bash
# Create a test pod in zone-a
kubectl run validate-zone-a \
  --image=busybox --restart=Never \
  --overrides='{"spec":{"nodeSelector":{"zone":"zone-a"}}}' \
  -- sleep 30

# Create a test pod in zone-b
kubectl run validate-zone-b \
  --image=busybox --restart=Never \
  --overrides='{"spec":{"nodeSelector":{"zone":"zone-b"}}}' \
  -- sleep 30

# Wait for pods to be assigned IPs
kubectl wait --for=condition=Ready \
  pod/validate-zone-a pod/validate-zone-b --timeout=60s

# Check zone-a pod IP (must be in 10.0.0.0/17: 10.0.0.0 – 10.0.127.255)
ZONE_A_IP=$(kubectl get pod validate-zone-a \
  -o jsonpath='{.status.podIP}')
echo "Zone-A pod IP: $ZONE_A_IP"

# Check zone-b pod IP (must be in 10.0.128.0/17: 10.0.128.0 – 10.0.255.255)
ZONE_B_IP=$(kubectl get pod validate-zone-b \
  -o jsonpath='{.status.podIP}')
echo "Zone-B pod IP: $ZONE_B_IP"

# Clean up test pods
kubectl delete pod validate-zone-a validate-zone-b
```

---

## Step 5: Validate No Active Pods Are Still on the Original Pool CIDR

After the split, existing pods retain their original IPs until restarted. Track how many pods still have IPs in the original pool range:

```bash
#!/bin/bash
# count-original-pool-pods.sh
# Count pods still using IPs from the original pool CIDR (10.0.0.0/16)
# These are pods that have not yet restarted onto sub-pool addresses

ORIGINAL_THIRD_OCTET_MAX=255   # For a /16 pool: 10.0.0.0 to 10.0.255.255
SUB_POOL_A_MAX=127              # Zone-A: 10.0.0.0 to 10.0.127.255

echo "=== Pods with IPs in the original pool range ==="
kubectl get pods --all-namespaces -o json | jq -r '
  .items[] |
  select(.status.podIP != null) |
  select(.status.podIP | test("^10\\.0\\.")) |
  "\(.metadata.namespace)/\(.metadata.name): \(.status.podIP)"
'

echo ""
echo "Run this check again after rolling restarts to confirm count decreases toward 0"
```

---

## Step 6: Run the Full Validation Checklist

```bash
echo "=== IPAM Split Validation Checklist ==="
PASS=0; FAIL=0

# Check 1: IPAM consistency
if calicoctl ipam check 2>&1 | grep -q "consistent"; then
  echo "[PASS] IPAM is consistent"
  PASS=$((PASS+1))
else
  echo "[FAIL] IPAM is NOT consistent"
  FAIL=$((FAIL+1))
fi

# Check 2: Original pool is disabled
DISABLED=$(calicoctl get ippool default-ipv4-ippool \
  -o jsonpath='{.spec.disabled}' 2>/dev/null)
if [ "$DISABLED" = "true" ]; then
  echo "[PASS] Original pool is disabled"
  PASS=$((PASS+1))
else
  echo "[FAIL] Original pool is still enabled (value: $DISABLED)"
  FAIL=$((FAIL+1))
fi

# Check 3: Sub-pools exist
for pool in prod-pool-zone-a prod-pool-zone-b; do
  if calicoctl get ippool "$pool" >/dev/null 2>&1; then
    echo "[PASS] Sub-pool $pool exists"
    PASS=$((PASS+1))
  else
    echo "[FAIL] Sub-pool $pool is missing"
    FAIL=$((FAIL+1))
  fi
done

# Check 4: All nodes have zone labels
UNLABELED=$(kubectl get nodes -o json | jq -r \
  '.items[] | select(.metadata.labels.zone == null) | .metadata.name' | wc -l)
if [ "$UNLABELED" -eq 0 ]; then
  echo "[PASS] All nodes have zone labels"
  PASS=$((PASS+1))
else
  echo "[FAIL] $UNLABELED node(s) missing zone label"
  FAIL=$((FAIL+1))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
```

---

## Best Practices

- Re-run the full validation checklist at 1 hour, 24 hours, and 7 days post-split to catch deferred allocation problems.
- Track the count of pods still on the original pool CIDR over time - it should decrease toward zero as pods are restarted.
- Only delete the original pool when the count reaches zero and the 7-day check passes.
- Store the validation output with your change management record as evidence that the split was completed correctly.
- Validate in staging before production - run the same checklist on a staging cluster where you can correct mistakes more freely.

---

## Conclusion

IPAM split validation confirms four things: the IPAM system reports consistency, sub-pools are configured correctly, all nodes match a pool selector, and new pod allocations go to the correct pool. Running this checklist at multiple points after the split gives you confidence that the split is stable before you remove the original pool permanently.

---

*Track IPAM health over time and correlate allocation events with workload incidents in [OneUptime](https://oneuptime.com).*
