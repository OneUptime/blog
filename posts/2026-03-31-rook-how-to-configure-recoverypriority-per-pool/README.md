# How to Configure recovery_priority Per Pool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Storage, Performance

Description: Configure per-pool recovery priority in Ceph to ensure critical pools recover faster than less important ones after OSD failures or cluster events.

---

## What Is recovery_priority in Ceph

When multiple Ceph pools have degraded placement groups, they all compete for recovery I/O bandwidth. The `recovery_priority` setting allows you to control which pools recover first.

- Higher values = higher priority (recovers sooner)
- Default value = 0 for all pools
- Range: -10 (lowest) to 10 (highest)

## Step 1 - Check Current Pool Priorities

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool ls detail | grep -E "name|recovery"
```

Or check a specific pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool get <pool-name> recovery_priority
```

Output:

```text
recovery_priority: 0
```

## Step 2 - Set recovery_priority on a Pool

Set a high priority for a critical database pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set database-pool recovery_priority 5
```

Set a low priority for an archive pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set archive-pool recovery_priority -5
```

Verify the settings:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool get database-pool recovery_priority
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool get archive-pool recovery_priority
```

## Step 3 - Set recovery_priority in Rook CRD

Configure recovery priority directly in the `CephBlockPool` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: database-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    recovery_priority: "5"
```

For the archive pool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: archive-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    recovery_priority: "-5"
```

Apply:

```bash
kubectl apply -f database-pool.yaml
kubectl apply -f archive-pool.yaml
```

## Step 4 - Understanding How Priority Affects Recovery

When multiple pools have degraded PGs, Ceph's OSD recovery scheduler considers `recovery_priority` when selecting which PGs to recover next. PGs from higher priority pools are scheduled for recovery before those from lower priority pools.

This is especially important in mixed-criticality environments:

| Pool | Purpose | recovery_priority |
|------|---------|-------------------|
| database-rbd | PostgreSQL PVCs | 5 |
| application-rbd | Web app PVCs | 0 |
| metrics-pool | Prometheus data | -2 |
| archive-pool | Cold backups | -5 |

## Step 5 - Combine with Recovery Throttling

For fine-grained control, combine pool priority with global recovery throttling:

```bash
# Limit total recovery speed to protect client I/O
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* injectargs '--osd-recovery-max-active=2'
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* injectargs '--osd-max-backfills=1'
```

Even with throttling, PGs from high-priority pools will still be recovered before those from lower-priority pools.

## Step 6 - Monitor Per-Pool Recovery Progress

Check how quickly each pool is recovering:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump_pools_json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for pool in data.get('pool_stats', []):
    name = pool.get('poolname', 'unknown')
    degraded = pool.get('stat_sum', {}).get('num_objects_degraded', 0)
    if degraded > 0:
        print(f'{name}: {degraded} objects degraded')
"
```

## Step 7 - Reset Priority After Recovery

After recovery is complete, optionally reset priorities to default:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set database-pool recovery_priority 0
```

Or leave non-default priorities in place as a permanent configuration to always prioritize critical pools in future recovery events.

## Summary

Per-pool `recovery_priority` in Ceph controls which pools recover first when multiple pools are degraded simultaneously. Set higher values (up to 10) on critical pools like databases and lower values (down to -10) on archive or test pools. Configure this in Rook via the `parameters` section of `CephBlockPool` resources for GitOps-managed priority settings. Combine with global recovery throttling to balance recovery speed against client I/O performance.
