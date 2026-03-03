# How to Create Maintenance Runbooks for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Runbooks, Operations, Documentation, SRE, DevOps

Description: Learn how to create effective maintenance runbooks for Talos Linux clusters that enable consistent, reliable operations and reduce human error during critical tasks.

---

A runbook is a documented procedure that tells an operator exactly what to do, step by step, during a specific maintenance task or incident. Good runbooks are the difference between a calm, controlled maintenance operation and a panicked scramble through documentation while your cluster is half-broken. For Talos Linux clusters, runbooks are especially valuable because the operational model is different from traditional Linux, and many engineers need to adjust their mental models.

This guide walks through how to create practical, effective maintenance runbooks for Talos Linux.

## What Makes a Good Runbook

A good runbook has several key characteristics:

**It is specific.** "Upgrade the cluster" is not a runbook. "Upgrade Talos Linux from v1.8.x to v1.9.x on a 3-CP, 10-worker cluster" is a runbook.

**It is testable.** Every step should be something you can verify succeeded before moving on.

**It handles failures.** Each step should include what to do if it fails.

**It requires minimal context.** An engineer who has never touched the cluster should be able to follow it at 3 AM during an incident.

**It is version-controlled.** Runbooks change as your infrastructure evolves. Keep them in Git.

## Runbook Structure Template

Here is a template you can use for all your Talos Linux maintenance runbooks:

```markdown
# Runbook: [Task Name]

## Metadata
- **Last Updated**: YYYY-MM-DD
- **Author**: [Name]
- **Cluster**: [cluster-name]
- **Estimated Duration**: [time]
- **Risk Level**: Low / Medium / High
- **Requires Maintenance Window**: Yes / No

## Prerequisites
- [ ] Checklist item 1
- [ ] Checklist item 2

## Procedure
### Step 1: [Description]
Command:
$ command here

Expected output:
expected output here

If this fails:
> Remediation steps

### Step 2: ...

## Rollback Procedure
Steps to undo the changes if something goes wrong.

## Verification
Steps to confirm the task completed successfully.

## Known Issues
Document any gotchas or edge cases.
```

## Runbook: Talos OS Upgrade

Here is a complete example runbook for upgrading Talos OS:

```markdown
# Runbook: Talos OS Upgrade

## Metadata
- Last Updated: 2026-03-03
- Estimated Duration: 2-4 hours
- Risk Level: Medium
- Requires Maintenance Window: Yes

## Prerequisites
- [ ] Current Talos version documented
- [ ] Target Talos version tested in staging
- [ ] Release notes reviewed for breaking changes
- [ ] etcd backup taken within the last hour
- [ ] All nodes in Ready state
- [ ] No ongoing incidents or alerts
- [ ] Maintenance window active
- [ ] On-call team notified
```

The procedure section would include each step:

```bash
# Pre-flight checks

# Document current state
talosctl version -n 10.0.0.1
kubectl get nodes -o wide
talosctl etcd members -n 10.0.0.1

# Take etcd backup
talosctl etcd snapshot /backup/etcd-pre-upgrade-$(date +%Y%m%d%H%M).db -n 10.0.0.1

# Verify backup was created
ls -la /backup/etcd-pre-upgrade-*.db

# Expected: File exists and is larger than 0 bytes
# If backup fails: DO NOT PROCEED. Troubleshoot etcd first.
```

```bash
# Upgrade first control plane node

# Drain the node
kubectl drain control-plane-1 --ignore-daemonsets --delete-emptydir-data --timeout=300s
# Expected: "node/control-plane-1 drained"
# If drain times out: Check PDBs blocking the drain

# Perform upgrade
talosctl upgrade --image ghcr.io/siderolabs/installer:v1.9.1 -n 10.0.0.1
# Expected: "upgrade initiated"
# If upgrade fails: Check talosctl logs for error details

# Wait for node to return
talosctl health -n 10.0.0.1 --wait-timeout 10m
# Expected: All health checks pass
# If timeout: Check dmesg for boot errors: talosctl dmesg -n 10.0.0.1

# Uncordon
kubectl uncordon control-plane-1
# Expected: "node/control-plane-1 uncordoned"

# Verify
talosctl version -n 10.0.0.1
# Expected: Tag shows v1.9.1
# If wrong version: Run talosctl rollback -n 10.0.0.1
```

## Runbook: etcd Defragmentation

```markdown
# Runbook: etcd Defragmentation

## Metadata
- Estimated Duration: 30 minutes
- Risk Level: Low
- Requires Maintenance Window: No (but recommended)

## When to Run
- etcd database size exceeds 500MB
- After large-scale resource cleanup
- Monthly as routine maintenance

## Procedure
```

