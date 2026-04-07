# How to Configure Garbage Collection Settings in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Garbage Collection, Object Storage, Configuration

Description: Configure Ceph RGW garbage collection parameters to control when and how deleted object data is permanently removed from RADOS storage.

---

When objects are deleted in Ceph RGW, the metadata is removed immediately but the underlying RADOS data objects are queued for garbage collection (GC). GC runs as a background process that permanently frees storage.

## Understanding RGW Garbage Collection

The GC process:
1. Deleted object data is queued in the GC log (stored in the zone's GC pool, e.g., `default.rgw.gc`)
2. A GC worker processes the queue and deletes RADOS objects
3. Processing happens on a schedule to avoid impacting foreground operations

## Key GC Parameters

```bash
# Check current GC settings
ceph config get client.rgw rgw_gc_max_objs
ceph config get client.rgw rgw_gc_obj_min_wait
ceph config get client.rgw rgw_gc_processor_max_time
ceph config get client.rgw rgw_gc_processor_period
```

## Configuring GC Parameters

```bash
# Number of GC log shards (higher = more parallel GC)
ceph config set client.rgw rgw_gc_max_objs 32

# Minimum time (seconds) before GC processes a deleted object
# Default is 2 hours (7200 seconds)
ceph config set client.rgw rgw_gc_obj_min_wait 7200

# How long each GC processing cycle runs (seconds)
ceph config set client.rgw rgw_gc_processor_max_time 3600

# Interval between GC processing cycles (seconds)
ceph config set client.rgw rgw_gc_processor_period 3600
```

## Accelerating GC During Bulk Deletions

For scenarios where storage needs to be reclaimed quickly:

```bash
# Reduce minimum wait to 30 minutes
ceph config set client.rgw rgw_gc_obj_min_wait 1800

# Increase processing shards
ceph config set client.rgw rgw_gc_max_objs 64

# Shorten the processing interval
ceph config set client.rgw rgw_gc_processor_period 300
```

## Monitoring GC Status

```bash
# Check GC queue depth
radosgw-admin gc list --include-all

# Count pending GC entries
radosgw-admin gc list --include-all | python3 -c \
  "import sys,json; data=json.load(sys.stdin); print(f'Pending GC entries: {len(data)}')"

# Manually trigger GC processing
radosgw-admin gc process --include-all
```

## Applying in Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_gc_max_objs = 32
    rgw_gc_obj_min_wait = 7200
    rgw_gc_processor_period = 3600
    rgw_gc_processor_max_time = 3600
```

## Troubleshooting GC Backlog

If GC is not keeping up:

```bash
# Check RADOS data pool usage before/after GC
ceph df detail | grep -A5 "rgw\.buckets\.data"

# Force GC to process immediately
radosgw-admin gc process --include-all
```

## Summary

Ceph RGW garbage collection queues deleted object data and processes it via a background worker. Configure `rgw_gc_obj_min_wait` to control deletion delay, `rgw_gc_max_objs` for parallel processing capacity, and `rgw_gc_processor_period` for processing frequency. Use `radosgw-admin gc process --include-all` to manually trigger GC when storage needs immediate reclamation.
