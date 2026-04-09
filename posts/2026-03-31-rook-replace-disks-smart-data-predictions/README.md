# How to Replace Disks Using SMART Data Predictions in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, SMART, Disk Health, OSD, Predictive Maintenance, Kubernetes

Description: Use SMART data and Ceph's device health monitoring to proactively replace failing disks before they cause data loss in Rook-Ceph clusters.

---

## Overview

SMART (Self-Monitoring, Analysis, and Reporting Technology) provides early warning of disk failures. Combined with Ceph's built-in device health monitoring, you can predict and replace failing OSDs before they impact cluster health.

## Enable Device Health Monitoring in Ceph

Ceph includes a `devicehealth` manager module. Enable it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mgr module enable devicehealth
```

Configure monitoring parameters:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mgr mgr/devicehealth/scrape_frequency 86400

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mgr mgr/devicehealth/warn_threshold 14
```

## Step 1: Check Device Health Metrics

View SMART data collected by Ceph:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device ls

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device get-health-metrics <device-id>
```

Check predicted failure dates:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device check-health
```

## Step 2: Identify Disks Predicted to Fail

List all devices and check which ones have a short life expectancy:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device ls
```

Get detailed health information for a specific device:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device info <device-id>
```

## Step 3: Mark OSD Out Before Replacement

Before physically replacing the disk, mark the OSD as out to migrate data:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd out osd.<id>
```

Wait for data migration to complete:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -w
```

Wait until PGs are clean:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg stat
```

## Step 4: Remove the OSD

Once data is migrated, remove the OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd down osd.<id>
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd rm osd.<id>
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth del osd.<id>
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush remove osd.<id>
```

## Step 5: Replace the Physical Disk and Reprovision

After replacing the physical disk, trigger Rook to provision a new OSD:

```bash
# Delete the failed OSD deployment
kubectl -n rook-ceph delete deployment rook-ceph-osd-<id>

# Rook will detect the new disk and provision a fresh OSD
kubectl -n rook-ceph get jobs -l app=rook-ceph-osd-prepare -w
```

## SMART Alerting with Prometheus

Create an alert rule based on device health predictions:

```yaml
groups:
- name: ceph-device-health
  rules:
  - alert: CephDevicePredictedFailure
    expr: ceph_health_detail{name="DEVICE_HEALTH_TOOMANY"} > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph device predicted to fail soon"
```

## Summary

Proactive disk replacement using SMART data prevents unplanned outages in Ceph clusters. By enabling the `devicehealth` module, monitoring `ceph device check-health`, and setting up Prometheus alerts, you can replace disks before they fail and migrate data gracefully without impacting cluster availability.
