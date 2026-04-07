# How to Recover from Inconsistent PGs in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, Placement Group, Data Integrity, Recovery

Description: Recover Ceph placement groups showing inconsistent state by identifying corrupt objects, choosing the authoritative copy, and repairing data integrity issues.

---

## What Makes a PG Inconsistent?

A Ceph PG becomes "inconsistent" when scrubbing detects differences between replica copies of the same object. This can manifest as:

- **data_digest_mismatch**: Checksum of data differs between OSDs
- **omap_digest_mismatch**: Object map checksum mismatch
- **size_mismatch**: Object size reported differently by different OSDs
- **stat_error**: Object exists on some OSDs but not others

These indicate potential data corruption, hardware errors, or incomplete writes.

## Detecting Inconsistent PGs

```bash
# List all inconsistent PGs
ceph pg ls inconsistent

# Get cluster health details about inconsistencies
ceph health detail | grep -E "inconsistent|scrub"

# Count how many objects are affected
ceph pg dump | awk '/^[0-9]/ && $21 > 0 {print $1, $21, "inconsistent"}'
```

## Investigating the Inconsistency

Get detailed information about which objects are inconsistent:

```bash
# List inconsistent PGs in a specific pool
rados list-inconsistent-pg <pool-name>

# Get detail on inconsistent objects in a specific PG
rados list-inconsistent-obj 3.4f

# Example output:
# {
#   "inconsistents": [{
#     "object": {"name": "data_file_001", "nspace": ""},
#     "errors": ["data_digest_mismatch_info"],
#     "shards": [
#       {"osd": 2, "errors": [], "size": 4194304},
#       {"osd": 5, "errors": ["data_digest_mismatch_info"], "size": 4194304}
#     ]
#   }]
# }
```

## Automatic Repair

For most inconsistencies, Ceph's built-in repair function works:

```bash
# Repair a specific PG
ceph pg repair 3.4f

# Monitor repair progress
ceph pg 3.4f query | python3 -m json.tool | grep -A5 scrub

# Verify repair completed
ceph pg ls inconsistent | grep 3.4f
```

Repair works by:
1. Identifying which shard the authoritative copy considers correct
2. Copying the authoritative object data to shards with mismatches
3. Updating checksums

## Handling Repair Failures

If automatic repair fails, investigate further:

```bash
# Check OSD logs for the specific object
OSD_LOG=/var/log/ceph/ceph-osd.2.log
grep "data_file_001" $OSD_LOG | tail -20

# Check hardware on the OSD reporting errors
smartctl -a /dev/sdb | grep -E "Reallocated|Pending|Uncorrectable"

# Check for dmesg hardware errors
dmesg | grep -i "I/O error\|ata\|error" | grep -i sdb | tail -20
```

## Manual Object Recovery

When automatic repair doesn't work and you know the good copy:

```bash
# Export the object from the good OSD (run on the OSD node with the OSD stopped)
ceph-objectstore-tool --data-path /var/lib/ceph/osd/ceph-2 --pgid 3.4f --op export --file /tmp/pg-3.4f-export

# Or retrieve the object directly from the pool
rados -p <pool-name> get data_file_001 /tmp/recovered-object

# If the object is gone from all OSDs, check snapshots or backups
rbd snap ls <pool>/<image>
```

## Deep Scrub for Thorough Verification

Run a deep scrub to find all inconsistencies:

```bash
# Deep scrub all PGs in a pool
ceph osd pool deep-scrub <pool-name>

# Or deep scrub a specific PG
ceph pg deep-scrub 3.4f

# Watch scrub progress
ceph pg 3.4f query | python3 -m json.tool | grep last_deep_scrub
```

## Recovering in Kubernetes/Rook Environment

Run repair commands from the Ceph toolbox pod:

```bash
# Deploy toolbox if not present
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml

# Access toolbox
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash

# Run repair commands from inside toolbox
ceph pg ls inconsistent
ceph pg repair 3.4f
rados list-inconsistent-obj 3.4f
```

## Preventing Future Inconsistencies

```bash
# Enable regular deep scrubbing
ceph config set osd osd_scrub_min_interval 604800    # Weekly
ceph config set osd osd_deep_scrub_interval 2419200  # Monthly

# Monitor scrub errors via Prometheus
# ceph_pg_inconsistent metric tracks inconsistent PG count
ceph mgr module enable prometheus
```

## Summary

Inconsistent Ceph PGs indicate data integrity issues detected during scrubbing. The recovery workflow is: identify inconsistent objects with `rados list-inconsistent-obj`, attempt automatic repair with `ceph pg repair`, verify the fix with a follow-up scrub, and investigate the underlying hardware cause (disk errors, bit rot) to prevent recurrence. The `ceph pg repair` command handles most cases by copying the authoritative object replica to shards with checksum mismatches.
