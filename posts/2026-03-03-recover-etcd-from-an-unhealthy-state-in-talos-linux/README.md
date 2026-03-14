# How to Recover etcd from an Unhealthy State in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Etcd, Recovery, Kubernetes, Troubleshooting, Cluster Health

Description: Diagnose and fix unhealthy etcd members in a Talos Linux cluster to restore full cluster operation and stability.

---

An unhealthy etcd cluster does not always mean total failure. Sometimes one member is lagging, another has corrupted data, or the cluster is stuck in a bad state after a network partition. These situations are recoverable without restoring from a full backup, but they require careful diagnosis and the right steps. This guide walks through identifying and fixing common etcd health issues in Talos Linux.

## Diagnosing etcd Health Issues

Start by understanding what is wrong. Talos provides several ways to check etcd health.

### Basic Health Check

```bash
# Check etcd status - this shows leader, member status, and DB size
talosctl etcd status --nodes <cp-node-1>

# Check all members
talosctl etcd members --nodes <cp-node-1>
```

A healthy three-member cluster should show:

- All three members listed
- One member as the leader
- Similar DB sizes across members
- No error messages

### Reading etcd Logs

```bash
# Check etcd logs for errors
talosctl logs etcd --nodes <cp-node-1> | tail -50

# Look for specific error patterns
talosctl logs etcd --nodes <cp-node-1> | grep -i "error\|warn\|fail"

# Common error messages and what they mean:
# "rafthttp: failed to reach peer" - network connectivity issue
# "etcdserver: request timed out" - performance problem
# "mvcc: database space exceeded" - database is full
# "wal: crc mismatch" - data corruption
# "snap: checksum mismatch" - snapshot corruption
```

### Checking Member Connectivity

```bash
# Verify control plane nodes can communicate
talosctl services --nodes <cp-node-1>,<cp-node-2>,<cp-node-3>

# Check etcd from each member's perspective
talosctl etcd status --nodes <cp-node-1>
talosctl etcd status --nodes <cp-node-2>
talosctl etcd status --nodes <cp-node-3>

# If a member cannot see the others, it is a network issue
```

## Common Unhealthy States and Fixes

### Problem: One Member is Not Syncing

If one etcd member falls behind and is not catching up:

```bash
# Check if the member is listed but unhealthy
talosctl etcd members --nodes <healthy-cp-node>

# Look for the lagging member in etcd logs
talosctl logs etcd --nodes <lagging-node> | grep -i "snapshot\|sync\|raft"
```

Fix: Restart the etcd service on the lagging node:

```bash
# Restart etcd on the lagging node
# In Talos, this is done by restarting the service
talosctl service etcd restart --nodes <lagging-node>

# Wait for it to catch up
sleep 30
talosctl etcd status --nodes <healthy-cp-node>
```

### Problem: Database Space Exceeded

etcd has a default space quota. When the database exceeds this quota, it stops accepting writes.

```bash
# Check database size
talosctl etcd status --nodes <cp-node-1>
# Look at the DB SIZE column

# If the database is near or at the quota limit,
# check etcd logs for space-related warnings
talosctl logs etcd --nodes <cp-node-1> | grep -i "space\|quota\|compact"
```

Fix: Compact and defragment the database:

```bash
# etcd in Talos is configured with auto-compaction,
# but if it has fallen behind, the compaction needs to catch up

# Check if compaction is running
talosctl logs etcd --nodes <cp-node-1> | grep compact

# If the database is still too large after compaction,
# defragmentation may be needed
# Note: Talos handles this automatically in most cases

# In extreme cases, you may need to increase the quota
# through a machine config patch:
```

```yaml
# Machine config patch to increase etcd quota
cluster:
  etcd:
    extraArgs:
      quota-backend-bytes: "8589934592"  # 8GB
```

### Problem: Member Has Corrupted Data

If etcd logs show CRC mismatches or snapshot corruption:

```bash
# Identify the corrupted member
talosctl logs etcd --nodes <suspected-node> | grep -i "crc\|corrupt\|mismatch"
```

Fix: Remove and re-add the corrupted member:

