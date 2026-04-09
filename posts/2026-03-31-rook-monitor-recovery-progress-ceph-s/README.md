# How to Monitor Recovery Progress with ceph -s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Monitoring, Storage

Description: Learn how to monitor Ceph recovery progress using ceph -s and related commands to track degraded PGs, recovery rate, and estimated completion time.

---

## Overview of ceph -s Output

The `ceph -s` command (shorthand for `ceph status`) provides a real-time snapshot of cluster health, including recovery progress. It is the primary tool for monitoring ongoing recovery operations.

```bash
ceph -s
```

Example output during active recovery:

```yaml
cluster:
  id:     abc123
  health: HEALTH_WARN
          Degraded data: 240/900 objects degraded (26.667%)
          recovery: 2 active+recovering

services:
  mon: 3 daemons, quorum a,b,c
  mgr: a(active)
  osd: 9 osds: 8 up, 9 in

data:
  pools:   3 pools, 96 pgs
  objects: 300 objects, 1.5 GiB
  usage:   10 GiB used, 170 GiB / 180 GiB avail
  pgs:     240/900 objects degraded (26.667%)
           2 active+recovering
           94 active+clean
```

## Tracking Recovery Rate

The recovery section shows current throughput. Watch it update in real time:

```bash
watch -n 2 ceph -s
```

For JSON output suitable for scripting:

```bash
ceph status --format json | python3 -c "
import sys, json
s = json.load(sys.stdin)
pg = s.get('pgmap', {})
print('Recovering:', pg.get('recovering_objects_per_sec', 0), 'obj/s')
print('Recovering:', pg.get('recovering_bytes_per_sec', 0), 'bytes/s')
print('Degraded ratio:', pg.get('degraded_ratio', 0))
"
```

## Detailed PG Recovery Status

List PGs currently in recovery:

```bash
ceph pg dump | grep recovering
```

Get a summary of PG states:

```bash
ceph pg stat
```

Show stuck PGs that are not making progress:

```bash
ceph pg dump_stuck unclean
ceph pg dump_stuck degraded
```

## Estimating Recovery Completion Time

Ceph does not provide a built-in ETA, but you can estimate it:

```bash
#!/bin/bash
DEGRADED=$(ceph status --format json | python3 -c "
import sys, json
s = json.load(sys.stdin)
pg = s.get('pgmap', {})
print(pg.get('degraded_objects', 0))
")
RATE=$(ceph status --format json | python3 -c "
import sys, json
s = json.load(sys.stdin)
pg = s.get('pgmap', {})
print(pg.get('recovering_objects_per_sec', 1))
")
echo "Estimated seconds remaining: $(echo "$DEGRADED / $RATE" | bc)"
```

## Checking Individual OSD Recovery

Get recovery stats per OSD:

```bash
ceph osd pool stats
ceph osd perf
```

Monitor recovery through the Ceph manager dashboard or Prometheus:

```text
ceph_pg_recovering_bytes_per_sec
ceph_pg_degraded
```

## Recovery in Rook-Ceph

Run all monitoring commands from the Rook toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch -n 2 ceph -s
```

## Summary

`ceph -s` is the primary window into recovery progress, showing degraded object counts, recovery rates, and PG states. Combining it with `ceph pg dump_stuck` and JSON output parsing allows operators to estimate completion time and identify stalled recovery. In Rook environments, the toolbox pod provides convenient access to all monitoring commands.
