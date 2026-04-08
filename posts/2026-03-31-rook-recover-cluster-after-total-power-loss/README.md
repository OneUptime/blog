# How to Recover a Ceph Cluster After Total Power Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Disaster Recovery, Power Loss, Recovery, Storage

Description: Learn step-by-step how to recover a Ceph cluster after total power loss, restore monitor quorum, bring OSDs back online, and verify data integrity.

---

## What Happens During Total Power Loss

When all cluster nodes lose power simultaneously, Ceph loses its in-memory state. On restart, monitors must re-establish quorum, OSDs must replay their Write-Ahead Logs (WAL), and the cluster must reconcile any incomplete writes that were in-flight when power was lost.

## Step 1: Verify Node and Hardware Health

Before starting Ceph services, verify hardware is functional:

```bash
# Check disk health on each node
smartctl -a /dev/sda
journalctl -b | grep -E "error|fail|warning"

# Check for filesystem errors
dmesg | grep -E "EXT4|XFS|btrfs|error"
```

## Step 2: Start Monitors and Re-establish Quorum

Start monitors one at a time, beginning with the node containing the most recent monitor data:

```bash
# On monitor node 1
systemctl start ceph-mon@$(hostname)

# Check if quorum was established
ceph mon stat
ceph quorum_status
```

If only one monitor starts but quorum requires 3, start remaining monitors:

```bash
# On monitor nodes 2 and 3
systemctl start ceph-mon@$(hostname)
```

In Rook, monitor pods restart automatically when nodes come back online:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon
```

## Step 3: Set noout to Prevent Premature Rebalancing

Before bringing any OSDs online, set the `noout` flag:

```bash
ceph osd set noout
```

This prevents Ceph from marking OSDs as `out` and triggering unnecessary data movement while OSDs are still coming up.

## Step 4: Allow OSD WAL Replay

Do NOT immediately start all OSDs simultaneously. Allow time for Write-Ahead Log (WAL) replay:

```bash
# Start OSDs on one node first
systemctl start ceph-osd.target

# Check OSD status
ceph osd stat
ceph osd tree | grep down
```

## Step 5: Bring Up Remaining Nodes

Bring up remaining nodes and wait for OSDs to peer:

```bash
watch -n 5 ceph -s
```

Monitor the transition from `degraded` to `active+clean`:

```bash
ceph pg stat
```

## Step 6: Remove noout and Allow Recovery

Once all OSDs are up and peering:

```bash
ceph osd unset noout
ceph -s
```

## Step 7: Verify Data Integrity

Trigger deep scrub to verify data integrity after power loss:

```bash
ceph osd pool ls | xargs -I{} ceph osd pool unset {} nodeep-scrub
ceph osd pool ls | xargs -I{} ceph osd pool deep-scrub {}
```

Watch for scrub errors:

```bash
ceph health detail | grep scrub
```

## Rook-Specific Recovery

In Rook, the operator will attempt to reconcile the cluster automatically. Force reconciliation if needed:

```bash
kubectl -n rook-ceph annotate cephcluster rook-ceph \
  rook.io/force-reconcile=$(date +%s)
```

## Summary

Recovering a Ceph cluster after total power loss requires a structured approach: verify hardware, restore monitor quorum, set `noout` before bringing OSDs up, allow WAL replay, then release recovery. Deep scrubbing afterward verifies data integrity. In Rook environments, the operator automates much of the recovery process when nodes come back online.
