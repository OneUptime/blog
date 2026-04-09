# How to Fix BLUESTORE_SPURIOUS_READ_ERRORS Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, Disk, Error

Description: Learn how to diagnose and resolve the BLUESTORE_SPURIOUS_READ_ERRORS health warning in Ceph when OSDs report intermittent read errors that may indicate hardware issues.

---

## Understanding BLUESTORE_SPURIOUS_READ_ERRORS

`BLUESTORE_SPURIOUS_READ_ERRORS` fires when BlueStore detects read errors that are not consistent - the same block can be read successfully after a retry. These "spurious" errors suggest flaky hardware: a disk that intermittently fails reads but does not consistently fail. This is an early warning of hardware degradation.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 1 OSD(s) have spurious read errors
[WRN] BLUESTORE_SPURIOUS_READ_ERRORS: 1 OSD(s) have spurious read errors
    osd.9 reads with retries: 47
```

## Gathering Hardware Evidence

Check SMART data on the affected OSD disk:

```bash
# Identify the disk device for the OSD
ceph osd metadata 9 | python3 -m json.tool | grep -E '"bluestore_bdev_dev_node"|"bluestore_bdev_devices"'

# Run SMART diagnostics
smartctl -a /dev/sdX
smartctl -t short /dev/sdX   # short self-test (~2 min)
smartctl -t long /dev/sdX    # long self-test (~hours)

# Check results after test
smartctl -a /dev/sdX | grep -E "FAILED|Error|Reallocated|Pending|Uncorrectable"
```

Check kernel logs for disk errors:

```bash
dmesg | grep -E "sdX|error|reset|failed" | tail -50
journalctl -k | grep sdX | tail -50
```

## Checking BlueStore Error Counters

Get the full error count from BlueStore:

```bash
ceph daemon osd.9 perf dump | python3 -m json.tool | grep -i "reads_with_retries\|read_eio"
```

In Rook:

```bash
kubectl -n rook-ceph exec <osd-9-pod> -- \
  ceph daemon osd.9 perf dump | python3 -m json.tool | grep reads_with_retries
```

## Clearing the Health Warning

If SMART checks are clean and you believe the errors were transient (firmware glitch, cable issue that has been fixed), restart the OSD to clear the in-memory counter:

```bash
systemctl restart ceph-osd@9
```

Alternatively, disable the warning if you want to suppress it without restarting:

```bash
ceph config set osd bluestore_warn_on_spurious_read_errors false
```

Verify the warning clears:

```bash
ceph health detail
```

If errors accumulate again after restart, the hardware issue is real and ongoing.

## Replacing a Flaky Disk

If SMART shows issues or errors continue accumulating, replace the OSD:

```bash
# Step 1: Mark OSD out
ceph osd out 9

# Wait for recovery
ceph -w  # watch until active+clean

# Step 2: Stop the OSD
systemctl stop ceph-osd@9

# Step 3: Purge from cluster
ceph osd purge 9 --yes-i-really-mean-it

# Step 4: Replace the disk (physical disk swap)

# Step 5: Reprovision new OSD
ceph-volume lvm create --bluestore --data /dev/sdX
```

## In Rook Deployments

Replace a flaky OSD disk in Rook using the OSD removal procedure:

```bash
# Step 1: Mark out via toolbox
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph osd out 9

# Step 2: Wait for data migration to complete (all PGs active+clean)
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph -w

# Step 3: Scale down the OSD deployment
kubectl -n rook-ceph scale deployment rook-ceph-osd-9 --replicas=0

# Step 4: Purge the OSD from the cluster
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph osd purge 9 --yes-i-really-mean-it

# Step 5: After physical disk replacement, delete the deployment
kubectl -n rook-ceph delete deployment rook-ceph-osd-9

# Rook will detect the new disk and provision a fresh OSD
```

## Setting Up Disk Health Monitoring

Use node_exporter and Prometheus to monitor SMART data:

```yaml
- alert: DiskSMARTErrors
  expr: smartmon_attr_raw_value{name="reallocated_sector_ct"} > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Disk {{ $labels.disk }} has reallocated sectors - potential failure"
```

## Summary

`BLUESTORE_SPURIOUS_READ_ERRORS` warns that an OSD disk is producing intermittent read errors, indicating potential hardware degradation. Investigate with SMART diagnostics and kernel logs. If the errors are truly transient (cable issue resolved), restart the OSD to clear the counter. If errors persist or SMART shows problems, replace the disk using the proper OSD removal and reprovisioning procedure before a full disk failure causes data loss.
