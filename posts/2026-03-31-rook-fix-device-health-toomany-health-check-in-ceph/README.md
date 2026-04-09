# How to Fix DEVICE_HEALTH_TOOMANY Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Device, Health Check, OSD

Description: Learn how to fix the DEVICE_HEALTH_TOOMANY warning in Ceph, which fires when too many OSDs are flagged as failing to allow safe simultaneous removal.

---

## What Is DEVICE_HEALTH_TOOMANY?

`DEVICE_HEALTH_TOOMANY` is a Ceph health warning that occurs when the number of OSD devices flagged as unhealthy (by the `devicehealth` module's SMART analysis) exceeds a safe threshold based on the `mon_osd_min_in_ratio` setting. In other words, Ceph has detected that too many drives are failing at once - and automatically marking all of them out would bring the ratio of "in" OSDs below the minimum allowed ratio.

This is a protective measure. The `devicehealth` module marks out failing OSDs one at a time (sorted by soonest expected failure) and stops when marking the next OSD out would bring the "in" ratio below `mon_osd_min_in_ratio` (default 0.75). The remaining failing OSDs trigger this warning.

## Checking Cluster State

Start with health detail:

```bash
ceph health detail
```

Typical output:

```text
[WRN] DEVICE_HEALTH_TOOMANY: Too many daemons are expected to fail soon
    3 OSDs with failing device(s) would bring "in" ratio to 0.750000 < mon_osd_min_in_ratio 0.750000
```

List all flagged devices:

```bash
ceph device ls
ceph device get-health-metrics <device-id>
```

## Why This Is Dangerous

If too many OSDs are marked out at once, the ratio of "in" OSDs drops below `mon_osd_min_in_ratio`, which can lead to degraded PGs and potential data unavailability. Ceph intentionally pauses automatic removal to protect data integrity.

Check the current in-ratio threshold:

```bash
ceph config get mon mon_osd_min_in_ratio
```

## Fix Strategy - Remove OSDs One at a Time

You must manually manage the removal order, ensuring the cluster is healthy between each removal.

### Step 1 - Mark One OSD Out

```bash
ceph osd out osd.1
```

### Step 2 - Wait for Rebalance

```bash
watch ceph -s
```

Wait until output shows `HEALTH_OK` or all PGs are `active+clean`.

### Step 3 - Stop the OSD Daemon

```bash
sudo systemctl stop ceph-osd@1
```

### Step 4 - Remove the OSD

Use the `purge` command (available since Luminous) to remove the OSD from the CRUSH map, delete its auth key, and remove it in one step:

```bash
ceph osd purge osd.1 --yes-i-really-mean-it
```

### Step 5 - Repeat for Next OSD

Only proceed to the next OSD after the cluster has fully rebalanced. This process ensures data durability is maintained throughout.

```bash
ceph osd out osd.4
# wait for rebalance ...
sudo systemctl stop ceph-osd@4
ceph osd purge osd.4 --yes-i-really-mean-it
```

## Temporarily Disabling Automatic Self-Heal

If you need to pause the `devicehealth` automatic removal while you manage the process manually:

```bash
ceph config set mgr mgr/devicehealth/self_heal false
```

Re-enable after replacements are complete:

```bash
ceph config set mgr mgr/devicehealth/self_heal true
```

## Adjusting the Too-Many Threshold

The "too many" logic is governed by `mon_osd_min_in_ratio`, which controls the minimum ratio of "in" OSDs to total OSDs. You can tune this threshold:

```bash
ceph config set mon mon_osd_min_in_ratio 0.75
```

## Monitoring

Track device health metrics in Grafana using the Ceph dashboard or Prometheus:

```bash
ceph device check-health
ceph mgr module enable dashboard
```

## Summary

`DEVICE_HEALTH_TOOMANY` is a safety mechanism that pauses automatic OSD removal when simultaneous removals would risk data loss. Fix it by manually removing failing OSDs one at a time, waiting for full rebalance between each removal, and optionally disabling `self_heal` temporarily to take manual control. Always prioritize cluster `HEALTH_OK` state between each removal step.
