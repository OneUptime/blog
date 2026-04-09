# How to Handle PGs Stuck in Peering State in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, Placement Group, Peering, Operation

Description: Diagnose and resolve Ceph placement groups stuck in the peering state by identifying blocked OSDs, resolving quorum issues, and forcing PG recovery when necessary.

---

## What is Peering?

Peering is the process by which a Ceph PG's acting OSDs agree on the current state of all objects in the PG. A PG stuck in "peering" means its OSDs cannot reach consensus - usually because some OSDs are down or unavailable.

During peering, the PG is not accessible for reads or writes, making it the most critical PG state to resolve quickly.

## Identifying Stuck Peering PGs

```bash
# List PGs in peering state
ceph pg ls peering
ceph pg dump_stuck inactive

# Count peering PGs
ceph pg ls peering | wc -l

# Detailed status for a specific PG
ceph pg 3.4f query | python3 -m json.tool | head -50
```

Sample PG query output showing peering:

```json
{
  "state": "peering",
  "acting": [2, 5, 7],
  "up": [2, 5, 7],
  "last_peering_reset": "2024-01-15T14:23:11",
  "peering_blocked_by": [{"osd": 7, "current_lost_at": 1234567}]
}
```

## Diagnosing the Root Cause

Check which OSDs are blocking peering:

```bash
# Which OSDs are down?
ceph osd tree | grep down

# Are the blocking OSDs actually unreachable?
ceph daemon osd.7 status 2>/dev/null || echo "OSD 7 is not responding"

# Check OSD logs for crash reason
journalctl -u ceph-osd@7 --since "2 hours ago" | tail -50

# Check network connectivity to OSD node
ping -c 3 osd-node-3
```

Common causes of peering failures:
- OSD daemon crashed and hasn't restarted
- Node is unreachable (network partition, hardware failure)
- OSD disk is full (writes fail, OSD stops)
- OSD clock skew too large (NTP issue)

## Resolving Peering Issues

### Case 1: OSD Daemon Crashed

Restart the OSD on the affected node:

```bash
# On the OSD node
systemctl status ceph-osd@7
systemctl restart ceph-osd@7
journalctl -u ceph-osd@7 -f
```

In Rook (Kubernetes):

```bash
kubectl delete pod -n rook-ceph $(kubectl get pod -n rook-ceph \
    -l app=rook-ceph-osd,ceph-osd-id=7 -o name | sed 's/pod\///')
```

### Case 2: OSD Node is Unreachable

If the node will return soon, set noout to prevent data migration:

```bash
ceph osd set noout

# Investigate node: check power, network, hardware
# After node returns, OSD will automatically rejoin
ceph osd unset noout
```

### Case 3: Permanently Failed OSD

If the OSD cannot recover:

```bash
# Mark OSD out to initiate recovery with remaining OSDs
ceph osd out osd.7

# Wait for peering to complete with remaining OSDs
watch -n 15 'ceph pg ls peering | wc -l'

# After peering clears, purge the dead OSD
ceph osd purge osd.7 --yes-i-really-mean-it
```

### Case 4: Clock Skew

Fix NTP on the affected node:

```bash
# Check time difference
ceph health detail | grep skew

# Sync NTP
chronyc tracking
chronyc sources
systemctl restart chronyd

# Verify skew is resolved
timedatectl status
```

## Forcing PG Recovery

If PGs remain stuck after OSDs recover, force them:

```bash
# Force recovery for specific PGs
ceph pg force-recovery 3.4f 3.5a 3.6b

# Force backfill for a PG
ceph pg force-backfill 3.4f

# Cancel force if needed
ceph pg cancel-force-recovery 3.4f
```

## Preventing Peering Issues

Keep OSDs healthy and cluster well-sized:

```bash
# Monitor OSD up/down ratio
ceph osd stat

# Ensure min_size is set correctly
ceph osd pool get <pool> min_size  # Should be size-1 or size/2+1

# Check that OSDs have free space (full OSDs stop)
ceph osd df | awk '$11 > 85 {print "WARNING: OSD", $1, "at", $11"% full"}'
```

## Summary

PGs stuck in peering state indicate OSDs participating in the PG cannot communicate to agree on object state. Resolution follows a clear path: identify which OSDs are blocking peering, determine why (crash, network, full disk, clock skew), restart or repair the blocking OSD, and use `force-recovery` if PGs remain stuck after the OSD returns. Preventing peering issues requires maintaining OSD health, adequate free space, and synchronized time across all nodes.
