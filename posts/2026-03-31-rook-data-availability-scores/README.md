# How to Calculate Data Availability Scores in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Availability, PG, Health

Description: Calculate and interpret Ceph data availability scores by analyzing placement group states, degraded object counts, and replica availability percentages.

---

Ceph does not expose a single "availability score," but you can calculate one by analyzing placement group (PG) states and object counts. This score represents the fraction of your data that is fully replicated and accessible at any given moment.

## Understanding Data Availability

Data availability in Ceph depends on PG state:

| PG State | Availability |
|---|---|
| `active+clean` | 100% - all replicas present, fully available |
| `active+degraded` | Partial - data accessible but under-replicated |
| `active+recovering` | Partial - accessible, recovery in progress |
| `inactive` | 0% for affected PGs - no quorum |
| `active+undersized` | Partial - fewer replicas than configured |

## Get PG State Summary

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph pg stat
```

Sample output:

```text
113 pgs: 110 active+clean, 3 active+degraded; 45 GiB data, 137 GiB used, 425 GiB / 562 GiB avail; 15/1369 objects degraded (1.095%)
```

This shows 3 PGs with degraded objects - 1.095% of objects are degraded.

## Calculate Availability Percentage

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph pg stat --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
pgmap = data['pg_stats_sum']['stat_sum']

num_objects = pgmap.get('num_objects', 0)
degraded = pgmap.get('num_objects_degraded', 0)
unfound = pgmap.get('num_objects_unfound', 0)
misplaced = pgmap.get('num_objects_misplaced', 0)

if num_objects > 0:
    availability = (1 - (degraded + unfound) / num_objects) * 100
    print(f'Total objects: {num_objects}')
    print(f'Degraded: {degraded} ({degraded/num_objects*100:.3f}%)')
    print(f'Unfound: {unfound}')
    print(f'Misplaced: {misplaced}')
    print(f'Data availability: {availability:.3f}%')
else:
    print('No objects stored')
"
```

## Measure PG Health Distribution

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph pg stat --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
total_pgs = data.get('num_pgs', 0)
by_state = data.get('num_pg_by_state', [])

print(f'Total PGs: {total_pgs}')
for state_info in sorted(by_state, key=lambda x: -x['num']):
    pct = state_info['num'] / total_pgs * 100 if total_pgs > 0 else 0
    print(f\"  {state_info['state']}: {state_info['num']} ({pct:.1f}%)\")
"
```

## Track Availability Over Time

Create a simple monitoring script:

```bash
#!/bin/bash
while true; do
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  STATS=$(kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
    ceph pg stat --format json 2>/dev/null)

  DEGRADED=$(echo "$STATS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
pgmap = data['pg_stats_sum']['stat_sum']
total = pgmap.get('num_objects', 1)
deg = pgmap.get('num_objects_degraded', 0)
print(f'{deg/total*100:.4f}')
" 2>/dev/null)

  echo "$TIMESTAMP degraded_pct=$DEGRADED"
  sleep 60
done
```

## Availability During Recovery

When an OSD fails and Ceph begins recovery:

```bash
# Watch availability score during recovery
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph -w | grep -E "degraded|recovered|objects"
```

Expected pattern:

```text
2026-03-31T10:22:01 degraded 15/1369 objects (1.095%)
2026-03-31T10:22:45 recovery io 256 MiB/s, 64 objects/s
2026-03-31T10:24:22 degraded 0/1369 objects (0.000%)
```

## Check for Unfound Objects (Data Loss)

Unfound objects indicate potential data loss:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep unfound

# List PGs stuck in an unclean state (includes those with unfound objects)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph pg dump_stuck unclean
```

## Summary

Data availability in Ceph is calculated from PG states and object counts rather than a single metric. Use `ceph pg stat --format json` to extract `num_objects_degraded` and `num_objects_unfound` and compute availability as `(total - degraded - unfound) / total * 100`. A fully healthy cluster shows 100% of PGs in `active+clean` state. Monitor recovery progress with `ceph -w` to track how quickly availability returns to 100% after OSD failures.
