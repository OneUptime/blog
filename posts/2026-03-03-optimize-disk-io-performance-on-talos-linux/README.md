# How to Optimize Disk I/O Performance on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk I/O, Storage, Performance Tuning, Kubernetes

Description: Learn how to optimize disk I/O performance on Talos Linux through scheduler tuning, filesystem settings, and storage configuration

---

Disk I/O performance affects almost everything running on your Kubernetes cluster. Container image pulls, log writing, database operations, and even etcd performance all depend on how efficiently your nodes handle disk operations. Talos Linux, with its immutable design, provides a clean foundation for I/O optimization because there are fewer background processes competing for disk bandwidth. This guide covers the practical steps to maximize disk I/O performance on Talos Linux.

## Understanding the I/O Path

Before diving into optimizations, it helps to understand how I/O flows through the system. When a container writes data, it goes through the container runtime, through the Linux VFS layer, through the filesystem, through the block layer (including the I/O scheduler), and finally to the physical device. Each layer introduces some overhead, and each layer can be tuned.

On Talos Linux, the root filesystem is read-only and overlay-based, which means all writable data goes to either tmpfs (for ephemeral data) or mounted persistent volumes. This is actually beneficial for I/O performance because the root filesystem generates minimal write traffic.

## I/O Scheduler Selection

The I/O scheduler determines the order in which disk operations are executed. Different schedulers suit different storage types. The available blk-mq schedulers in modern Linux kernels are `none`, `mq-deadline`, `kyber`, and `bfq`.

Note that the legacy `elevator=` kernel boot parameter is ignored under blk-mq (which is the default for all devices on Linux 5.0+). The scheduler must be selected per-device by writing to `/sys/block/<dev>/queue/scheduler`. On Talos, the practical way to apply this at boot is with a small privileged DaemonSet:

```yaml
# io-scheduler.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: io-scheduler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: io-scheduler
  template:
    metadata:
      labels:
        app: io-scheduler
    spec:
      containers:
      - name: scheduler
        image: busybox:latest
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          # NVMe devices have their own internal command queuing,
          # so adding another layer of scheduling just adds latency.
          for dev in /sys/block/nvme*/queue/scheduler; do
            [ -e "$dev" ] && echo none > "$dev"
          done
          # SATA SSDs benefit from mq-deadline: deadline guarantees
          # prevent starvation while keeping overhead low.
          for dev in /sys/block/sd*/queue/scheduler; do
            [ -e "$dev" ] && echo mq-deadline > "$dev"
          done
          # For spinning disks used for bulk storage, bfq
          # (Budget Fair Queueing) provides good interactive performance.
          # Detect rotational devices and apply bfq:
          for dev in /sys/block/sd*; do
            if [ "$(cat $dev/queue/rotational)" = "1" ]; then
              echo bfq > "$dev/queue/scheduler"
            fi
          done
          sleep infinity
```

To see what schedulers a device currently supports and which is active, read the scheduler file:

```bash
talosctl read /sys/block/nvme0n1/queue/scheduler --nodes 10.0.0.1
# Output looks like: [none] mq-deadline kyber bfq
# The value in brackets is the active scheduler.
```

## Dirty Page Management

The Linux kernel buffers writes in memory before flushing them to disk. This buffering is controlled by the dirty page parameters. The defaults are designed for desktop workloads and can cause problems on servers.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # Start background writeback when 5% of memory is dirty
    vm.dirty_background_ratio: "5"

    # Block processes when 15% of memory is dirty
    vm.dirty_ratio: "15"

    # Expire dirty pages after 30 seconds
    vm.dirty_expire_centisecs: "3000"

    # Check for dirty pages every 5 seconds
    vm.dirty_writeback_centisecs: "500"
```

For latency-sensitive workloads, lower these values so writes are flushed more frequently in smaller batches. For throughput-oriented workloads, raise them to allow more buffering:

```yaml
# Low-latency profile
machine:
  sysctls:
    vm.dirty_background_ratio: "2"
    vm.dirty_ratio: "5"
    vm.dirty_expire_centisecs: "100"
    vm.dirty_writeback_centisecs: "100"
```

```yaml
# High-throughput profile
machine:
  sysctls:
    vm.dirty_background_ratio: "10"
    vm.dirty_ratio: "40"
    vm.dirty_expire_centisecs: "6000"
    vm.dirty_writeback_centisecs: "1000"
```

## Read-Ahead Tuning

The kernel's read-ahead mechanism prefetches data from disk before it is requested, which improves sequential read performance. The default is usually 128KB, which works for general workloads.

For workloads with large sequential reads (like data processing or log analysis), increasing read-ahead helps:

```yaml
# This can be set via a privileged DaemonSet
# set-readahead.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: io-tuning
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: io-tuning
  template:
    metadata:
      labels:
        app: io-tuning
    spec:
      hostPID: true
      containers:
      - name: tuner
        image: busybox:latest
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          # Set read-ahead to 1MB for NVMe devices
          for dev in /sys/block/nvme*/queue/read_ahead_kb; do
            echo 1024 > "$dev"
          done
          # Set read-ahead to 2MB for SATA devices
          for dev in /sys/block/sd*/queue/read_ahead_kb; do
            echo 2048 > "$dev"
          done
          sleep infinity
