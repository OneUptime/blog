# How to Choose Between Journal-Based and Snapshot-Based RBD Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Disaster Recovery

Description: Compare journal-based and snapshot-based RBD mirroring modes in Rook-Ceph to choose the right approach for your disaster recovery requirements.

---

## Two Mirroring Modes in RBD

Ceph RBD supports two distinct mirroring modes for replicating block device images to a secondary cluster. Choosing the wrong mode can result in poor performance, unexpected RPO, or incompatible image features. Understanding the trade-offs is essential for building an effective disaster recovery strategy.

**Journal-based mirroring** - Streams every write operation journal entry to the remote cluster in near real-time.

**Snapshot-based mirroring** - Periodically syncs RBD snapshots to the remote cluster at a scheduled interval.

## Journal-Based Mirroring

### How It Works

Journal-based mirroring enables the `journaling` RBD feature on the image. Every write is appended to the journal before being applied, and the journal is replicated to the secondary cluster asynchronously. The secondary replays the journal to maintain a consistent copy.

### Requirements

```bash
rbd feature enable replicapool/myimage journaling
```

The `exclusive-lock` feature must also be enabled as a dependency of `journaling`.

### Performance Impact

Journal-based mirroring has measurable write overhead:
- All writes must be journaled before acknowledgment, introducing a double-write penalty
- Additional network bandwidth for continuous journal streaming
- Higher CPU usage on both primary and secondary cluster

### RPO

Journal-based mirroring achieves near-zero RPO - typically seconds behind the primary. Failover to the secondary results in minimal data loss.

## Snapshot-Based Mirroring

### How It Works

Snapshot-based mirroring does not require the `journaling` feature. Instead, the `rbd-mirror` daemon takes scheduled snapshots of the source image and syncs only the changed blocks (delta) to the destination.

### Requirements

```yaml
spec:
  mirroring:
    enabled: true
    mode: image
    snapshotSchedules:
    - interval: 1h
      startTime: "00:00:00"
```

### Performance Impact

Snapshot-based mirroring has minimal write-path overhead since writes are not journaled for replication. Impact is limited to snapshot creation and delta calculation.

### RPO

RPO equals the snapshot interval. If snapshots are taken every hour and a failure occurs at 59 minutes, up to 59 minutes of data can be lost.

## Comparison Table

```text
Feature              | Journal-Based    | Snapshot-Based
---------------------|------------------|----------------
RPO                  | Near-zero (secs) | Interval-based
Write overhead       | High             | Low
Journaling required  | Yes              | No
Network bandwidth    | High (streaming) | Low (delta sync)
Crash consistency    | Yes              | Yes (per-snapshot)
Best for             | Databases/OLTP   | Batch/infrequent write
```

## When to Choose Journal-Based

- Databases requiring RPO under 30 seconds
- Applications where data loss of any magnitude is unacceptable
- Workloads tolerant of write overhead

## When to Choose Snapshot-Based

- Applications with hourly or daily RTO/RPO requirements
- Read-heavy workloads with infrequent writes
- Environments with limited bandwidth between sites
- Images that cannot enable the `journaling` feature

## Configuring the Mode via Rook

For snapshot-based mirroring, use the `CephBlockPool` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  mirroring:
    enabled: true
    mode: image
    snapshotSchedules:
    - interval: 24h
```

For journal-based mirroring, enable the `journaling` feature on each image. The `mode` field (`pool` or `image`) controls whether mirroring applies to all images automatically or per-image, and works with both journal-based and snapshot-based mirroring.

## Summary

Choose journal-based mirroring when you need near-zero RPO for critical databases, and snapshot-based mirroring when write-path overhead and bandwidth are concerns and a longer RPO is acceptable. Both modes provide crash-consistent data at the secondary site. Snapshot-based is the more operationally simple choice for most workloads.
