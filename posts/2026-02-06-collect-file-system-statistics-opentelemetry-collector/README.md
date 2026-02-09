# How to Collect File System Statistics with the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, File System, Disk, Storage, Metrics, Host Metrics, Observability

Description: Learn how to collect file system statistics using the OpenTelemetry Collector host metrics receiver to monitor disk usage, inodes, and I/O performance.

---

Running out of disk space is one of the oldest and most common causes of production outages. Applications crash when they cannot write logs. Databases corrupt when they run out of space mid-transaction. Containers get evicted when their node's disk fills up. Despite being a well-understood problem, disk space issues continue to catch teams off guard because file systems fill up gradually until they hit 100% and everything breaks at once.

The OpenTelemetry Collector's host metrics receiver provides comprehensive file system statistics out of the box. It collects disk usage, inode counts, I/O throughput, and operation latencies. This post shows you how to configure it properly, which metrics to focus on, and how to set up alerts that give you time to react before disk space becomes critical.

## What the Host Metrics Receiver Collects

The host metrics receiver is part of the OpenTelemetry Collector Contrib distribution. It uses the operating system's native interfaces to collect system-level metrics, including file system data. On Linux, it reads from `/proc` and `/sys`. On macOS, it uses system calls. On Windows, it queries the Windows API.

For file system monitoring, the receiver collects three categories of data:

```mermaid
graph TD
    subgraph Host Metrics Receiver
        A[File System Scrapers]
    end

    A -->|system.filesystem.usage| B[Disk Space Metrics]
    A -->|system.filesystem.inodes.usage| C[Inode Metrics]
    A -->|system.disk.io| D[I/O Throughput]
    A -->|system.disk.operations| E[I/O Operations]
    A -->|system.disk.io_time| F[I/O Time]
    A -->|system.disk.operation_time| G[Operation Latency]

    B --> H[OTel Pipeline]
    C --> H
    D --> H
    E --> H
    F --> H
    G --> H
    H -->|Export| I[OneUptime]
```

Disk space metrics tell you how full each file system is. Inode metrics tell you whether you are running out of file entries (a separate limit from space). I/O metrics tell you how hard the disk is working and whether it is becoming a bottleneck.

## Basic Configuration

Here is a minimal configuration to start collecting file system metrics:

```yaml
# config.yaml - File system monitoring with the host metrics receiver
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      # File system usage (space and inodes)
      filesystem:
        # Collect metrics for all mounted file systems
        # You can filter specific mount points if needed

      # Disk I/O metrics
      disk:
        # Collect read/write throughput and operation counts

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  resource:
    attributes:
      - key: service.name
        value: "host-monitoring"
        action: upsert

exporters:
  otlp:
    endpoint: "https://otel-ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      processors: [resource, batch]
      exporters: [otlp]
```

This basic setup collects metrics for every mounted file system and every disk device. It works, but in practice you probably want to filter out virtual file systems and focus on the mounts that matter.

## Filtering File Systems

On a typical Linux server, the `mount` command shows dozens of file systems, most of which are virtual (proc, sysfs, tmpfs, cgroup). You do not need metrics for these. Use the filesystem scraper's filtering options to focus on real storage:

```yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      filesystem:
        # Only include specific file system types
        include_fs_types:
          match_type: strict
          fs_types:
            - ext4
            - xfs
            - btrfs
            - zfs
            - ntfs

        # Or exclude virtual file systems
        exclude_fs_types:
          match_type: strict
          fs_types:
            - tmpfs
            - devtmpfs
            - sysfs
            - proc
            - cgroup
            - cgroup2
            - overlay
            - squashfs
            - nsfs
            - fuse.snapfuse

        # Filter by mount point
        exclude_mount_points:
          match_type: regexp
          mount_points:
            - "/snap/.*"
            - "/sys/.*"
            - "/proc/.*"
            - "/dev/.*"
            - "/run/.*"

      disk:
        # Only monitor physical disks, not loop devices
        include:
          match_type: regexp
          devices:
            - "sd[a-z]+"
            - "nvme[0-9]+n[0-9]+"
            - "vd[a-z]+"
            - "xvd[a-z]+"
```

The `include_fs_types` approach is cleaner for most setups. By listing only the file system types you care about (ext4, xfs, etc.), you automatically exclude all the virtual file systems without needing an exhaustive exclusion list.

For the disk scraper, filtering by device name pattern keeps your metrics focused on real block devices. The patterns above cover SATA/SAS drives (sd*), NVMe drives (nvme*), VirtIO drives (vd*), and Xen virtual drives (xvd*).

## Understanding the Metrics

Let me break down each metric and what it tells you.

### Disk Space Metrics

`system.filesystem.usage` reports the number of bytes in three states: used, free, and reserved. The reserved space is the portion set aside for the root user (typically 5% on ext4), which prevents non-root processes from consuming every last byte.

```yaml
# Example metric data points for system.filesystem.usage
# device: /dev/sda1
# mountpoint: /
# type: ext4
# state: used    -> 42,000,000,000 bytes (42 GB)
# state: free    -> 45,000,000,000 bytes (45 GB)
# state: reserved -> 5,000,000,000 bytes (5 GB)
#
# Total capacity = used + free + reserved = 92 GB
# Usable capacity = used + free = 87 GB
# Usage percentage = used / (used + free) = 48.3%
```

