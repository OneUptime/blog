# Avoiding Mistakes in Calico IPAM Split Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, IPAM

Description: Learn the most costly mistakes made when splitting Calico IP pools - from splitting with inconsistent IPAM to deleting the source pool too early - and the exact steps to prevent each one.

---

## Introduction

Calico IPAM splits are powerful but unforgiving. A split that leaves allocated IPs outside the new sub-pool boundaries, or one that removes the original pool before all pods have restarted, creates IPAM inconsistencies that are difficult to repair without disrupting running workloads. Many of these mistakes share a root cause: the operator did not verify state before and after each step.

This post catalogs the most common and costly mistakes and shows exactly how to avoid them.

---

## Prerequisites

- Calico v3.x with `calicoctl` v3.x installed
- Access to cluster node labels for node selector planning
- Understanding of Calico IPAM blocks and IP pools
- Familiarity with `calicoctl ipam check`

---

## Step 1: Mistake - Splitting with Inconsistent IPAM

The most fundamental mistake is running a split when IPAM is already inconsistent. A pre-existing inconsistency means you cannot tell whether post-split problems were caused by the split or were already present.

```bash
# Always check IPAM consistency before starting any split operation
calicoctl ipam check

# Expected output contains: "IPAM is consistent"
# If the output shows errors, stop immediately and investigate
# before proceeding with any pool changes
```

Never continue with a split if `calicoctl ipam check` reports problems. Fix the existing inconsistencies first and re-run the check until it reports clean.

---

## Step 2: Mistake - Sub-Pool CIDRs That Don't Cover All Existing Allocations

If you plan to split `10.0.0.0/16` into `10.0.0.0/17` and `10.0.128.0/17`, but pods already have IPs in both halves, you cannot cleanly assign all existing allocations to a single sub-pool.

```bash
# List all currently allocated IPs before planning sub-pool CIDRs
calicoctl ipam show --show-blocks

# Check whether any allocations fall in the upper half of a /16
# (indicating they would need to move to the second sub-pool)
calicoctl ipam show --show-all-ips 2>/dev/null | awk '{print $1}' | while read ip; do
  THIRD_OCTET=$(echo "$ip" | cut -d. -f3)
  if [ -n "$THIRD_OCTET" ] && [ "$THIRD_OCTET" -ge 128 ] 2>/dev/null; then
    echo "Upper half IP in use: $ip"
  fi
done
```

If both halves have allocations, you must drain the nodes in one half first before the split can proceed safely.

---

## Step 3: Mistake - Deleting the Source Pool Too Early

After creating sub-pools, you must keep the source pool in place - even if disabled - until all pods have been restarted onto addresses from the new sub-pools. Deleting it early removes the allocation records for any pods still using addresses from it.

```yaml
# Correct: disable the source pool first; do NOT delete it yet
# ippool-source-disable.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: original-pool
spec:
  cidr: 10.0.0.0/16
  # disabled=true stops new allocations from this pool
  # but does NOT invalidate existing pod IPs in this range
  disabled: true
  ipipMode: Never
  vxlanMode: Always
  natOutgoing: true
```

```bash
calicoctl apply -f ippool-source-disable.yaml

# Only delete the source pool after confirming zero blocks remain allocated in it
calicoctl ipam show --show-blocks | grep "10.0.0.0/16"
# When all blocks show "0 allocations", deletion is safe
```

---

## Step 4: Mistake - Applying Node Selectors Before Sub-Pools Exist

If you label nodes to match a sub-pool selector before creating that sub-pool, new pods on those nodes cannot get an IP address from the non-existent pool.

```bash
# Correct order of operations for a zone-based split:

# 1. Create sub-pool IPPool resources first
calicoctl apply -f ippool-zone-a.yaml
calicoctl apply -f ippool-zone-b.yaml

# 2. Confirm both pools are active before relabeling any nodes
calicoctl get ippool -o wide | grep -E "zone-a|zone-b"
# Both should show disabled=false

# 3. Only then label nodes to match the sub-pool selectors
kubectl label nodes worker-01 worker-02 zone=zone-a
kubectl label nodes worker-03 worker-04 zone=zone-b
```

---

## Step 5: Mistake - Leaving Nodes Without a Matching Pool

If some nodes do not match any sub-pool's `nodeSelector`, those nodes have no pool to draw from. New pods on unlabeled nodes will fail to get IP addresses.

```bash
# Find nodes that don't match the zone-based selectors
kubectl get nodes --show-labels | grep -v "zone=" | grep -v NAME
# Any node appearing here will not match zone-specific pool selectors
```

Create a fallback pool with no `nodeSelector` to cover unlabeled nodes during the transition:

```yaml
# ippool-fallback.yaml
# Fallback pool matching all nodes - use during transition, disable after all nodes are labeled
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: fallback-pool
spec:
  cidr: 10.1.0.0/16
  # No nodeSelector means this pool is available to all nodes
  ipipMode: Never
  vxlanMode: Always
  natOutgoing: true
  disabled: false
```

```bash
calicoctl apply -f ippool-fallback.yaml

# After all nodes are labeled and pods have restarted, disable the fallback pool
calicoctl patch ippool fallback-pool --patch '{"spec":{"disabled":true}}'
```

---

## Best Practices

- Run `calicoctl ipam check` before the split, after each step, and 24 hours after completion.
- Perform splits during low-traffic periods; while the split itself does not affect running pods, subsequent node relabeling triggers pod IP reallocation.
- Keep the original pool disabled for at least 24 hours before deleting it to allow time to detect any allocation problems.
- Never split a pool that is more than 80% utilized; the remaining 20% provides headroom for pods to restart onto sub-pool addresses.
- Document every step in a change management record before starting - this ensures you have a rollback procedure if something goes wrong.

---

## Conclusion

Most IPAM split mistakes come from skipping verification steps and applying changes in the wrong order. Checking IPAM consistency first, planning sub-pool CIDRs around existing allocations, using `disabled: true` instead of deleting, and creating sub-pools before applying node selectors eliminates the most common failure modes.

---

*Monitor Calico IPAM utilization and detect allocation failures early with [OneUptime](https://oneuptime.com).*
