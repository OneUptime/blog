# How to Manage OSDs from the Ceph Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, OSD, Storage

Description: Use the Ceph Dashboard to view OSD status, mark OSDs in/out, set device classes, and manage OSD lifecycle operations for your Rook-managed cluster.

---

## Overview

The Ceph Dashboard OSD section provides visibility into every Object Storage Daemon (OSD) in your cluster. From here you can view per-OSD performance, change operational flags, and initiate OSD replacement workflows.

## Accessing the OSD Manager

```bash
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
# Navigate to: https://localhost:8443/#/osd
```

The OSD list displays:
- OSD ID and host assignment
- Device type (HDD/SSD/NVMe)
- Status (up/in, up/out, down/in, down/out)
- Read/write IOPS and latency
- Storage used and total capacity
- PG count hosted by each OSD

## Viewing OSD Details

Click on any OSD to expand details:
- Device model and serial number
- CRUSH weight and device class
- Performance histogram (latency distribution)
- Smart health data (if collected by the mgr)

CLI equivalent:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd metadata 0
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd perf
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd df
```

## Managing OSD State

The Dashboard provides action buttons for each OSD:

**Mark Out** - Remove OSD from data placement without stopping it:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd out 3
```

**Mark In** - Return OSD to data placement:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd in 3
```

**Mark Down** - Mark an OSD as down in the cluster map (does not stop the daemon; if the OSD process is still running, it will re-mark itself as up):

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd down 3
```

## Setting OSD Maintenance Flags

Use the Dashboard's global OSD flags section to set cluster-wide maintenance flags:

```bash
# Set noout flag to prevent automatic OSD removal during maintenance
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd set noout

# Set noscrub to stop background scrubbing
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd set noscrub

# Unset after maintenance
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd unset noout
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd unset noscrub
```

## CRUSH Weight Adjustment

Reduce an OSD's CRUSH weight to gradually drain it before replacement:

```bash
# Reduce weight to 0 gradually (step by 0.1)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd crush reweight osd.3 0.8

# Monitor data migration
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph pg stat

# Continue reducing until 0
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd crush reweight osd.3 0
```

## OSD Scrubbing Management

The Dashboard shows scrub status per OSD. Initiate or cancel scrubbing:

```bash
# Deep-scrub a specific OSD
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd deep-scrub 3

# Check scrub schedule
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph pg dump pgs_brief | grep scrub
```

## Summary

The Ceph Dashboard OSD section provides comprehensive OSD lifecycle management including status monitoring, in/out state changes, CRUSH weight adjustment for graceful drain, and scrub management. Setting the `noout` flag before performing node maintenance prevents automatic data rebalancing that wastes I/O during predictable downtime windows.
