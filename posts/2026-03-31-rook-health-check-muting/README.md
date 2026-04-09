# How to Manage Health Check Muting and Unmuting in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Health, Monitoring, Maintenance

Description: Use Ceph health check muting to suppress known non-urgent warnings during maintenance, and learn when to unmute health checks safely.

---

Ceph generates health warnings when it detects conditions that deviate from ideal cluster state. During maintenance windows or when a known issue is being resolved, these warnings can create noise. Ceph 15.x+ (Octopus and later) provides a health check muting system to suppress specific warnings temporarily.

## Why Mute Health Checks

Valid reasons to mute a health check:

- An OSD disk replacement is in progress and `OSD_DOWN` is expected
- You intentionally have `noscrub` set and don't want the warning
- A hardware upgrade is causing temporary `MON_CLOCK_SKEW`
- A known capacity issue is tracked in your ticketing system

**Never mute health checks to hide real problems** - only mute when you have a documented plan to resolve the underlying issue.

## Mute a Health Check

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute <HEALTH_CHECK_CODE>
```

Example - mute OSD down warning:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute OSD_DOWN
```

## List Currently Muted Health Checks

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep -A2 "muted"
```

Or view the full health status showing muted items:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
mutes = data.get('mutes', [])
for m in mutes:
    print(f'Muted: {m[\"code\"]} - expires: {m.get(\"ttl\", \"never\")}')
"
```

## Unmute a Health Check

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health unmute <HEALTH_CHECK_CODE>
```

Example:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health unmute OSD_DOWN
```

## Mute with a TTL (Time-to-Live)

Muting with a TTL automatically expires the mute after the specified duration:

```bash
# Mute for 2 hours
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute OSD_DOWN 2h

# Mute for 30 minutes
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute MON_CLOCK_SKEW 30m

# Mute for 1 day
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute OSD_NEARFULL 1d
```

After the TTL expires, the health check automatically becomes visible again.

## Common Health Check Codes

```text
OSD_DOWN             - One or more OSDs are down
OSD_NEARFULL         - An OSD is approaching full
POOL_NO_REDUNDANCY   - A pool has insufficient replicas
MON_CLOCK_SKEW       - Monitor clock is out of sync
OSDMAP_FLAGS         - OSD map flags like noscrub or nodeep-scrub are set
PG_DEGRADED          - Placement groups are under-replicated
```

## Maintenance Window Script

For planned maintenance, create a script that mutes expected warnings and unmutes after completion:

```bash
#!/bin/bash
TOOLBOX="kubectl exec -n rook-ceph deploy/rook-ceph-tools --"

# Mute expected warnings for 4-hour maintenance
$TOOLBOX ceph health mute OSD_DOWN 4h
$TOOLBOX ceph health mute PG_DEGRADED 4h

echo "Maintenance warnings muted for 4 hours"
echo "Remember to unmute after maintenance: ceph health unmute OSD_DOWN"
```

## Summary

Ceph health check muting suppresses specific warning codes using `ceph health mute <CODE>`, with optional TTL durations (`1h`, `30m`, `1d`). Use `ceph health unmute` to re-enable checks manually. Always mute with a TTL rather than indefinitely to ensure warnings re-surface if underlying issues are not resolved.
