# How to Use the ceph status Command Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CLI, Status, Monitoring, Operation

Description: Master the ceph status command to quickly assess cluster health, identify issues, and understand output sections for effective Ceph operations.

---

## Introduction

`ceph status` (or `ceph -s`) is the first command to run when diagnosing a Ceph cluster. Its output is dense but structured. Understanding each section helps you quickly identify problems and prioritize remediation. This guide breaks down every part of the output.

## Running ceph status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Example output:

```yaml
  cluster:
    id:     8a1b2c3d-4e5f-6789-abcd-ef0123456789
    health: HEALTH_OK

  services:
    mon: 3 daemons, quorum a,b,c (age 2d)
    mgr: a(active, since 2d), standbys: b
    mds: 1/1 daemons up, 1 hot standby
    osd: 6 osds: 6 up (since 2d), 6 in (since 2d)
    rgw: 2 daemons active (1 hosts, 1 zones)

  data:
    volumes: 1/1 healthy
    pools:   8 pools, 193 pgs
    objects: 12.3k objects, 45 GiB
    usage:   135 GiB used, 865 GiB / 1 TiB avail
    pgs:     193 active+clean
```

## Understanding the cluster Section

- `id` - Unique cluster identifier, useful for support tickets
- `health` - `HEALTH_OK`, `HEALTH_WARN`, or `HEALTH_ERR`

Always read `ceph health detail` when health is not `HEALTH_OK`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

## Understanding the services Section

```bash
mon: 3 daemons, quorum a,b,c
```

Three monitors in quorum is healthy. Fewer than majority is an emergency.

```bash
osd: 6 osds: 6 up (since 2d), 6 in (since 2d)
```

All OSDs should be `up` and `in`. OSDs that are `down` or `out` indicate problems.

## Understanding the data Section

```bash
pgs:     193 active+clean
```

All PGs should be `active+clean`. Common non-clean states:

- `degraded` - Fewer replicas than desired
- `recovering` - Replication is in progress
- `backfilling` - Rebalancing data to new OSDs
- `stale` - PG hasn't been reported by OSDs recently
- `inconsistent` - Scrub errors detected

## Using Watch Mode for Live Monitoring

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch -n 5 ceph status
```

## Parsing Status Programmatically

Get JSON output for scripting:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph status --format json | python3 -m json.tool
```

Extract specific fields:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph status --format json | python3 -c "
import sys, json
s = json.load(sys.stdin)
print('Health:', s['health']['status'])
print('OSDs up:', s['osdmap']['num_up_osds'])
print('PGs:', s['pgmap']['num_pgs'])
"
```

## Summary Checklist

When running `ceph status`, verify:

1. `health: HEALTH_OK`
2. All monitors in quorum
3. All OSDs `up` and `in`
4. All PGs `active+clean`
5. Usage below 80% (`ceph df` for details)

## Summary

`ceph status` provides a complete cluster overview in seconds. Checking the health string, services section for daemon counts, and PG state summary covers 90% of day-to-day operational needs. Using `--format json` enables programmatic health checks in monitoring scripts and automation pipelines.
