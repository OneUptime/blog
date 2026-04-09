# How to Enable Physical Disk Visualization in Rook Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, Storage, Monitoring

Description: Enable the Ceph Dashboard physical disk visualization feature in Rook to view OSD-to-disk mappings and hardware inventory in the UI.

---

## Overview

The Ceph Dashboard includes a physical disk visualization feature that shows which physical disks are used by which OSDs, their health status, and hardware details. This feature requires the `ceph-volume` and `smartmontools` to be accessible, and it must be explicitly enabled in Rook's configuration.

## Check Current Dashboard Configuration

Before enabling disk visualization, check existing dashboard settings:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph dashboard get-grafana-api-url
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph mgr module ls | grep -A5 dashboard
```

## Enable the Device Endpoint

The physical disk visualization relies on the MGR device module. Enable it:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph mgr module enable devicehealth
```

Configure the device health scrape interval (in seconds):

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set mgr mgr/devicehealth/scrape_frequency 86400
```

## Configure the Orchestrator Module

The dashboard uses the Ceph orchestrator module to map OSDs to physical nodes. Enable it:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph mgr module enable rook
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph orch set backend rook
```

Verify the orchestrator is active:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph orch status
```

## View OSD-to-Device Mappings

List all OSDs and their device assignments:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd tree
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph device ls
```

Sample output:

```text
DEVICE                           HOST:DEV         DAEMONS  LIFE EXPECTANCY
SAMSUNG_MZNLN256HAJQ_S2EFINX123  node1:sdb        osd.0
WDC_WD10EZEX_WD-WMC1U5678901     node2:sdc        osd.1
```

## Check SMART Data

The device health module collects SMART data for supported drives:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph device get-health-metrics DEVICE_ID
```

Force an immediate SMART scrape:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph device scrape-daemon-health-metrics osd.0
```

## View in the Dashboard

Once the `devicehealth` and `rook` modules are enabled, navigate to the Ceph Dashboard:

1. Go to `Cluster` - `Physical Disks`
2. The page shows a table of all physical devices with health indicators
3. Click any device to see detailed SMART data and OSD assignments

If the Physical Disks page is not visible, ensure the Ceph MGR has restarted after enabling the modules:

```bash
kubectl rollout restart deployment -n rook-ceph -l app=rook-ceph-mgr
```

## Summary

Enabling physical disk visualization in the Rook-managed Ceph Dashboard requires activating the `devicehealth` and `rook` orchestrator modules. Once active, the dashboard displays OSD-to-disk mappings with SMART health data, giving operators a clear view of storage hardware health without leaving the Kubernetes ecosystem.