```bash
# Step 1: Check current etcd database size
talosctl etcd status -n 10.0.0.1
# Note the DB size for each member

# Step 2: Take a snapshot before defrag
talosctl etcd snapshot /backup/etcd-pre-defrag.db -n 10.0.0.1

# Step 3: Defragment each etcd member, one at a time
# Start with non-leader members

# Check which member is the leader
talosctl etcd status -n 10.0.0.1
# The leader will be indicated in the output

# Defragment a non-leader member
talosctl etcd defrag -n 10.0.0.2
# Expected: "defragmented successfully"
# Wait 30 seconds between members

# Defragment the second non-leader
talosctl etcd defrag -n 10.0.0.3
# Wait 30 seconds

# Defragment the leader last
talosctl etcd defrag -n 10.0.0.1

# Step 4: Verify
talosctl etcd status -n 10.0.0.1
# DB size should be smaller now
```

## Runbook: Node Replacement

```bash
# Runbook: Replacing a Failed Worker Node

# Step 1: Identify the failed node
kubectl get nodes
# Look for nodes in NotReady state

# Step 2: Cordon the failed node
kubectl cordon <failed-node-name>

# Step 3: Force-drain if the node is unresponsive
kubectl drain <failed-node-name> \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --force \
    --timeout=120s

# If drain hangs, pods may be stuck:
kubectl get pods --all-namespaces --field-selector=spec.nodeName=<failed-node-name>
# Delete stuck pods manually:
kubectl delete pod <pod-name> -n <namespace> --force --grace-period=0

# Step 4: Remove the node from Kubernetes
kubectl delete node <failed-node-name>

# Step 5: Provision the replacement
# (Platform-specific - document your provisioning steps)

# Step 6: Apply Talos configuration to the new node
talosctl apply-config \
    --nodes <new-node-ip> \
    --file worker.yaml \
    --insecure

# Step 7: Wait for the node to join
kubectl get nodes -w
# Wait until the new node appears and becomes Ready

# Step 8: Verify
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

## Runbook: Certificate Renewal

```bash
# Runbook: Certificate Renewal

# Step 1: Check certificate status
talosctl get certificate -n 10.0.0.1

# Step 2: Identify expiring certificates
# Look for certificates expiring within 30 days

# Step 3: Rotate Talos certificates
talosctl config rotate-certs -n 10.0.0.1

# Step 4: Update your local talosconfig
talosctl config merge /path/to/new-talosconfig

# Step 5: Verify connectivity with new certs
talosctl version -n 10.0.0.1
# If connection fails: You may need to re-bootstrap talosconfig

# Step 6: Verify all nodes
for ip in 10.0.0.1 10.0.0.2 10.0.0.3; do
    echo "Node $ip:"
    talosctl version -n "$ip"
done
```

## Organizing Your Runbooks

Keep your runbooks organized in a Git repository with a clear structure:

```
runbooks/
  talos/
    upgrade-talos-os.md
    upgrade-kubernetes.md
    etcd-defragmentation.md
    etcd-restore.md
    certificate-renewal.md
    node-replacement.md
    node-rotation.md
  incident-response/
    cluster-down.md
    etcd-quorum-lost.md
    node-unresponsive.md
    certificate-expired.md
  maintenance/
    weekly-health-check.md
    monthly-cleanup.md
    quarterly-review.md
```

## Testing Runbooks

Runbooks that have never been tested are unreliable. Schedule regular runbook drills:

1. **Monthly**: Pick a runbook and execute it in a staging environment
2. **Quarterly**: Have someone unfamiliar with the cluster follow a runbook
3. **After incidents**: Update runbooks based on lessons learned

After each drill, update the runbook with:
- Steps that were unclear or missing
- Commands that produced unexpected output
- Timing adjustments
- New failure modes discovered

## Automating Runbook Steps

Where possible, encode runbook steps as scripts that can be run automatically. Keep the human-readable runbook as the authoritative source, but provide scripts for common operations:

```bash
#!/bin/bash
# scripts/pre-upgrade-check.sh
# Corresponds to "Talos OS Upgrade" runbook, Prerequisites section

set -euo pipefail

echo "=== Pre-Upgrade Checks ==="

# Check all nodes are Ready
NOT_READY=$(kubectl get nodes --no-headers | grep -cv " Ready" || true)
if [ "$NOT_READY" -gt 0 ]; then
    echo "FAIL: $NOT_READY nodes are not Ready"
    exit 1
fi
echo "PASS: All nodes Ready"

# Check etcd health
if talosctl etcd status -n 10.0.0.1 > /dev/null 2>&1; then
    echo "PASS: etcd is healthy"
else
    echo "FAIL: etcd health check failed"
    exit 1
fi

# Check for active alerts
# (Integration with your monitoring system)

echo "=== All pre-upgrade checks passed ==="
```

## Conclusion

Good runbooks transform cluster maintenance from a high-stress, error-prone activity into a calm, repeatable process. For Talos Linux clusters, runbooks are especially important because the operational model differs from what many engineers are used to. Invest time in writing clear, tested runbooks, keep them in version control, and practice them regularly. When it is 3 AM and something needs to be fixed, you will be glad you did the work.
