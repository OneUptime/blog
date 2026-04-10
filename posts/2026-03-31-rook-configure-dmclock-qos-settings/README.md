# How to Configure DmClock QoS Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, QoS, DmClock, Performance

Description: Learn how to configure DmClock Quality of Service settings in Ceph to provide per-client I/O reservations, limits, and weights.

---

## What is DmClock

DmClock is the distributed QoS scheduler used by Ceph's RADOS layer. It provides three control knobs per client:

- **Reservation** - minimum guaranteed IOPS even under contention
- **Limit** - maximum IOPS a client can consume
- **Weight** - relative share of available capacity when multiple clients compete

DmClock operates at the OSD level and controls how requests from different clients are queued and served.

## Enabling mClock Scheduler

The mClock scheduler is the default in Ceph Quincy and later (for BlueStore OSDs). Verify it is active:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd osd_op_queue
```

The output should be `mclock_scheduler`. If it is `wpq`, switch to mClock:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_queue mclock_scheduler
```

## Built-in mClock Profiles

Ceph ships with pre-built profiles that adjust QoS weights between client I/O and background operations:

```bash
# Balanced - equal priority between client I/O and background ops
ceph config set osd osd_mclock_profile balanced

# High client I/O priority
ceph config set osd osd_mclock_profile high_client_ops

# High recovery priority
ceph config set osd osd_mclock_profile high_recovery_ops
```

Apply via the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_mclock_profile high_client_ops
```

## Custom QoS Values

To use a custom profile, set it to `custom` and specify individual values:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_mclock_profile custom

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_mclock_scheduler_client_res 50

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_mclock_scheduler_client_wgt 500

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_mclock_scheduler_client_lim 1000
```

## Applying via Rook CephCluster CR

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    osd:
      osd_op_queue: "mclock_scheduler"
      osd_mclock_profile: "high_client_ops"
```

## Verifying QoS Settings

Check current mClock configuration:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config dump | grep mclock
```

Monitor OSD queue depths to assess mClock effectiveness:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf
```

## Summary

DmClock QoS in Ceph uses the mClock scheduler to control I/O reservations, limits, and weights per client. Use the built-in profiles (`high_client_ops`, `high_recovery_ops`, `balanced`) for most workloads, or configure custom values for fine-grained control. In Rook, apply mClock settings via the `CephCluster` CR's `cephConfig` field.
