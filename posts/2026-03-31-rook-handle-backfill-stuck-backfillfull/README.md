# How to Handle Backfill Stuck at backfillfull Threshold in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Backfill, Troubleshooting, Storage, Recovery

Description: Resolve Ceph PGs stuck in backfill_toofull state by understanding the backfillfull threshold, reclaiming space, and adjusting fill ratios to unblock data recovery.

---

## What is backfillfull?

Ceph stops sending backfill (data migration) to an OSD when it reaches the `backfillfull` ratio, which defaults to 90% of `full_ratio` (itself defaulting to 95% of OSD capacity). This safety threshold prevents OSDs from filling completely during recovery, which would cause write errors for clients.

PGs stuck in `backfill_toofull` state means recovery cannot complete because target OSDs don't have enough free space to receive additional data.

## Diagnosing the Problem

Check for backfill_toofull PGs:

```bash
# Find stuck PGs
ceph pg ls backfill_toofull | head -20
ceph pg dump_stuck | grep toofull

# Check OSD fill ratios
ceph osd df | sort -k7 -n | tail -10  # Sort by % used

# View current thresholds
ceph config get osd osd_backfillfull_ratio
ceph config get osd osd_full_ratio
ceph config get osd osd_nearfull_ratio
```

## Understanding Fill Thresholds

Default thresholds and their effects:

| Threshold | Default | Effect |
|-----------|---------|--------|
| nearfull | 85% | Warning: `HEALTH_WARN` |
| backfillfull | 90% | Backfill to this OSD stops |
| full | 95% | Writes to this OSD stop |

## Immediate Fixes

### Option 1: Temporarily Lower backfillfull Ratio

Allow backfill to proceed by raising the threshold temporarily:

```bash
# Increase to give more headroom (use carefully)
ceph config set osd osd_backfillfull_ratio 0.92

# Monitor progress
watch -n 30 'ceph pg ls backfill_toofull | wc -l'

# Restore after recovery completes
ceph config rm osd osd_backfillfull_ratio
```

### Option 2: Delete Unnecessary Data

Free space on near-full OSDs:

```bash
# Find OSDs over 90% full
ceph osd df | awk '$8 > 90 {print "OSD", $1, "is", $8"% full"}'

# Check which pools are largest
ceph df detail | sort -k4 -n | tail -10

# Delete snapshots or expired data
rbd snap ls <pool>/<image>
rbd snap rm <pool>/<image>@<snap-name>
```

### Option 3: Reweight Near-Full OSDs

Reduce the target weight of full OSDs to direct new data elsewhere:

```bash
# Reduce weight of OSD at 93% capacity
ceph osd crush reweight osd.5 0.8

# Alternatively use the auto-reweight tool
ceph osd reweight-by-utilization 95  # Reweight OSDs above 95% of average
```

### Option 4: Add More Storage

The root fix - add OSDs to the cluster:

```yaml
# Add new OSDs via Rook CephCluster
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
    - name: "new-node"
      devices:
      - name: "sda"
      - name: "sdb"
```

## Unblocking Specific Pools

If only one pool is critical, prioritize its recovery:

```bash
# Force primary affinity away from full OSDs
ceph osd primary-affinity osd.5 0.0

# Or manually remap specific PGs away from full OSDs
ceph osd pg-upmap-items 3.4f 5 8  # Replace OSD 5 with OSD 8 for this PG
```

## Monitoring Recovery Unblocking

After applying fixes, watch PGs clear the stuck state:

```bash
watch -n 10 '
echo "=== Backfill toofull PGs ==="
ceph pg ls backfill_toofull | wc -l
echo "=== OSD Fill Levels ==="
ceph osd df | awk "\$8 > 85" | head -10
echo "=== Cluster Status ==="
ceph -s | tail -10
'
```

## Preventing Future Occurrences

Set up capacity alerts before reaching backfillfull:

```bash
# Alert at 75% (earlier warning)
ceph config set mon mon_osd_nearfull_ratio 0.75

# Implement capacity monitoring
ceph mgr module enable prometheus
# Alert when ceph_osd_stat_bytes_used/ceph_osd_stat_bytes > 0.80
```

## Summary

PGs stuck at `backfill_toofull` indicate OSDs are too full to receive recovery data. Immediate remediation options include temporarily raising the backfillfull ratio, deleting snapshot data to free space, reweighting full OSDs, or adding new storage. The permanent solution is proactive capacity planning - maintaining at least 20% free space on all OSDs ensures backfill always has room to complete even after unexpected data growth.
