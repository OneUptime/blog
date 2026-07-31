# Disk Free vs Disk Available: Choosing the Right Metric for Low-Space Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Prometheus, Node Exporter, Filesystems, Disk Space, Alerting

Description: Alert on filesystem space available to the workload, account for reserved blocks, and combine percentage, absolute headroom, and exhaustion forecasts safely.

---

Linux exposes two different free-space values for a mounted filesystem:

- **free blocks:** all blocks currently free in the filesystem;
- **available blocks:** free blocks available to an unprivileged user.

They differ when the filesystem reserves capacity for privileged use or otherwise restricts what an ordinary workload can allocate. Most application services do not run with the privilege needed to consume reserved space, so their low-space alert should use **available**, not total free.

With the Prometheus node exporter, that usually means:

```text
node_filesystem_free_bytes
node_filesystem_avail_bytes
node_filesystem_size_bytes
```

## Where the Difference Comes From

Linux `statfs(2)` reports:

| `statfs` field | node exporter metric | Meaning |
| --- | --- | --- |
| `f_blocks` | `node_filesystem_size_bytes` | Total data blocks, converted to bytes |
| `f_bfree` | `node_filesystem_free_bytes` | Free blocks in the filesystem |
| `f_bavail` | `node_filesystem_avail_bytes` | Free blocks available to an unprivileged user |

The node exporter multiplies the block counts by the filesystem block size. Its metric help explicitly describes `node_filesystem_avail_bytes` as space available to non-root users.

On filesystems with reserved capacity, `free_bytes` can therefore remain comfortably above zero while an unprivileged application receives `ENOSPC`. The reserve can give an administrator room to log in, rotate data, or repair the system; it should not be presented as application headroom.

## Use Available Space for the Workload Alert

Available ratio:

```promql
node_filesystem_avail_bytes
/
node_filesystem_size_bytes
```

Unavailable ratio:

```promql
1 -
(
  node_filesystem_avail_bytes
  /
  node_filesystem_size_bytes
)
```

Keep the result grouped by its existing labels, especially `instance`, `device`, `mountpoint`, and `fstype`. Summing unrelated filesystems before dividing hides a full small mount behind an empty large one.

For example, `/var` at 99% and `/data` at 10% must remain two alert instances. Applications cannot usually borrow free blocks across mount boundaries.

## Combine Percentage and Absolute Headroom

A percentage alone behaves poorly across very different filesystem sizes:

- 5% of 20 GiB is only 1 GiB;
- 5% of 20 TiB is 1 TiB.

An alert can require both a low ratio and low absolute headroom:

```promql
(
  node_filesystem_avail_bytes{fstype=~"ext4|xfs"}
  /
  node_filesystem_size_bytes{fstype=~"ext4|xfs"}
  < 0.10
)
and
(
  node_filesystem_avail_bytes{fstype=~"ext4|xfs"}
  < 10 * 1024 * 1024 * 1024
)
```

This example alerts only when less than 10% **and** less than 10 GiB remain. The filesystem allowlist is illustrative; include every persistent filesystem type your workloads use. A broad negative regex copied from another environment can quietly miss a new filesystem type.

Choose the absolute threshold from the maximum expected growth during:

- the alert and notification delay;
- human or automated response time;
- log rotation or compaction;
- a deployment, restore, or failover;
- the cleanup job's own temporary-space requirement.

## A Practical Alert Rule

```yaml
groups:
  - name: host-filesystems
    rules:
      - alert: FilesystemAvailableSpaceLow
        expr: |
          (
            node_filesystem_avail_bytes{fstype=~"ext4|xfs"}
            /
            node_filesystem_size_bytes{fstype=~"ext4|xfs"}
            < 0.10
          )
          and
          (
            node_filesystem_avail_bytes{fstype=~"ext4|xfs"}
            < 10 * 1024 * 1024 * 1024
          )
          and
          (
            node_filesystem_readonly{fstype=~"ext4|xfs"} == 0
          )
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low space on {{ $labels.instance }} {{ $labels.mountpoint }}"
```

