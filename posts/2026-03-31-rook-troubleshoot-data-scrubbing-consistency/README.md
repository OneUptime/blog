# How to Troubleshoot Data Scrubbing Consistency Problems in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Storage, Kubernetes, Troubleshooting, Scrubbing

Description: Learn how to identify and fix data scrubbing consistency problems in Ceph, including inconsistent PGs, scrub errors, and repair strategies.

---

## Understanding Ceph Data Scrubbing

Ceph periodically scrubs placement groups (PGs) to verify data integrity. When scrubbing finds inconsistencies, OSDs report errors that require investigation and repair. Understanding the difference between "inconsistent" (checksums mismatch) and "incomplete" (missing replicas) is essential for choosing the right fix.

## Identifying Scrubbing Errors

Check cluster health for scrub-related warnings:

```bash
ceph health detail | grep -i scrub
ceph pg dump | grep inconsistent
```

List all inconsistent PGs:

```bash
ceph pg ls inconsistent
```

View details for a specific PG:

```bash
ceph pg 3.4f query | python3 -m json.tool | grep -A10 scrub
```

## Inspecting Scrub Errors

Get a detailed error report for a specific PG:

```bash
rados list-inconsistent-pg pool_name
rados list-inconsistent-obj 3.4f
rados list-inconsistent-snapset 3.4f
```

Output example shows which OSD has the bad copy:

```bash
{
  "epoch": 1234,
  "inconsistents": [
    {
      "object": { "name": "myfile", "nspace": "", "locator": "" },
      "errors": ["data_digest_mismatch"],
      "union_shard_errors": ["data_digest_mismatch"],
      "selected_object_info": { ... },
      "shards": [...]
    }
  ]
}
```

## Repairing Inconsistent PGs

Trigger a repair for the specific PG:

```bash
ceph pg repair 3.4f
```

To repair all inconsistent PGs at once:

```bash
ceph pg ls inconsistent | awk '{print $1}' | xargs -I{} ceph pg repair {}
```

After repair, force a re-scrub to verify:

```bash
ceph pg scrub 3.4f
ceph pg deep-scrub 3.4f
```

## Tuning Scrub Behavior

Control when scrubbing happens to avoid performance impact:

```bash
# Limit scrub to off-peak hours (22:00 to 06:00)
ceph config set osd osd_scrub_begin_hour 22
ceph config set osd osd_scrub_end_hour 6

# Limit deep scrub I/O
ceph config set osd osd_scrub_sleep 0.1
ceph config set osd osd_deep_scrub_stride 524288
```

Suspend scrubbing temporarily during maintenance:

```bash
ceph osd set noscrub
ceph osd set nodeep-scrub
# Re-enable after maintenance
ceph osd unset noscrub
ceph osd unset nodeep-scrub
```

## Preventing Future Inconsistencies

Enable stronger checksums at the pool level:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
spec:
  replicated:
    size: 3
  parameters:
    pg_autoscale_mode: "on"
    scrub_min_interval: "604800"
    deep_scrub_interval: "2419200"
```

Check OSD journals and disks for hardware issues:

```bash
ceph osd df
smartctl -a /dev/sdb
dmesg | grep -i error | grep -i sdb
```

## Summary

Ceph scrubbing inconsistencies stem from hardware faults, bit rot, or partial writes. The repair workflow involves identifying inconsistent PGs, using `rados list-inconsistent-obj` to locate the bad copy, running `ceph pg repair`, and verifying with a deep scrub. Tuning scrub schedules and enabling deep checksums prevents future data integrity issues.
