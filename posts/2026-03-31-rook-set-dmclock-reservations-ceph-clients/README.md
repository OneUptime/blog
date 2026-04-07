# How to Set DmClock Reservations for Ceph Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, QoS, DmClock, Reservation

Description: Learn how to configure DmClock reservations to guarantee minimum I/O rates for specific Ceph clients, ensuring critical workloads are never starved.

---

## What are DmClock Reservations?

In the DmClock QoS model, a reservation is the minimum I/O rate (in IOPS or operations per second) that a client is guaranteed to receive, even when the OSD is under heavy load from other clients. Reservations act as a floor below which a client's I/O rate never drops.

## How Reservations Work

DmClock tracks a "reservation time" for each client. When a request arrives before the reservation time, it is assigned a reservation-based tag that gives it high scheduling priority. This ensures the client receives at least its reserved rate.

The total reservations for all clients on an OSD should not exceed 70-80% of the OSD's total IOPS capacity, leaving headroom for burst traffic.

## Setting Global Client Reservations

Set the baseline reservation for all client I/O:

```bash
# Set 1000 IOPS minimum for client operations
ceph config set osd osd_mclock_scheduler_client_res 1000
```

This applies to all OSDs unless overridden at the OSD level.

## Setting Per-Image Rate Limits via RBD QoS

RBD QoS provides client-side rate limiting (not DmClock reservations). These settings cap the maximum I/O rate for an image, which can complement DmClock by preventing noisy neighbors:

```bash
# Set IOPS limits for a specific RBD image
rbd config image set mypool/prod-db rbd_qos_read_iops_limit 5000
rbd config image set mypool/prod-db rbd_qos_write_iops_limit 2000
rbd config image set mypool/prod-db rbd_qos_iops_limit 6000
```

Check image QoS settings:

```bash
rbd config image list mypool/prod-db
```

## Per-OSD Reservation via Ceph Config DB

The mClock reservation parameter is an OSD-level setting. You can set different reservation values for individual OSDs:

```bash
# Set reservation for a specific OSD
ceph config set osd.5 osd_mclock_scheduler_client_res 500

# Or set it for all OSDs in a device class
ceph config set osd osd_mclock_scheduler_client_res 500
```

## DmClock and CephFS Workloads

CephFS I/O passes through OSDs for data operations, so OSD-level mClock reservations apply to CephFS data traffic as well. Set the reservation on the OSDs that back your CephFS data pool:

```bash
# Set reservation for OSDs serving the CephFS data pool
ceph config set osd osd_mclock_scheduler_client_res 1000
```

Note that MDS metadata operations are separate from data I/O and are not governed by DmClock.

## Monitoring Reservation Utilization

Check whether clients are hitting their reservation limits:

```bash
# View OSD performance counters
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -A5 "mclock"
```

Monitor per-OSD latency to identify OSDs under heavy load:

```bash
ceph osd perf | sort -k3 -rn | head -10
```

## Calculating Safe Reservation Values

Use this formula to set safe reservations:

```text
Safe total reservations per OSD = OSD max IOPS x 0.75
Per-client reservation = Safe total / number of priority clients
```

For example, a 10,000 IOPS NVMe OSD serving four priority clients:

```text
Safe total = 10000 x 0.75 = 7500 IOPS
Per-client = 7500 / 4 = 1875 IOPS
```

```bash
ceph config set osd.0 osd_mclock_scheduler_client_res 1875
```

## Testing Reservation Enforcement

Verify that reserved clients maintain their minimum rate under contention:

```bash
# Create load with a background workload
rados bench -p testpool 60 write --no-cleanup -t 16 &

# Measure reserved client throughput
rados bench -p prodpool 60 write -t 4 | grep "Average IOPS"
```

The reserved client should maintain close to its guaranteed minimum rate.

## Summary

DmClock reservations give critical Ceph clients a guaranteed minimum I/O rate that is honored even under cluster-wide congestion. Setting OSD-level reservations through the config database or global OSD config, combined with RBD client-side rate limiting to control noisy neighbors, ensures production databases and other latency-sensitive workloads are protected from interference by background operations or less-critical clients.
