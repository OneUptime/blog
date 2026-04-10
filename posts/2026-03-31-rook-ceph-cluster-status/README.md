# How to Check Cluster Status with ceph status and ceph -s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Cluster, Health

Description: Use ceph status and ceph -s commands to get a comprehensive view of your Rook-Ceph cluster health, OSD state, and I/O activity.

---

`ceph status` (shorthand: `ceph -s`) is the first command to run when diagnosing a Ceph cluster. It provides a snapshot of health, active components, and current I/O rates in a single output.

## Run ceph status via Rook Toolbox

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph status
```

Or use the shorthand:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph -s
```

## Understanding the Output

```text
  cluster:
    id:     a3f8e12d-1234-5678-abcd-000000000000
    health: HEALTH_OK

  services:
    mon: 3 daemons, quorum a,b,c (age 2d)
    mgr: a(active, since 2d), standbys: b
    mds: myfs:1 {0=myfs-b=up:active} 1 up:standby
    osd: 6 OSDs; 6 up (since 2d), 6 in (since 5d)

  data:
    volumes: 1/1 healthy
    pools:   5 pools, 113 pgs
    objects: 12.34k objects, 45 GiB
    usage:   137 GiB used, 425 GiB / 562 GiB avail
    pgs:     113 active+clean

  io:
    client:   1.2 MiB/s rd, 512 KiB/s wr, 128 op/s rd, 32 op/s wr
```

## Key Sections Explained

**cluster**: Shows the cluster UUID and overall health status (HEALTH_OK, HEALTH_WARN, or HEALTH_ERR).

**services**: Lists active Ceph daemons - monitors, managers, MDS, and OSD counts with up/in states.

**data**: Shows total pools, PG count, object count, logical data size, raw usage, and available capacity.

**io**: Current client I/O rates (reads/writes in bandwidth and operations per second).

## Parse JSON Output

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph status --format json-pretty
```

Extract specific fields:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph status --format json | python3 -c "
import json, sys
s = json.load(sys.stdin)
print('Status:', s['health']['status'])
print('OSDs up:', s['osdmap']['num_up_osds'])
print('PGs active+clean:', sum(
    item['count'] for item in s['pgmap'].get('pgs_by_state', [])
    if item['state_name'] == 'active+clean'
))
print('Usage:', s['pgmap']['bytes_used'] // (1024**3), 'GiB used')
"
```

## Monitor with Watch Mode

For continuous monitoring, use `ceph -w` (covered separately) or watch `ceph -s`:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  watch -n 5 ceph -s
```

This refreshes the status every 5 seconds inside the toolbox pod.

## Common Health States

| State | Meaning |
|---|---|
| `HEALTH_OK` | All services healthy, no degradation |
| `HEALTH_WARN` | Minor issues; check `ceph health detail` |
| `HEALTH_ERR` | Critical issue requiring immediate attention |

## Check Health from Outside the Pod

If you have the Rook Ceph operator configured with the monitoring service, you can also check cluster status via the Ceph dashboard or Prometheus metrics:

```bash
kubectl get cephcluster -n rook-ceph -o jsonpath='{.items[0].status.ceph.health}'
```

## Summary

`ceph status` (or `ceph -s`) provides an at-a-glance view of your Rook-Ceph cluster: health status, daemon counts, pool and PG state, data usage, and live I/O rates. Run it as the first diagnostic step whenever you suspect cluster issues. Use `--format json` for scripting and monitoring integration.