```

For random I/O workloads like databases, reducing read-ahead can actually improve performance by avoiding unnecessary prefetch:

```bash
# Reduce read-ahead for random I/O
echo 16 > /sys/block/nvme0n1/queue/read_ahead_kb
```

## Swap Configuration

Talos Linux does not configure swap by default, which is generally the right choice for Kubernetes nodes. Swap causes unpredictable latency when the kernel starts paging out application memory.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    vm.swappiness: "0"           # Never prefer swap over dropping caches
```

Setting swappiness to 0 tells the kernel to avoid swapping as much as possible. Combined with proper Kubernetes resource limits, this keeps all application memory in RAM where it belongs.

## Disk Partitioning Strategy

How you partition your disks affects I/O performance. Talos supports configuring additional disks and partitions through the machine configuration. Note that user-defined mountpoints in `machine.disks` cannot overlap with system paths managed by the EPHEMERAL partition (such as `/var/lib/etcd` or `/var/lib/containerd`); they must live under `/var/mnt/...`:

```yaml
# talos-machine-config.yaml
machine:
  install:
    disk: /dev/sda               # OS disk
  disks:
    - device: /dev/nvme0n1       # Fast NVMe for application data
      partitions:
        - mountpoint: /var/mnt/fast
          size: 50GB
    - device: /dev/sdb           # SATA SSD for persistent volumes
      partitions:
        - mountpoint: /var/mnt/longhorn
          size: 0                 # Use entire disk
```

The most impactful isolation for cluster stability is putting etcd on its own fast device so that container image pulls and log writes do not interfere with etcd's critical fsync operations. Because `/var/lib/etcd` lives on EPHEMERAL and can't be remounted via `machine.disks`, the supported approach is to install Talos onto a dedicated fast disk (set `machine.install.disk` to the NVMe device), which places the EPHEMERAL partition - and therefore etcd's data directory - on that disk. Additional disks defined under `machine.disks` then host application data and Container Storage Interface (CSI) volumes such as Longhorn.

## Filesystem Mount Options

The filesystem mount options affect I/O behavior. While Talos manages its own filesystems, you can influence how persistent volumes are mounted through Kubernetes storage classes:

```yaml
# storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-storage
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "2"
  dataLocality: best-effort
mountOptions:
  - noatime                       # Don't update access time on reads
  - nodiratime                    # Don't update directory access time
  - discard                       # Enable TRIM for SSDs
```

The `noatime` option eliminates a write operation on every read, which is a significant optimization for read-heavy workloads.

## I/O Priority with cgroups

Kubernetes uses cgroups to manage container resources. You can influence I/O priority by setting appropriate resource requests and limits. Pods in the Guaranteed QoS class get higher I/O priority than those in BestEffort.

```yaml
# guaranteed-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: high-io-app
spec:
  containers:
  - name: app
    image: my-app:latest
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "2"                  # Requests equal limits = Guaranteed QoS
        memory: "4Gi"
```

## Monitoring Disk I/O

Monitor your disk I/O metrics to identify bottlenecks and verify optimizations:

```bash
# Check disk statistics
talosctl read /proc/diskstats --nodes 10.0.0.1

# Monitor I/O wait
talosctl read /proc/stat --nodes 10.0.0.1
```

Deploy node-exporter as a DaemonSet to collect detailed disk metrics for Prometheus:

```yaml
# Key metrics to monitor:
# node_disk_io_time_seconds_total - Time spent doing I/O
# node_disk_read_bytes_total - Bytes read
# node_disk_written_bytes_total - Bytes written
# node_disk_io_now - Current I/O operations in progress
```

Watch for high I/O wait times, which indicate the CPU is spending too much time waiting for disk operations. Also monitor disk queue depth and latency percentiles.

## Applying Changes

Apply your I/O configuration:

```bash
# Apply machine configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Kernel args changes need a reboot
talosctl reboot --nodes 10.0.0.1

# Verify sysctl changes
talosctl read /proc/sys/vm/dirty_ratio --nodes 10.0.0.1
```

## Conclusion

Disk I/O optimization on Talos Linux is a combination of choosing the right hardware, configuring the I/O scheduler appropriately, tuning dirty page management, and isolating different workloads onto separate physical devices. The immutable nature of Talos means less random I/O from OS-level activities, giving you a cleaner baseline to work from. Focus on separating etcd storage, using the right scheduler for your device type, and monitoring I/O metrics continuously to catch regressions early.
