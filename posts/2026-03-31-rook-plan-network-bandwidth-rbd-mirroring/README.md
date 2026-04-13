# How to Plan Network Bandwidth for RBD Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Networking

Description: Learn how to calculate and manage the network bandwidth required for RBD mirroring in Rook-Ceph to ensure reliable replication without saturating WAN links.

---

## Why Bandwidth Planning Matters for RBD Mirroring

RBD mirroring continuously streams data changes from a primary Ceph cluster to a secondary cluster over the network. Underestimating bandwidth requirements leads to:

- Replication lag growing over time
- Images falling too far behind to be usable for DR
- WAN link saturation affecting other traffic
- Mirror daemon health warnings

Proper bandwidth planning ensures your mirroring RPO targets are achievable with the available network.

## Step 1 - Measure Current Write Throughput

Before planning, measure the actual write throughput of your workloads on the primary cluster:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph osd pool stats replicapool
```

Sample output:

```text
pool replicapool id 1
  client io 450 MiB/s wr, 0 op/s rd, 1200 op/s wr
```

Also check per-image statistics:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd perf image iostat replicapool --format json
```

## Step 2 - Estimate Mirroring Bandwidth

For **journal-based mirroring**, bandwidth roughly equals the write throughput of all mirrored images because every write is replicated:

```text
Required bandwidth = Write throughput + 20% overhead
                   = 450 MiB/s * 1.2
                   = 540 MiB/s
```

For **snapshot-based mirroring**, bandwidth depends on the change rate between snapshots:

```text
Required bandwidth = (Changed data per interval) / interval
                   = 50 GiB changed / 1 hour
                   = 14.2 MiB/s average
```

## Step 3 - Configure Mirror Daemon Bandwidth Throttle

Limit the bandwidth used by the `rbd-mirror` daemon to avoid saturating the WAN link:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set global rbd_mirror_journal_max_fetch_bytes 104857600

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set global rbd_mirror_concurrent_image_syncs 5
```

For snapshot-based mirroring, limit concurrent syncs:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set global rbd_mirror_concurrent_image_syncs 3
```

## Step 4 - Monitor Replication Lag

Check if the mirror is keeping up with writes:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool status replicapool --verbose | grep -E "lag|behind"
```

```text
description: replaying, master_position=[tid=12345], mirror_position=[tid=12330], entries_behind_master=15
```

A growing `entries_behind_master` value indicates insufficient bandwidth.

## Step 5 - Set Up Prometheus Alerts for Lag

Alert when mirroring falls behind acceptable thresholds. The metric names below are illustrative - actual names depend on your Ceph version and monitoring exporter. Check your Ceph MGR Prometheus module output for the available `ceph_rbd_mirror_*` metrics:

```yaml
groups:
- name: rbd-mirror
  rules:
  - alert: RBDMirrorLagHigh
    expr: ceph_rbd_mirror_replay_lag_seconds > 300
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "RBD mirror replication lag exceeds 5 minutes"
  - alert: RBDMirrorUnhealthy
    expr: ceph_rbd_mirror_image_status{state!="replaying"} > 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "RBD mirror image is not in replaying state"
```

## Step 6 - Use QoS on the WAN Link

Apply traffic shaping at the network level to reserve bandwidth for mirroring while capping it to protect other traffic:

```bash
tc qdisc add dev eth0 root handle 1: htb default 30
tc class add dev eth0 parent 1: classid 1:1 htb rate 1gbit
tc class add dev eth0 parent 1:1 classid 1:10 htb rate 500mbit ceil 800mbit
tc class add dev eth0 parent 1:1 classid 1:30 htb rate 200mbit ceil 500mbit
```

## Summary

Planning network bandwidth for RBD mirroring requires measuring actual write throughput on the primary cluster and calculating the mirroring bandwidth needed based on the chosen mode. Journal-based mirroring needs bandwidth equal to the full write rate, while snapshot-based needs only the change rate bandwidth. Throttle the mirror daemon with `rbd_mirror_concurrent_image_syncs` and alert on replication lag metrics to ensure your RPO targets remain achievable.
