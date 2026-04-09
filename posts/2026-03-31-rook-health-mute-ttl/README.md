# How to Configure TTL for Muted Health Checks in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Health, TTL, Maintenance

Description: Configure time-to-live (TTL) durations for muted Ceph health checks to ensure suppressed warnings automatically expire after maintenance windows.

---

When muting Ceph health checks during maintenance, setting a TTL (time-to-live) ensures that suppressed warnings automatically reappear after a specified duration. This prevents muted checks from being forgotten and hiding genuine cluster problems.

## Muting Without TTL (Indefinite Mute)

By default, `ceph health mute` without a duration creates a permanent mute:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute OSD_DOWN
```

This mute persists until manually removed with `ceph health unmute`. Indefinite mutes are risky - if the issue is not resolved, you will never see the warning again.

## Muting with a TTL Duration

Specify a duration to automatically expire the mute:

```bash
# Minutes
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute OSD_DOWN 30m

# Hours
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute OSD_DOWN 2h

# Days
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute OSD_NEARFULL 7d
```

## Supported Duration Formats

| Format | Example | Duration |
|---|---|---|
| `Nm` | `30m` | N minutes |
| `Nh` | `4h` | N hours |
| `Nd` | `2d` | N days |
| `Nw` | `1w` | N weeks |

## View Active Mutes with Expiry Times

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for mute in data.get('mutes', []):
    code = mute['code']
    ttl = mute.get('ttl', 'indefinite')
    sticky = mute.get('sticky', False)
    print(f'Code: {code}, TTL: {ttl}, Sticky: {sticky}')
"
```

## Update a Mute's TTL

To extend a mute, simply re-run the mute command with the new TTL:

```bash
# Extend the OSD_DOWN mute to 4 more hours
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute OSD_DOWN 4h
```

This replaces the existing mute with the new TTL.

## Maintenance Window Muting Pattern

For structured maintenance windows, mute relevant checks at the start and let TTLs expire automatically:

```bash
#!/bin/bash
TOOLBOX="kubectl exec -n rook-ceph deploy/rook-ceph-tools --"
WINDOW="4h"

echo "Starting maintenance window - muting health checks for $WINDOW"

$TOOLBOX ceph health mute OSD_DOWN $WINDOW
$TOOLBOX ceph health mute PG_DEGRADED $WINDOW
$TOOLBOX ceph health mute OSDMAP_FLAGS $WINDOW

echo "Health checks muted until:"
$TOOLBOX ceph health detail --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for m in data.get('mutes', []):
    print(f'  {m[\"code\"]}: expires in {m.get(\"ttl\", \"never\")}')
"
```

## What Happens When a Mute Expires

When a TTL expires:
1. The mute is automatically removed
2. If the underlying condition still exists, the health check becomes active again
3. `ceph health` will show the warning or error again
4. Alerts and monitoring systems will be notified

## Verify TTL is Set on Muted Checks

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep -A3 "muted"
```

## Summary

TTL-based health check muting in Ceph uses duration suffixes (`m`, `h`, `d`, `w`) with the `ceph health mute` command to automatically expire mutes after a defined period. Always prefer TTL muting over indefinite mutes to ensure health warnings surface again if underlying issues persist. Use `ceph health detail --format json` to inspect active mutes and their expiry times.
