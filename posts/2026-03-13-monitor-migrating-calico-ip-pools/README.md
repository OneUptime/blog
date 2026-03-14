# Monitor Migrating Calico IP Pools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, IP Pool Migration, Kubernetes, Networking, Monitoring

Description: Learn how to safely migrate pods from one Calico IP pool to another, monitoring IP allocation transitions to ensure all workloads move to the new pool without connectivity interruptions.

---

## Introduction

Migrating Calico IP pools is necessary when you need to change your pod CIDR range, consolidate pools, or implement a new IP allocation strategy. Unlike changing service CIDRs (which requires cluster recreation), Calico IP pool migration can be done live by disabling the old pool, adding a new pool, and gradually replacing pods so they receive IPs from the new pool.

The migration process relies on pod replacement: Calico only reallocates IPs when pods are deleted and recreated. Therefore, IP pool migration is essentially a rolling pod restart with monitoring to track progress and verify that each restarted pod receives an IP from the new pool rather than the old one.

This guide covers the complete IP pool migration workflow, including disabling the old pool, monitoring migration progress, and validating that all pods have migrated to the new pool.

## Prerequisites

- Kubernetes cluster with Calico v3.27+ using Calico IPAM
- `calicoctl` v3.27+ installed
- `kubectl` with admin access
- New CIDR range prepared for the target IP pool
- Maintenance window scheduled (pod restarts required)

## Step 1: Prepare the New IP Pool

Create the target IP pool before disabling the old one to ensure smooth transition.

Add the new IP pool alongside the existing pool:

```yaml
# new-ip-pool.yaml - target IP pool for migration
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: new-pod-pool
spec:
  cidr: 172.16.0.0/16        # New CIDR for migrated pods
  blockSize: 26
  encapsulation: VXLAN
  natOutgoing: true
  disabled: false
  nodeSelector: all()
```

Create the new pool and verify it is active:

```bash
calicoctl create -f new-ip-pool.yaml

# Verify both old and new pools are present
calicoctl get ippools -o wide

# Confirm the new pool has no allocations yet
calicoctl ipam show --show-blocks | grep "new-pod-pool"
```

## Step 2: Disable the Old IP Pool

Prevent new pods from receiving IPs from the old pool while keeping existing pods running.

Disable the old pool to stop new IP allocations from it:

```yaml
# disable-old-pool.yaml - disable old pool to stop new allocations
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  encapsulation: VXLAN
  natOutgoing: true
  disabled: true             # Prevents new allocations, existing IPs remain valid
  nodeSelector: all()
```

Apply the pool disable:

```bash
calicoctl apply -f disable-old-pool.yaml

# Verify the pool shows as disabled
calicoctl get ippool default-ipv4-ippool -o yaml | grep disabled

# Confirm new pod would get IP from new pool (test with a new pod)
kubectl run migration-test --image=nginx
kubectl get pod migration-test -o jsonpath='{.status.podIP}'
# IP should be from the new CIDR (172.16.x.x)
kubectl delete pod migration-test
```

## Step 3: Monitor Migration Progress

Track the migration progress by counting pods on old vs new IP ranges.

Create a script to measure migration progress:

```bash
#!/bin/bash
# track-ipam-migration.sh - monitor IP pool migration progress

OLD_CIDR="192.168"
NEW_CIDR="172.16"

echo "=== IP Pool Migration Progress Report ==="
echo "Timestamp: $(date -u)"
echo ""

# Count pods on old CIDR
OLD_PODS=$(kubectl get pods -A -o wide --no-headers | \
  awk '{print $7}' | grep "^$OLD_CIDR" | wc -l)

# Count pods on new CIDR
NEW_PODS=$(kubectl get pods -A -o wide --no-headers | \
  awk '{print $7}' | grep "^$NEW_CIDR" | wc -l)

TOTAL=$((OLD_PODS + NEW_PODS))
if [ $TOTAL -gt 0 ]; then
  PCT=$(echo "scale=1; $NEW_PODS * 100 / $TOTAL" | bc)
else
  PCT=0
fi

echo "Pods on old pool ($OLD_CIDR.*): $OLD_PODS"
echo "Pods on new pool ($NEW_CIDR.*): $NEW_PODS"
echo "Migration progress: $PCT%"

echo ""
echo "=== Namespaces still using old pool ==="
kubectl get pods -A -o wide --no-headers | \
  awk '{if ($7 ~ /^'"$OLD_CIDR"'/) print $1, $2, $7}' | \
  sort -k1
```

## Step 4: Roll Pods to Trigger IP Migration

Restart all deployments to cause pods to be recreated with IPs from the new pool.

Systematically restart workloads namespace by namespace:

```bash
# Get all namespaces with pods on the old CIDR
OLD_CIDR="192.168"
NAMESPACES=$(kubectl get pods -A -o wide --no-headers | \
  awk '{if ($7 ~ /^'"$OLD_CIDR"'/) print $1}' | sort -u)

for ns in $NAMESPACES; do
  echo "Migrating namespace: $ns"
  
  # Restart all deployments in the namespace
  kubectl rollout restart deployment -n $ns
  
  # Wait for rollout to complete before moving to next namespace
  kubectl rollout status deployment -n $ns --timeout=5m
  
  # Verify namespace pods are now on new CIDR
  kubectl get pods -n $ns -o wide | grep -v "$OLD_CIDR" | wc -l
  echo "Pods migrated in $ns"
done
```

## Step 5: Validate Full Migration and Remove Old Pool

Confirm migration is complete and clean up the old pool.

Verify no pods remain on the old CIDR before removing the pool:

```bash
# Check for any remaining pods on the old pool
REMAINING=$(kubectl get pods -A -o wide --no-headers | \
  grep "192.168" | wc -l)

if [ "$REMAINING" -gt 0 ]; then
  echo "WARNING: $REMAINING pods still on old CIDR"
  kubectl get pods -A -o wide | grep "192.168"
else
  echo "Migration complete - all pods on new CIDR"
  
  # Remove the old IP pool
  calicoctl delete ippool default-ipv4-ippool
  
  # Verify old pool is gone
  calicoctl get ippools -o wide
fi
```

## Best Practices

- Always create the new pool before disabling the old one to avoid pod scheduling failures
- Migrate namespace by namespace and validate connectivity after each namespace migration
- Keep the old pool in `disabled` state until all pods have migrated successfully, then delete it
- Monitor application response times during migration to detect connectivity issues early
- Use OneUptime to monitor critical service endpoints during the migration for immediate regression detection

## Conclusion

Migrating Calico IP pools requires careful orchestration of pool management and pod restarts, but when done systematically, it can be completed with minimal disruption. By disabling the old pool, tracking migration progress, and validating each namespace after restart, you can safely transition your entire pod fleet to new IP ranges. Integrate with OneUptime to monitor application-level connectivity throughout the migration and catch any issues before they affect users.
