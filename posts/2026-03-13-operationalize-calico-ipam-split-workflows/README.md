# Operationalizing Calico IPAM Split Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Networking, Operations, IP Pools, CNI, Runbook

Description: Turn Calico IPAM pool splits from ad-hoc procedures into repeatable, auditable operations — with change management templates, a step-by-step runbook, rollback procedures, and post-split verification checklists.

---

## Introduction

An IPAM split performed once by one engineer with tribal knowledge is a risk. An IPAM split performed using a documented runbook with a defined rollback procedure is an operational capability. Operationalizing means encoding the steps, the verification criteria, and the rollback path into a form that any qualified engineer can follow.

This post converts the IPAM split procedure into a production-grade operational workflow.

---

## Prerequisites

- Calico v3.x installed with `calicoctl` v3.x
- A change management system or Git-based approval process
- The planned split design documented before the maintenance window begins
- Team review of the `avoid-mistakes` post in this series

---

## Step 1: Pre-Change Documentation Template

Before every IPAM split, fill out and get approval for this change document:

```markdown
# IPAM Split Change Request

## Summary
- Source pool: <CIDR>
- Target sub-pools: <CIDR-A> (selector: <label>), <CIDR-B> (selector: <label>)
- Reason for split: <e.g., zone isolation for multi-region expansion>
- Planned maintenance window: <date/time UTC>
- Engineer: <name>
- Reviewer: <name>

## Pre-Split State (fill in before starting)
- Source pool total IPs: <>
- Source pool allocated IPs: <>
- Source pool utilization: <>%
- IPAM consistency status: <run calicoctl ipam check>
- Nodes to receive zone-a label: <>
- Nodes to receive zone-b label: <>
- All existing allocations fit in sub-pool A CIDR: <yes/no>
- All existing allocations fit in sub-pool B CIDR: <yes/no>

## Rollback Plan
1. Re-enable the source pool: calicoctl patch ippool <name> --patch '{"spec":{"disabled":false}}'
2. Delete sub-pools if created: calicoctl delete ippool <name>
3. Remove node labels if applied: kubectl label nodes <nodes> zone-
4. Verify: calicoctl ipam check

## Approval
- [ ] Technical review completed
- [ ] Runbook reviewed against this post
- [ ] Rollback plan tested in staging
```

---

## Step 2: The Split Runbook

Store this runbook in your team wiki and link to it from the change request:

```markdown
# IPAM Split Runbook

### Step 1 — Pre-split consistency check
calicoctl ipam check
Expected: "IPAM is consistent"
Stop if: any inconsistency reported

### Step 2 — Record current state
calicoctl ipam show --show-blocks > ipam-pre-split-$(date +%Y%m%d).txt
calicoctl get ippool -o yaml > ippools-pre-split-$(date +%Y%m%d).yaml

### Step 3 — Apply sub-pool definitions
calicoctl apply -f ippool-zone-a.yaml
calicoctl apply -f ippool-zone-b.yaml
calicoctl get ippool  # Confirm both sub-pools appear

### Step 4 — Disable source pool
calicoctl patch ippool <source-pool-name> --patch '{"spec":{"disabled":true}}'

### Step 5 — Apply node labels
kubectl label nodes <zone-a-nodes> zone=zone-a
kubectl label nodes <zone-b-nodes> zone=zone-b

### Step 6 — Post-split consistency check
calicoctl ipam check
Expected: "IPAM is consistent"

### Step 7 — Verify new allocations go to correct sub-pools
# Restart a test pod and confirm its IP is in the expected sub-pool CIDR
kubectl delete pod <test-pod> -n <namespace>
kubectl get pod <test-pod> -n <namespace> -o jsonpath='{.status.podIP}'

### Step 8 — Record post-split state
calicoctl ipam show --show-blocks > ipam-post-split-$(date +%Y%m%d).txt
```

---

## Step 3: Define the Rollback Procedure

```bash
#!/bin/bash
# ipam-split-rollback.sh
# Emergency rollback for a Calico IPAM split
# Run only if post-split verification fails

SOURCE_POOL_NAME="$1"
SUB_POOL_A_NAME="$2"
SUB_POOL_B_NAME="$3"

echo "=== IPAM Split Rollback: $(date -u) ==="

# Step 1: Re-enable the source pool
echo "Re-enabling source pool: $SOURCE_POOL_NAME"
calicoctl patch ippool "$SOURCE_POOL_NAME" \
  --patch '{"spec":{"disabled":false}}'
echo "[OK] Source pool re-enabled"

# Step 2: Remove node zone labels (pods will use source pool on next restart)
echo "Removing zone labels from nodes..."
kubectl label nodes --all zone- 2>/dev/null || true
echo "[OK] Node labels removed"

# Step 3: Delete sub-pools (only if no allocations have been made from them)
echo "Checking sub-pool $SUB_POOL_A_NAME for allocations..."
calicoctl ipam show --show-blocks | grep "$SUB_POOL_A_NAME"
read -p "Delete sub-pool $SUB_POOL_A_NAME? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
  calicoctl delete ippool "$SUB_POOL_A_NAME"
  calicoctl delete ippool "$SUB_POOL_B_NAME"
fi

# Step 4: Verify rollback consistency
echo "Running post-rollback IPAM check..."
calicoctl ipam check

echo "Rollback complete."
```

---

## Step 4: Post-Split Operations Checklist

```markdown
# Post-Split Checklist (complete within 48 hours of split)

## Immediate (during maintenance window)
- [ ] calicoctl ipam check shows "consistent" after split
- [ ] New pods on zone-a nodes get IPs from zone-a CIDR
- [ ] New pods on zone-b nodes get IPs from zone-b CIDR
- [ ] No pod scheduling failures in events: kubectl get events --all-namespaces

## 24 Hours After
- [ ] calicoctl ipam check still shows "consistent"
- [ ] IPAM utilization distribution looks as expected
- [ ] No unexpected IP exhaustion alerts fired
- [ ] All nodes have the correct zone label

## 7 Days After
- [ ] Source pool shows decreasing allocation count as pods restart
- [ ] Consider deleting source pool when allocation count reaches zero
- [ ] Document the actual post-split state in the change record
```

---

## Best Practices

- Never perform an IPAM split without a written rollback procedure that has been reviewed by at least one other engineer.
- Run all split steps from a bastion or jump host with a stable connection — a disconnected terminal mid-split can leave the cluster in a partial state.
- Save pre-split and post-split state snapshots (`calicoctl ipam show --show-blocks`) to a persistent store for audit purposes.
- Test the rollback procedure in staging before performing the production split.
- Schedule the post-split source pool deletion as a separate change request, not as part of the initial split — this gives time to detect any issues before making the change permanent.

---

## Conclusion

Operationalizing IPAM splits means treating them as infrastructure changes with the same rigor as a Kubernetes upgrade: documented in advance, reviewed by peers, executed from a runbook, and verified against defined success criteria. The rollback procedure should be tested before the production split so that if anything goes wrong, recovery is fast and confident.

---

*Track IPAM change events and correlate them with cluster health data in [OneUptime](https://oneuptime.com).*
