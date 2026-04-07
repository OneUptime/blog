# How to Recover from Accidental OSD Data Corruption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Disaster Recovery, Data Corruption, OSD, Recovery

Description: Learn how to identify, isolate, and recover from accidental OSD data corruption in Ceph, using scrub data, PG repair, and replica-based recovery.

---

## Detecting OSD Data Corruption

Ceph detects data corruption through scrubbing. When the scrubber finds objects whose checksums do not match their replicas, it flags the placement group as inconsistent.

Check for corruption indicators:

```bash
ceph health detail
ceph pg dump | grep inconsistent
```

Example health output:

```text
HEALTH_ERR 3 scrub errors
OSD_SCRUB_ERRORS 3 scrub errors
    pg 1.3 is inconsistent
    pg 1.7 is inconsistent
```

## Identifying Which OSD Has Corrupt Data

Corrupt data is typically on a specific OSD. List which OSDs are serving the inconsistent PGs:

```bash
ceph pg map 1.3
```

Example output:

```text
osdmap e45 pg 1.3 (1.3) -> up [3,1,5] acting [3,1,5]
```

Query the PG for details about the inconsistency:

```bash
ceph pg 1.3 query | python3 -m json.tool | grep -A 20 "inconsistent"
```

## Isolating the Corrupt OSD

If you can identify which OSD in the acting set has corruption:

```bash
# Check OSD logs for errors
journalctl -u ceph-osd@3 | grep -i "corrupt\|error\|checksum"

# For Rook environments
kubectl -n rook-ceph logs rook-ceph-osd-3-<pod-id> | grep -i "corrupt\|checksum"
```

## Repairing Inconsistent PGs

Ceph can repair inconsistencies by replacing corrupt data from a healthy replica:

```bash
ceph pg repair 1.3
ceph pg repair 1.7
```

Monitor the repair:

```bash
ceph pg 1.3 query | grep state
watch -n 2 ceph -s
```

After repair, verify the PG is clean:

```bash
ceph health detail | grep inconsistent
```

## When Repair Fails

If `ceph pg repair` cannot resolve the issue (all replicas are corrupt or none are available), you may need to mark objects as lost:

```bash
# WARNING: This permanently discards inconsistent objects
ceph pg 1.3 mark_unfound_lost delete
```

This is a last resort - data marked lost is permanently deleted.

## Identifying Root Cause

After recovering from corruption, identify the underlying cause:

```bash
# Check SMART data for the affected disk
smartctl -a /dev/sda

# Check for filesystem errors
dmesg | grep -E "EXT4|XFS|I/O error"

# Check OSD journal/block device health
ceph device info <device-id>
```

## Preventing Future Corruption

Enable deep scrubs on a regular schedule:

```bash
ceph config set global osd_deep_scrub_interval 604800  # 7 days
```

Enable device health monitoring:

```bash
ceph mgr module enable devicehealth
ceph config set mgr mgr/devicehealth/self_heal true
```

## Rook Recovery Workflow

In Rook, after identifying and repairing corruption:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg repair 1.3

# Force deep scrub to verify
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg deep-scrub 1.3
```

## Summary

OSD data corruption is detected via scrubbing and reported as inconsistent PGs in `ceph health detail`. The `ceph pg repair` command restores corrupted objects from healthy replicas in most cases. When all copies are corrupt, objects must be marked lost. Prevention through regular deep scrubs, device health monitoring, and SMART alerts minimizes the risk of undetected corruption.
