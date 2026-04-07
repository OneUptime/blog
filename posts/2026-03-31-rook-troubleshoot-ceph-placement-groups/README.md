# How to Troubleshoot Ceph Placement Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Storage, Kubernetes, Troubleshooting

Description: Learn how to diagnose and fix placement group issues in Ceph including stuck, degraded, and inconsistent PG states.

---

## Understanding Ceph Placement Groups

Placement Groups (PGs) are internal data management units in Ceph that distribute objects across OSDs. When PGs enter abnormal states such as stuck, degraded, or inconsistent, your cluster's health degrades and writes may be blocked. Understanding how to troubleshoot PG issues is essential for keeping a Ceph cluster healthy.

## Checking PG Status

Start by examining overall cluster health and PG state:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

To see a breakdown of all PG states:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

For a full dump of all PGs and their states:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump | head -60
```

## Identifying Stuck PGs

Stuck PGs are among the most common problems. Use the `dump_stuck` command to list them:

```bash
# List PGs stuck in inactive state
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump_stuck inactive

# List PGs stuck in unclean state
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump_stuck unclean

# List PGs stuck in stale state
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump_stuck stale
```

## Diagnosing a Specific PG

Once you have a PG ID from the above output, query it directly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg 2.1f query
```

This output shows the PG state, its acting OSD set, up set, and any blocked recovery operations. Look at the `state` field and `info.last_epoch_clean` to understand how long the PG has been unhealthy.

## Common PG States and What They Mean

| State | Meaning |
|---|---|
| `active+clean` | Healthy, all replicas present |
| `degraded` | Some replicas are missing but the PG is still accessible |
| `inactive` | PG cannot serve I/O, waiting for OSDs |
| `stale` | No OSD has reported in for this PG recently |
| `inconsistent` | Scrubbing found data inconsistency between replicas |
| `backfilling` | Data is being copied to a new OSD |
| `peering` | OSDs are negotiating state for the PG |

## Fixing Stuck Peering PGs

If PGs are stuck in the `peering` state, it usually means not enough OSDs are available. Check OSD status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

If an OSD is down, check its pod:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
```

Restart a failed OSD pod if needed:

```bash
kubectl -n rook-ceph delete pod <osd-pod-name>
```

## Repairing Inconsistent PGs

Inconsistent PGs are detected during scrubbing. To repair them:

```bash
# Trigger a repair on a specific PG
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg repair 2.1f
```

After the repair, monitor recovery progress:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -w
```

## Forcing PG Recovery

If PGs are stuck in a backfill queue and not progressing, you can force them:

```bash
# Raise the backfillfull threshold so backfill is not blocked by near-full OSDs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd set-backfillfull-ratio 0.95

# Force recovery on a specific PG
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg force-recovery 2.1f
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg force-backfill 2.1f
```

## Monitoring PG Recovery Progress

Use the following to monitor how many PGs are recovering and estimate time to full health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -w
```

The `-w` flag watches for real-time health events. You will see PG state transitions as OSDs come back up and recovery proceeds.

## Summary

Ceph placement group issues range from degraded replicas to fully stuck inactive PGs. By using commands like `ceph pg dump_stuck`, `ceph pg query`, and `ceph pg repair`, you can quickly diagnose and recover from most PG problems. Always check OSD status first since most PG issues trace back to one or more OSDs being unavailable.
