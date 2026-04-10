# How to Configure DmClock Weight for Ceph Client Priority

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, QoS, DmClock, Priority

Description: Learn how to configure DmClock weights to control proportional I/O priority between Ceph clients, ensuring high-priority workloads get more OSD time.

---

## How DmClock Weight Works

In DmClock's proportional-share model, weight determines the client's share of available I/O capacity above reservations. A client with weight 200 receives twice as much discretionary IOPS as a client with weight 100 when both are competing for the same OSD.

Weight is a relative value - what matters is the ratio between client weights, not the absolute numbers.

## Default Weight Values

By default, all client categories have equal weight in Ceph:

```bash
ceph config get osd osd_mclock_scheduler_client_wgt
ceph config get osd osd_mclock_scheduler_background_recovery_wgt
ceph config get osd osd_mclock_scheduler_background_best_effort_wgt
```

## Adjusting Client vs Recovery Weights

A common configuration is to give client I/O higher weight than background recovery:

```bash
# Give client I/O 4x the priority of recovery
ceph config set osd osd_mclock_scheduler_client_wgt 400
ceph config set osd osd_mclock_scheduler_background_recovery_wgt 100
ceph config set osd osd_mclock_scheduler_background_best_effort_wgt 50
```

This means when there is spare capacity, client I/O receives 73% of it (400/(400+100+50)), recovery gets 18%, and best-effort gets 9%.

## Per-OSD Weight Differentiation

Set different weights on different OSD types based on workload placement:

```bash
# NVMe OSDs serve production databases - favor client I/O heavily
ceph config set osd.0 osd_mclock_scheduler_client_wgt 800
ceph config set osd.0 osd_mclock_scheduler_background_recovery_wgt 50

# HDD OSDs serve cold storage - allow more recovery bandwidth
ceph config set osd.8 osd_mclock_scheduler_client_wgt 200
ceph config set osd.8 osd_mclock_scheduler_background_recovery_wgt 200
```

## Using mClock Profiles as Starting Points

The built-in profiles set weights automatically. Start with a profile and then fine-tune:

```bash
# Start with high_client_ops profile
ceph config set osd osd_mclock_profile high_client_ops

# View the resulting weights
ceph config get osd osd_mclock_scheduler_client_wgt
```

Override individual parameters after selecting a profile:

```bash
ceph config set osd osd_mclock_scheduler_background_recovery_wgt 75
```

## Weighting by Client Type with RBD QoS

For RBD images, differentiate priority between images using configuration:

```bash
# Production database image - higher effective priority
rbd config image set prodpool/prod-db rbd_qos_iops_burst 20000
rbd config image set prodpool/prod-db rbd_qos_iops_burst_seconds 2

# Development image - lower priority
rbd config image set devpool/dev-image rbd_qos_iops_burst 2000
rbd config image set devpool/dev-image rbd_qos_iops_burst_seconds 1
```

## Monitoring Weight-Based Distribution

View how IOPS are distributed across client categories:

```bash
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
d = json.load(sys.stdin)
for key, val in d.items():
    if 'mclock' in key.lower() or 'queue' in key.lower():
        print(f'{key}: {val}')
"
```

Check OSD operation counts:

```bash
ceph osd stat
ceph pg stat
```

## Testing Weight Behavior

Run two competing workloads and verify the weight ratio is reflected in throughput:

```bash
# Client 1 - higher weight pool
rados bench -p high-priority-pool 60 write --no-cleanup -t 8 &
HIGH_PID=$!

# Client 2 - lower weight pool
rados bench -p low-priority-pool 60 write --no-cleanup -t 8 &
LOW_PID=$!

wait $HIGH_PID $LOW_PID
```

Compare throughput in MB/s between pools.

## Summary

DmClock weight controls the proportional share of spare OSD capacity each client category receives. By giving client I/O higher weight than background recovery, production workloads dominate during contention without completely starving recovery. Fine-tuning weights per OSD or per pool allows sophisticated prioritization that matches real-world workload importance.
