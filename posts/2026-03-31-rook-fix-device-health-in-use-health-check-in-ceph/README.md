# How to Fix DEVICE_HEALTH_IN_USE Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Device, Health Check, OSD

Description: Learn how to resolve the DEVICE_HEALTH_IN_USE warning in Ceph, triggered when a degraded device is still actively serving data and cannot be safely removed.

---

## What Is DEVICE_HEALTH_IN_USE?

`DEVICE_HEALTH_IN_USE` is a Ceph health warning that fires when a storage device has been flagged as unhealthy by the `devicehealth` module - meaning it has bad SMART metrics or is predicted to fail - but is still actively hosting PGs (Placement Groups) that contain data. Unlike `DEVICE_HEALTH`, this alert specifically indicates the device is "in use" and cannot be trivially removed without data migration.

This situation is common when automatic mark-out is not configured, or when the cluster does not have enough redundancy to begin rebalancing immediately.

## Checking Health Details

Inspect the detailed health output:

```bash
ceph health detail
```

Expected output:

```text
[WRN] DEVICE_HEALTH_IN_USE: 1 device(s) have failed SMART data and are still in use
    dev/sdb on osd.2 host ceph-node-01 has been flagged since 2026-03-20
```

Check which PGs are on this OSD:

```bash
ceph pg dump | grep "osd.2"
```

## Understanding the Difference from DEVICE_HEALTH

| Alert | Meaning |
|---|---|
| `DEVICE_HEALTH` | Device flagged as failing |
| `DEVICE_HEALTH_IN_USE` | Flagged device still actively serves PGs |

The `IN_USE` variant is more urgent because data is currently at risk on the degraded device.

## Step-by-Step Fix

### Step 1 - Verify the Device SMART Status

Connect to the affected node and check SMART data:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
smartctl -a /dev/sdb
```

Look for `Reallocated_Sector_Ct`, `Current_Pending_Sector`, or a non-zero `Offline_Uncorrectable` value.

### Step 2 - Mark the OSD Out

Initiate data migration away from the unhealthy OSD:

```bash
ceph osd out osd.2
```

Monitor progress:

```bash
watch ceph -s
```

The cluster will begin rebalancing. Wait until all PGs return to `active+clean`.

### Step 3 - Confirm No PGs Remain

Verify the OSD has no PGs before removal:

```bash
ceph pg dump osds | awk '$1 == 2 {print $0}'
```

### Step 4 - Remove and Replace

Once PG count is zero:

```bash
ceph osd crush remove osd.2
ceph auth del osd.2
ceph osd rm osd.2
```

Replace the disk and let Rook reprovision:

```bash
kubectl -n rook-ceph delete pod -l app=rook-ceph-osd,ceph-osd-id=2
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

## Preventing Future Occurrences

Enable automatic out-marking for predicted failures:

```bash
ceph config set mgr mgr/devicehealth/mark_out_threshold 6w
ceph config set mgr mgr/devicehealth/self_heal true
```

Set SMART scrape frequency to detect issues earlier:

```bash
ceph config set mgr mgr/devicehealth/scrape_frequency 43200
```

## Summary

`DEVICE_HEALTH_IN_USE` means a failing disk is still serving live data in your Ceph cluster. Fix it by marking the OSD out to trigger rebalancing, waiting for the cluster to reach `active+clean`, then removing the OSD and replacing the physical disk. Enable `self_heal` and automatic mark-out thresholds to handle future device failures proactively.
