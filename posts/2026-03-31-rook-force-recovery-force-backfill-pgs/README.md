# How to Force Recovery and Force Backfill for PGs in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Placement Group, Storage

Description: Learn how to use Ceph's force-recovery and force-backfill commands to immediately prioritize specific placement groups during cluster healing.

---

## When to Force Recovery or Backfill

Ceph normally heals placement groups (PGs) in a default order determined by internal priority. In production, you may need to accelerate healing for specific PGs - for example, a PG hosting critical data that is degraded while other less-important PGs are being recovered first.

Ceph provides two commands to override this ordering:
- `pg force-recovery` - prioritizes re-replication after OSD failures
- `pg force-backfill` - prioritizes data migration when PGs are remapped

## Identifying PGs That Need Forced Operations

Start by finding PGs in degraded or backfilling states:

```bash
# Show cluster health and degraded PG count
ceph -s

# List all PGs with their states
ceph pg dump pgs_brief | awk '{print $1, $2}' | grep -E "degraded|backfill|recovering"

# Find specific degraded PGs
ceph health detail | grep "pg"
```

Example output showing PGs needing attention:

```text
pg 3.4a is active+degraded (2 objects degraded)
pg 1.ff is active+backfill_wait
```

## Using force-recovery

The `force-recovery` command moves a PG to the top of the recovery queue:

```bash
# Force recovery on a single PG
ceph pg force-recovery 3.4a

# Force recovery on multiple PGs at once
ceph pg force-recovery 3.4a 1.23 2.ff

# Check the PG state after forcing
ceph pg 3.4a query | python3 -m json.tool | grep state
```

The PG will begin recovery immediately, ahead of other PGs in the queue.

## Using force-backfill

When a PG is waiting in backfill_wait state, use force-backfill:

```bash
# Force backfill on a specific PG
ceph pg force-backfill 1.ff

# Verify the PG is now actively backfilling
ceph pg dump pgs | grep "1.ff"
```

## Canceling Forced Operations

If you want to revert to normal priority ordering:

```bash
# Cancel forced recovery
ceph pg cancel-force-recovery 3.4a

# Cancel forced backfill
ceph pg cancel-force-backfill 1.ff

# Cancel all forced operations for multiple PGs
ceph pg cancel-force-recovery 3.4a 1.23 2.ff
```

## Monitoring After Forcing

Track the progress of forced operations:

```bash
# Watch cluster recovery in real time
watch -n 3 ceph -s

# Show recovery and PG statistics
ceph pg stat

# Check specific PG progress
ceph pg 3.4a query | python3 -m json.tool | grep -E "state|objects_degraded"
```

## Scripting Bulk Force-Recovery

For clusters with many degraded PGs, use a script to force-recover all at once:

```bash
#!/bin/bash
# Force recovery on all degraded PGs
degraded_pgs=$(ceph pg dump pgs_brief 2>/dev/null | awk '$2 ~ /degraded/ {print $1}')
if [ -n "$degraded_pgs" ]; then
  ceph pg force-recovery $degraded_pgs
  echo "Forced recovery on: $degraded_pgs"
else
  echo "No degraded PGs found"
fi
```

## Summary

`pg force-recovery` and `pg force-backfill` are essential operational tools for directing Ceph's healing process toward specific placement groups. Use them when critical data needs to be recovered ahead of schedule, and cancel them with the corresponding cancel commands to restore default priority ordering after the emergency is resolved.
