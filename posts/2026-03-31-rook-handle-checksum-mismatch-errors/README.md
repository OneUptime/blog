# How to Handle Checksum Mismatch Errors in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Checksum, Data Integrity, Troubleshooting

Description: Learn how to identify, diagnose, and resolve BlueStore checksum mismatch errors in Ceph that signal data corruption or hardware issues.

---

A checksum mismatch error in Ceph means that data read from disk does not match the checksum stored alongside it. This is a serious signal that should not be ignored - it typically indicates hardware failure, firmware bugs, or storage media degradation.

## What Causes Checksum Mismatches

- Faulty disk or SSD
- Memory errors (ECC or non-ECC RAM)
- Storage controller bugs
- Power loss during write without proper flushing
- Data written and read back differently (rare firmware bugs)

## Detecting Checksum Errors

Check Ceph health:

```bash
ceph health detail
```

Look for output like:

```text
HEALTH_ERR 1 osds have slow ops; 1 pgs are damaged; 2 bluestore_csum_errors
```

Inspect OSD logs in Kubernetes:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
kubectl -n rook-ceph logs rook-ceph-osd-0-xxxx | grep -i "checksum\|bluestore"
```

Check OSD-level statistics:

```bash
ceph tell osd.0 perf dump | python3 -m json.tool | grep -i "csum"
```

## Identifying the Affected OSD

```bash
ceph osd df | sort -k 8 -r | head -10
ceph device ls
ceph device get-health-metrics osd.0
```

Use SMART data to check disk health:

```bash
smartctl -a /dev/sdb
```

## Isolating the Corrupted Object

List affected PGs:

```bash
ceph health detail | grep -E "inconsistent|repair"
```

Identify which objects are corrupted:

```bash
rados list-inconsistent-pg mypool
rados list-inconsistent-obj 2.1a
```

## Repairing the Data

If healthy replicas exist, repair the corrupted copy:

```bash
ceph pg repair 2.1a
ceph health detail
```

Monitor the repair:

```bash
watch ceph health detail
```

## Replacing a Faulty OSD

If the disk is bad, mark the OSD out and remove it:

```bash
ceph osd out osd.5
ceph osd down osd.5

# In Rook - remove OSD
kubectl -n rook-ceph delete pod rook-ceph-osd-5-xxxx
```

Once the cluster rebalances, remove the OSD permanently:

```bash
ceph osd purge 5 --yes-i-really-mean-it
```

## Preventing Future Mismatches

Enable ECC memory if not already present. Configure BlueStore write safety:

```bash
ceph config set osd bluestore_sync_submit_transaction true
```

Schedule regular deep scrubs to detect silent corruption early:

```bash
ceph config set global osd_deep_scrub_interval 604800
```

## Summary

Checksum mismatch errors in Ceph are a sign of real data corruption that must be investigated promptly. The repair workflow involves identifying affected PGs, using healthy replicas to overwrite corrupted data, and replacing faulty hardware if the underlying disk is the root cause. Enabling ECC memory and configuring BlueStore write safety settings reduces the likelihood of future occurrences.
