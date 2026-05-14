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

If you plan to replace `192.168.0.0/16` with target pools such as `10.0.0.0/17` and `10.0.128.0/17`, but pods still have IPs in the old range, you cannot safely delete the old pool until those pods have been restarted onto the target pools. Calico also rejects overlapping IPPools in API server mode, and marks overlapping pools disabled when using native v3 CRDs, so do not create replacement pools whose CIDRs overlap a pool that still exists.

```bash
# List all currently allocated blocks before planning target CIDRs
calicoctl ipam show --show-blocks

# Print every IP checked by Calico IPAM, then filter for old-range addresses
calicoctl ipam check --show-all-ips | grep '192\.168\.'
```

If the old range still has allocations, you must restart or drain the affected workloads before deleting the old pool.

---

## Step 3: Mistake - Deleting the Source Pool Too Early

After creating non-overlapping target pools, you must keep the source pool in place - even if disabled - until all pods have been restarted onto addresses from the new pools. Deleting it early can affect connectivity for pods still using addresses from that pool.

```yaml
# Correct: disable the source pool first; do NOT delete it yet
# ippool-source-disable.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: original-pool
spec:
  cidr: 192.168.0.0/16
  # disabled=true stops new allocations from this pool
  # but does NOT invalidate existing pod IPs in this range
  disabled: true
  ipipMode: Never
  vxlanMode: Always
  natOutgoing: true
```

```bash
calicoctl apply -f ippool-source-disable.yaml

# Only delete the source pool after confirming no workloads still use it
calicoctl get wep --all-namespaces | grep '192\.168\.'
# When no workload endpoints show old-range addresses, deletion is safe
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
# Both should show DISABLED as false

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
  # Use a CIDR inside the Kubernetes pod CIDR that does not overlap any existing IPPool
  cidr: 10.0.192.0/18
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
- Perform pool migrations during low-traffic periods; while disabling a pool does not affect running pods, deleting and recreating pods to move them to a target pool can temporarily affect applications.
- Keep the original pool disabled for at least 24 hours before deleting it to allow time to detect any allocation problems.
- Avoid migrating a heavily utilized pool without spare capacity in the target pools; pods need headroom to restart onto replacement addresses.
- Document every step in a change management record before starting - this ensures you have a rollback procedure if something goes wrong.

---

## Conclusion

Most IPAM split mistakes come from skipping verification steps and applying changes in the wrong order. Checking IPAM consistency first, planning sub-pool CIDRs around existing allocations, using `disabled: true` instead of deleting, and creating sub-pools before applying node selectors eliminates the most common failure modes.

---

*Monitor Calico IPAM utilization and detect allocation failures early with [OneUptime](https://oneuptime.com).*
