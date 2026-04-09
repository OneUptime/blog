# How to Fix DEVICE_HEALTH Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Device, Health Check, OSD

Description: Learn how to diagnose and resolve the DEVICE_HEALTH warning in Ceph, which signals that one or more OSD drives are reporting SMART errors or predicted failures.

---

## What Is DEVICE_HEALTH?

The `DEVICE_HEALTH` health check in Ceph warns that one or more OSD storage devices are reporting health issues via their SMART (Self-Monitoring, Analysis and Reporting Technology) data. Ceph's `devicehealth` module continuously polls OSD drives using SMART tools and raises this alert when a disk shows signs of impending failure.

This is a proactive warning - the OSD may still be running, but the underlying hardware is at risk. Ignoring it can lead to data loss if the disk fails before Ceph can replicate the data elsewhere.

## Enabling the Device Health Module

The `devicehealth` module must be enabled to collect SMART data. Check its status:

```bash
ceph mgr module ls | grep devicehealth
ceph mgr module enable devicehealth
```

Set the scrape interval (default is once per day):

```bash
ceph config set mgr mgr/devicehealth/scrape_frequency 86400
```

## Identifying the Failing Device

Get details on which devices are flagged:

```bash
ceph health detail
```

Example output:

```text
[WRN] DEVICE_HEALTH: 1 device(s) have failed SMART data
    osd.5 is predicted to fail within 6 weeks
```

List the device IDs associated with the OSD, then get raw health data for the device:

```bash
ceph device ls-by-daemon osd.5
ceph device get-health-metrics <device-id>
```

Check the SMART data directly on the node:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- smartctl -a /dev/sdc
```

## Remediation Steps

### Step 1 - Mark the OSD as Out

Begin migrating data away from the failing OSD:

```bash
ceph osd out osd.5
```

Watch the cluster rebalance:

```bash
watch ceph osd tree
watch ceph -s
```

### Step 2 - Stop and Remove the OSD

Once the cluster is clean (all PGs active+clean), remove the OSD:

```bash
ceph osd down osd.5
ceph osd rm osd.5
ceph osd crush remove osd.5
ceph auth del osd.5
```

In Rook, you can also use the OSD removal job:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-osd-remove
  namespace: rook-ceph
data:
  OSD_IDS: "5"
```

### Step 3 - Replace the Physical Disk

After removing the OSD from Ceph, physically replace the drive on the node. Then allow Rook to provision a new OSD on the replacement disk by restarting the Rook operator:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

## Automating Device Health Responses

Configure automatic marking-out of predicted-failing OSDs:

```bash
ceph config set mgr mgr/devicehealth/mark_out_threshold 6w
ceph config set mgr mgr/devicehealth/warn_threshold 2w
```

## Summary

`DEVICE_HEALTH` is a critical warning that a disk is predicted to fail based on SMART data. The correct response is to mark the OSD out, wait for data to migrate, remove the OSD from the cluster, and replace the physical drive. Enabling the `devicehealth` mgr module and configuring thresholds allows Ceph to proactively protect data from hardware failures.