When calculating usage percentage, remember that the reserved space is not available to regular users. Your effective capacity is `used + free`, not the total disk size.

### Inode Metrics

`system.filesystem.inodes.usage` tracks the number of inodes used and free. Each file and directory consumes one inode. You can run out of inodes while still having free disk space if you have millions of small files.

```yaml
# Example inode metrics
# device: /dev/sda1
# mountpoint: /
# state: used -> 1,200,000 inodes
# state: free -> 4,800,000 inodes
#
# Inode usage = 1,200,000 / 6,000,000 = 20%
```

Inode exhaustion is common in environments that create many small files: mail servers, container build caches, package manager caches, and applications that use the file system as a temporary data store.

### I/O Performance Metrics

`system.disk.io` measures the bytes read from and written to each disk device. This tells you the throughput your applications are putting through the storage layer.

`system.disk.operations` counts the number of read and write operations. Combined with the I/O bytes, you can calculate the average I/O size, which is useful for understanding your workload pattern.

`system.disk.io_time` and `system.disk.operation_time` measure how long the disk spends servicing I/O requests. High I/O time indicates the disk is busy, and operations are potentially queuing.

## Advanced Configuration for Container Environments

In containerized environments, file system monitoring has extra complexity. Containers use overlay file systems, and the metrics you care about depend on whether you are monitoring the host or the container.

For monitoring Kubernetes node disk usage:

```yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    # When running in a container, access host file systems
    root_path: /hostfs
    scrapers:
      filesystem:
        include_fs_types:
          match_type: strict
          fs_types: [ext4, xfs]
        # Focus on the main data partitions
        include_mount_points:
          match_type: regexp
          mount_points:
            - "/hostfs"
            - "/hostfs/var/.*"
      disk: {}
```

When deploying the collector as a DaemonSet in Kubernetes, mount the host root file system into the container:

```yaml
# Kubernetes DaemonSet volume configuration
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:latest
          volumeMounts:
            # Mount host filesystem for the hostmetrics receiver
            - name: hostfs
              mountPath: /hostfs
              readOnly: true
              mountPropagation: HostToContainer
      volumes:
        - name: hostfs
          hostPath:
            path: /
```

The `root_path: /hostfs` setting tells the host metrics receiver to look for file system information relative to `/hostfs` instead of `/`. This is necessary because inside the container, `/proc/mounts` shows the container's mount namespace, not the host's.

## Alerting on File System Issues

File system alerts should give you enough time to act but should not be so sensitive that they fire constantly. Here are practical thresholds:

```yaml
# File system alerting rules
- alert: DiskSpaceWarning
  # 80% usage - time to investigate and plan
  condition: (system.filesystem.usage{state="used"} / (system.filesystem.usage{state="used"} + system.filesystem.usage{state="free"})) > 0.80
  for: 10m
  severity: warning
  description: "Disk usage on {{ mountpoint }} exceeds 80%"

- alert: DiskSpaceCritical
  # 90% usage - immediate action needed
  condition: (system.filesystem.usage{state="used"} / (system.filesystem.usage{state="used"} + system.filesystem.usage{state="free"})) > 0.90
  for: 5m
  severity: critical
  description: "Disk usage on {{ mountpoint }} exceeds 90%"

- alert: InodeWarning
  # 80% inode usage
  condition: (system.filesystem.inodes.usage{state="used"} / (system.filesystem.inodes.usage{state="used"} + system.filesystem.inodes.usage{state="free"})) > 0.80
  for: 10m
  severity: warning
  description: "Inode usage on {{ mountpoint }} exceeds 80%"

- alert: DiskIOSaturation
  # Disk spending more than 80% of its time on I/O
  condition: rate(system.disk.io_time[5m]) > 0.80
  for: 15m
  severity: warning
  description: "Disk {{ device }} is I/O saturated"
```

The 10-minute `for` duration on the 80% warning prevents alerting on brief spikes caused by large file operations that are immediately cleaned up. The I/O saturation alert uses a 15-minute window because short I/O bursts are normal during backups or deployments.

## Predicting Disk Full Events

One of the most valuable things you can do with file system metrics is predict when a disk will fill up. If a disk is at 70% but growing at 2% per day, you have roughly 15 days before it is critical. If it is at 70% and growing at 10% per day, you have 3 days.

While the collector does not calculate predictions natively, your backend can use the rate of change in `system.filesystem.usage{state="used"}` to project when usage will reach 100%. This is far more useful than a static threshold because it accounts for the speed of growth.

## Conclusion

File system monitoring with the OpenTelemetry Collector is straightforward to set up and provides critical visibility into one of the most common causes of production incidents. Use the host metrics receiver's filesystem and disk scrapers, filter out virtual file systems to reduce noise, and set up alerts at 80% and 90% usage thresholds. Do not forget about inode monitoring and I/O performance. In containerized environments, mount the host file system into the collector container to get accurate host-level metrics. With these metrics flowing into your observability platform, you will never be surprised by a full disk again.
