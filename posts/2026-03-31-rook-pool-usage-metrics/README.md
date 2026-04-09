# How to View Pool-Specific Usage Metrics in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Monitoring, Metric

Description: View per-pool storage usage metrics in Ceph including object counts, stored data, raw consumption, and quota utilization using ceph df and rados df.

---

Per-pool usage metrics give you visibility into which pools are consuming the most space and whether pools are approaching their configured quotas. Ceph provides several commands to inspect these metrics at different levels of detail.

## Basic Pool Usage with ceph df

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph df
```

The `POOLS` section shows per-pool breakdown:

```text
POOL               ID  PGS  STORED   OBJECTS  USED     %USED  MAX AVAIL
replicapool         1  128  200 GiB   51.2k    600 GiB  3.57   5 TiB
myfs-data0          2   64  100 GiB   25.6k    300 GiB  1.79   5 TiB
ec-pool             3   64  300 GiB   76.8k    450 GiB  2.68   5 TiB
```

## Detailed Pool Stats with ceph df detail

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph df detail
```

Additional columns include:
- `DIRTY`: Unflushed data (for cache tiering)
- `USED COMPR`: Compressed size of data stored on disk
- `UNDER COMPR`: Original uncompressed size of data stored compressed
- `QUOTA OBJECTS`: Maximum objects allowed (0 = unlimited)
- `QUOTA BYTES`: Maximum bytes allowed (0 = unlimited)

## RADOS Object-Level Stats

For finer-grained per-pool object counts and cumulative I/O:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- rados df
```

Sample output:

```text
POOL_NAME   USED    OBJECTS CLONES  COPIES  MISSING_ON_PRIMARY  UNFOUND  DEGRADED  RD_OPS  RD       WR_OPS  WR
replicapool 600GiB  51200   0       153600  0                   0        0         2043291 800 GiB  517342  200 GiB
```

## Query a Specific Pool

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rados df -p replicapool
```

## Get Pool Usage via JSON for Automation

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for pool in data['pools']:
    name = pool['name']
    stored = pool['stats']['stored'] // (1024**3)
    used = pool['stats']['bytes_used'] // (1024**3)
    objects = pool['stats']['objects']
    max_avail = pool['stats']['max_avail'] // (1024**3)
    print(f'{name}: stored={stored}GiB, used={used}GiB, objects={objects}, avail={max_avail}GiB')
"
```

## Check Pool Quota Utilization

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  # Check quota settings
  ceph osd pool get-quota replicapool

  # Check current usage
  ceph df detail | grep replicapool
"
```

## Visualize Usage per Pool

For a quick comparison of all pools:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('{:<30} {:>10} {:>10} {:>7}'.format('Pool', 'Stored', 'Used', '%Used'))
print('-' * 60)
for p in sorted(data['pools'], key=lambda x: -x['stats']['bytes_used']):
    s = p['stats']
    stored = s['stored'] / (1024**3)
    used = s['bytes_used'] / (1024**3)
    pct = s.get('percent_used', 0)
    print(f'{p[\"name\"]:<30} {stored:>9.1f}G {used:>9.1f}G {pct:>6.1f}%')
"
```

## Monitor in Prometheus

Rook exposes pool metrics via Prometheus. Query them in Grafana:

```text
ceph_pool_stored_raw{pool_id="1"}
ceph_pool_max_avail{pool_id="1"}
ceph_pool_objects{pool_id="1"}
```

## Summary

Per-pool usage metrics in Ceph are available through `ceph df` (logical and raw usage per pool), `ceph df detail` (adds compression and quota data), and `rados df` (object counts and cumulative I/O). Use `--format json` with Python to extract specific fields for dashboards or alerting, and monitor `MAX AVAIL` to track remaining usable capacity per pool.