```bash
# Step 1: Get the member ID of the corrupted node
talosctl etcd members --nodes <healthy-cp-node>

# Step 2: Remove the corrupted member from the cluster
talosctl etcd remove-member --nodes <healthy-cp-node> <corrupted-member-id>

# Step 3: Wipe etcd data on the corrupted node
talosctl reset --nodes <corrupted-node> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

# Step 4: Apply the machine configuration again
# The node will rejoin the etcd cluster with fresh data
talosctl apply-config --nodes <corrupted-node> \
  --file cp-node-config.yaml

# Step 5: Verify the member has rejoined
talosctl etcd members --nodes <healthy-cp-node>
```

### Problem: Frequent Leader Elections

If the etcd leader keeps changing, it usually indicates network instability or performance issues:

```bash
# Check leader changes
talosctl logs etcd --nodes <cp-node-1> | grep -i "leader\|election\|campaign"

# Check disk performance
talosctl logs etcd --nodes <cp-node-1> | grep -i "slow\|took too long"
```

Fix: Address the underlying cause:

```bash
# If it is a disk performance issue, check disk latency
talosctl dmesg --nodes <cp-node-1> | grep -i "disk\|io\|write"

# If it is a network issue, check connectivity
talosctl logs etcd --nodes <cp-node-1> | grep "failed to reach peer"

# Consider tuning etcd parameters in the machine config:
```

```yaml
# Machine config patch for etcd tuning
cluster:
  etcd:
    extraArgs:
      heartbeat-interval: "500"        # Default: 100ms
      election-timeout: "5000"         # Default: 1000ms
```

Increasing these timeouts gives etcd more tolerance for slow disks or network jitter, but reduces the speed at which the cluster detects a truly failed member.

### Problem: Split Brain After Network Partition

If a network partition split the etcd cluster and both sides accepted writes:

```bash
# This is rare but serious
# Check if members disagree on the cluster state
talosctl etcd status --nodes <cp-node-1>
talosctl etcd status --nodes <cp-node-2>
talosctl etcd status --nodes <cp-node-3>

# Look for different leader IDs or cluster IDs
```

Fix: This usually requires picking one side's data and restoring from it:

```bash
# Take a snapshot from the side with the most recent/correct data
talosctl etcd snapshot ./recovery-snapshot.db --nodes <preferred-node>

# Reset all nodes and bootstrap from the snapshot
# Follow the full recovery procedure
```

## Monitoring etcd Health Proactively

Set up monitoring to catch etcd issues before they become critical:

```bash
# Key metrics to alert on:

# 1. etcd member count
# Alert if it drops below expected count

# 2. etcd leader changes
# Alert if more than 3 leader changes in 10 minutes

# 3. etcd proposal failures
# Alert if proposals are consistently failing

# 4. etcd disk WAL fsync duration
# Alert if 99th percentile exceeds 100ms

# 5. etcd database size
# Alert when approaching the quota
```

If you run Prometheus, these metrics are available from the etcd /metrics endpoint:

```yaml
# Prometheus alerting rules for etcd health
groups:
  - name: etcd
    rules:
      - alert: EtcdMemberDown
        expr: count(etcd_server_has_leader) < 3
        for: 5m
        labels:
          severity: critical
      - alert: EtcdHighLeaderChanges
        expr: increase(etcd_server_leader_changes_seen_total[10m]) > 3
        for: 1m
        labels:
          severity: warning
```

## When to Restore from Backup vs. Fix in Place

Use this decision tree:

- Single member unhealthy, quorum intact: Fix in place (remove and re-add the member)
- Performance issues: Tune configuration, upgrade hardware
- Database space issues: Compact and defragment
- Multiple members corrupted but quorum exists: Fix one at a time
- Quorum lost: Restore from backup
- Split brain: Restore from backup

## Summary

Recovering etcd from an unhealthy state in Talos Linux starts with diagnosis. Check the member list, read the logs, and identify whether the problem is network-related, performance-related, or data corruption. Most single-member issues can be resolved by removing and re-adding the member with fresh data. More serious problems like quorum loss or split brain require restoring from a backup. Monitor etcd health proactively to catch problems early, before they escalate into cluster-wide outages.
