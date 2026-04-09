# How to Monitor Ceph Device Health Predictions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Device Health, Prediction, SMART, Storage

Description: Learn how to monitor Ceph device health predictions using SMART data and the device health module to proactively identify failing disks before data loss occurs.

---

## What Is Ceph Device Health Monitoring?

Ceph includes a device health module that collects SMART (Self-Monitoring, Analysis and Reporting Technology) data from storage devices. It uses this data to predict which drives are likely to fail, enabling proactive replacement before a failure causes data loss.

## Enabling the Device Health Module

Check if the module is enabled:

```bash
ceph mgr module ls | grep devicehealth
```

Enable it:

```bash
ceph mgr module enable devicehealth
```

## Listing Monitored Devices

View all devices known to Ceph:

```bash
ceph device ls
```

Example output:

```text
DEVICE                        HOST:DEV        DAEMONS        WEAR  LIFE_EXPECTANCY
SAMSUNG_MZQL2960HCJR_S641NY0R osd-node1:sda   osd.0 osd.3  51%   >5y
WDC_WD40EFRX_WD-WCC4E2345678  osd-node2:sdb   osd.5         -     -
```

## Inspecting Individual Device Health

Get detailed health information for a specific device:

```bash
ceph device info <device-id>
```

View SMART data for a device:

```bash
ceph device get-health-metrics <device-id>
```

Get the predicted life expectancy:

```bash
ceph device ls --format json | python3 -c "
import sys, json
d = json.load(sys.stdin)
for dev in d:
    dev_id = dev.get('devid', 'unknown')
    life = dev.get('life_expectancy_max', 'unknown')
    print(f'{dev_id}: life expectancy {life}')
"
```

## Triggering a Health Check

Manually trigger a device health check:

```bash
ceph device check-health
```

Schedule automatic health checks:

```bash
ceph config set mgr mgr/devicehealth/scrape_frequency 86400
```

## Responding to Predicted Failures

When the device health module identifies a high-risk device, mark it for proactive migration:

```bash
# Check for devices flagged as failure-predicted
ceph health detail | grep DEVICE_HEALTH_TOOMANY
ceph health detail | grep DEVICE_HEALTH

# Automatically migrate data off a predicted-failure device
ceph osd out osd.<id>
```

Wait for the OSD to go clean, then remove it:

```bash
ceph osd safe-to-destroy osd.<id>
ceph osd destroy osd.<id> --yes-i-really-mean-it
```

## Configuring Device Health Settings

Set failure thresholds:

```bash
# Warn when predicted life expectancy is below 14 days (value in seconds)
ceph config set mgr mgr/devicehealth/warn_threshold 1209600

# Mark out OSDs when predicted life is below 7 days (value in seconds)
ceph config set mgr mgr/devicehealth/mark_out_threshold 604800
```

Enable automatic marking of devices for migration:

```bash
ceph config set mgr mgr/devicehealth/self_heal true
```

## Device Health in Rook

Access device health commands via the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device ls

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device check-health
```

## Summary

Ceph device health monitoring uses SMART data to predict drive failures before they cause data loss. The `ceph device ls` and `ceph device info` commands surface life expectancy predictions. Enabling `self_heal` automates the process of marking at-risk OSDs out so data migrates to healthy devices proactively. In Rook environments, device health management is accessible through the toolbox pod.
