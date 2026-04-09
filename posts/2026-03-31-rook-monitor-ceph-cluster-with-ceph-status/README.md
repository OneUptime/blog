# How to Monitor a Ceph Cluster with ceph status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Status, Observability

Description: Learn how to use ceph status and related commands to monitor cluster health, capacity, and performance in a Rook-managed Ceph cluster.

---

## The ceph status Command

`ceph status` (or `ceph -s`) is the primary command for assessing cluster health at a glance. It shows monitor quorum status, OSD counts, data usage, and any active alerts.

Run it via the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s
```

Example output:

```text
  cluster:
    id:     a7f64266-0894-4f1e-a635-d0aeaca0e993
    health: HEALTH_OK

  services:
    mon: 3 daemons, quorum a,b,c (age 2h)
    mgr: a(active, since 2h)
    mds: 1/1 daemons up
    osd: 12 osds: 12 up (since 2h), 12 in (since 2d)

  data:
    volumes: 1/1 healthy
    pools:   4 pools, 256 pgs
    objects: 12.34k objects, 47.2 GiB
    usage:   142 GiB used, 1.02 TiB / 1.16 TiB avail
    pgs:     256 active+clean
```

## Understanding Health Status

Ceph reports three health states:

- `HEALTH_OK` - cluster is fully operational
- `HEALTH_WARN` - cluster is functional but has non-critical issues
- `HEALTH_ERR` - cluster has critical issues that may affect data availability

Get detailed health messages:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

## Monitoring in Real-Time

Watch cluster status continuously with a 5-second refresh:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch -n 5 ceph -s
```

## Checking Specific Subsystems

Monitor quorum:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status
```

OSD status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

Pool usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df detail
```

## Monitoring I/O Performance

Check per-OSD commit and apply latency:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd perf
```

View cluster-wide I/O statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados df
```

## Interpreting PG States

The `pgs` line in `ceph -s` shows placement group states. Healthy clusters show:

```text
pgs: 256 active+clean
```

Degraded states to watch for:

```text
active+degraded      - data is accessible but not fully replicated
active+recovering    - data is being resynced
peering              - PGs are negotiating their state
stale                - monitor has not received a PG report recently
```

## Prometheus Integration in Rook

For continuous monitoring, Rook exposes Ceph metrics via the Ceph Manager's Prometheus module:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mgr module enable prometheus
```

## Summary

`ceph -s` is your starting point for monitoring a Ceph cluster. It summarizes monitor quorum, OSD counts, data usage, and PG health. Drill down with `ceph health detail`, `ceph osd tree`, and `ceph df` for specific subsystem information. In Rook environments, combine CLI monitoring with Prometheus and Grafana for persistent metrics dashboards.
