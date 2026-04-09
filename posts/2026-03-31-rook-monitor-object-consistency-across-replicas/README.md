# How to Monitor Object Consistency Across Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Replication, Data Integrity, Monitoring

Description: Learn how to monitor and detect object inconsistencies across Ceph replicas using scrubbing, RADOS tools, and Prometheus metrics.

---

In a replicated Ceph cluster, every object exists on multiple OSDs. Object consistency monitoring ensures that all replicas contain identical data. Divergence between replicas signals corruption or a failed write that must be resolved.

## How Ceph Detects Inconsistencies

Ceph detects replica inconsistencies during scrubbing. When a light or deep scrub compares object metadata or data across replicas and finds a mismatch, it marks the placement group as inconsistent.

Check for inconsistent PGs:

```bash
ceph health detail | grep inconsistent
ceph pg dump_stuck inconsistent
```

## RADOS Inconsistency Tools

List inconsistent PGs in a pool:

```bash
rados list-inconsistent-pg mypool
```

Get detailed information about inconsistent objects:

```bash
rados list-inconsistent-obj 2.1a --format=json-pretty
```

Example output showing a size mismatch:

```json
{
  "epoch": 42,
  "inconsistents": [
    {
      "object": {
        "name": "my-object",
        "nspace": "",
        "locator": "",
        "snap": "head"
      },
      "errors": [],
      "union_shard_errors": ["size_mismatch_info"],
      "shards": [
        {
          "osd": 0,
          "primary": true,
          "errors": [],
          "size": 1024
        },
        {
          "osd": 3,
          "primary": false,
          "errors": ["size_mismatch_info"],
          "size": 512
        }
      ]
    }
  ]
}
```

## Prometheus Metrics for Consistency

Rook exposes Ceph metrics via the embedded exporter. Key consistency metrics:

```bash
# Number of inconsistent PGs
ceph_pg_inconsistent

# Objects found inconsistent
ceph_osd_stat_num_objects_inconsistent

# Objects awaiting repair
ceph_osd_stat_num_objects_repair
```

Query these in Prometheus:

```promql
ceph_pg_inconsistent > 0
```

## Setting Up Alerts

```yaml
groups:
- name: ceph-consistency
  rules:
  - alert: CephInconsistentPG
    expr: ceph_pg_inconsistent > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Ceph has inconsistent placement groups"
      description: "{{ $value }} inconsistent PGs detected"
```

## Checking OSD-Level Object Stats

```bash
ceph tell osd.0 dump_ops_in_flight
ceph tell osd.0 perf dump | python3 -m json.tool | grep -i inconsist
```

## Comparing Object Data Manually

Ceph manages replicas internally across OSDs within the same pool, so you cannot retrieve individual replicas with `rados get`. To compare object data on different OSDs directly, use `ceph-objectstore-tool` on the OSD nodes:

```bash
# On the OSD node hosting osd.0
ceph-objectstore-tool --data-path /var/lib/ceph/osd/ceph-0 --pgid 2.1a myobject get-bytes /tmp/obj_osd0

# On the OSD node hosting osd.3
ceph-objectstore-tool --data-path /var/lib/ceph/osd/ceph-3 --pgid 2.1a myobject get-bytes /tmp/obj_osd3
```

Then compare the two files:

```bash
diff /tmp/obj_osd0 /tmp/obj_osd3
md5sum /tmp/obj_osd0 /tmp/obj_osd3
```

## Automating Consistency Checks

Write a script to check consistency daily:

```bash
#!/bin/bash
POOL="mypool"
INCONSISTENT=$(rados list-inconsistent-pg "$POOL" 2>/dev/null | jq 'length')

if [ "$INCONSISTENT" -gt 0 ]; then
  echo "WARNING: $INCONSISTENT inconsistent PGs found in $POOL"
  rados list-inconsistent-pg "$POOL"
  exit 1
fi
echo "All PGs consistent in $POOL"
```

Run as a Kubernetes CronJob for automated monitoring.

## Summary

Monitoring object consistency across replicas is an active part of Ceph cluster management. Using RADOS inconsistency tools, Prometheus metrics, and automated scrub schedules gives you early warning of data divergence. Combining alerts with prompt repair ensures that no replica inconsistency lingers long enough to threaten data availability.