The `for` duration ignores brief dips caused by a temporary file or atomic replacement. Alert separately when a filesystem unexpectedly becomes read-only; excluding it from this rule must not make that failure invisible.

Also monitor `node_filesystem_device_error`. If the exporter cannot obtain filesystem statistics, a missing low-space alert is not evidence that space is healthy.

## Forecast Exhaustion for Predictable Growth

Prometheus `predict_linear()` applies linear regression to a gauge. This expression asks whether available bytes are projected to cross zero in the next 24 hours based on six hours of data:

```promql
predict_linear(
  node_filesystem_avail_bytes{fstype=~"ext4|xfs"}[6h],
  24 * 60 * 60
) < 0
```

Use this only for filesystems with reasonably linear growth. It produces poor forecasts for:

- scheduled backups that are later deleted;
- sawtooth log rotation;
- compaction;
- thin-provisioned or auto-expanding storage;
- snapshots and copy-on-write behavior;
- a one-time ingest or restore.

Pair a forecast with a current-usage condition so noise near a flat trend does not create distant, unactionable predictions:

```promql
(
  predict_linear(
    node_filesystem_avail_bytes{fstype=~"ext4|xfs"}[6h],
    24 * 60 * 60
  ) < 0
)
and
(
  node_filesystem_avail_bytes
  /
  node_filesystem_size_bytes
  < 0.20
)
```

Make sure both selectors use the same filesystem filters in production.

## Why `df` Can Look Different from a Dashboard

Before assuming an exporter bug, compare the same:

- host or container mount namespace;
- device and mountpoint;
- filesystem type;
- privilege context;
- unit convention;
- collection time.

A containerized node exporter needs access to the host root and mount namespace as documented by the project. Otherwise it may report the container's overlay and bind mounts instead of the intended host filesystems.

Do not compare decimal GB with binary GiB as if they were identical. The node exporter emits bytes; the dashboard decides how to scale them.

## Space Is Not the Only Way a Filesystem Fills

A filesystem can reject new files while many bytes remain because it has exhausted inodes. Monitor:

```promql
node_filesystem_files_free
/
node_filesystem_files
```

Conversely, an inode-rich filesystem can run out of data blocks. Keep byte-space and inode-space alerts separate so the notification says which resource is exhausted.

Filesystem-specific allocation can also complicate a generic view. Copy-on-write filesystems, quotas, project limits, thin provisioning, and storage pools may impose a lower limit than the mount-wide `statfs` values show. Add the filesystem or storage-system metrics that represent the constraint actually enforced on the workload.

## When `free_bytes` Is Useful

`node_filesystem_free_bytes` remains useful for:

- understanding how much of a reserved pool remains;
- administrator and recovery-capacity dashboards;
- checking the difference between all free and unprivileged-available blocks;
- filesystem-specific investigations.

The reserve can be calculated as:

```promql
node_filesystem_free_bytes
-
node_filesystem_avail_bytes
```

Do not assume every difference is an ext-family reserved-block setting. The precise semantics come from the mounted filesystem's implementation of `statfs`.

## Summary

Alert application owners on `node_filesystem_avail_bytes`, because it reflects the blocks available to an unprivileged workload. Keep `free_bytes` for administrative and filesystem diagnostics. Evaluate every mount separately, combine relative and absolute headroom, forecast only stable growth, and monitor inode, read-only, exporter-error, quota, and storage-pool constraints alongside byte capacity.

## Official Documentation

- [Linux `statfs(2)` definitions for `f_bfree` and `f_bavail`](https://man7.org/linux/man-pages/man2/statfs.2.html)
- [Linux `statvfs(3)` filesystem statistics interface](https://man7.org/linux/man-pages/man3/statvfs.3.html)
- [Prometheus node exporter filesystem collector metric definitions](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go)
- [Prometheus node exporter Linux filesystem implementation](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_linux.go)
- [Prometheus node exporter host-monitoring container guidance](https://github.com/prometheus/node_exporter#docker)
- [Prometheus `predict_linear()` documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#predict_linear)
