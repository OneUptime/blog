# How to Tune NVMe Storage Performance on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, NVMe, Storage, Performance, Tuning, Linux

Description: Learn how to tune NVMe storage devices on RHEL for maximum performance, including I/O scheduler selection, queue depth, and interrupt handling.

---

NVMe (Non-Volatile Memory Express) drives offer dramatically higher performance than SATA SSDs, but you need to configure RHEL correctly to take full advantage of their capabilities. NVMe devices can deliver millions of IOPS and multi-gigabyte-per-second throughput, but only when the software stack is not the bottleneck.

## Checking NVMe Device Information

List NVMe devices:

```bash
sudo nvme list
```

View detailed device information:

```bash
sudo nvme id-ctrl /dev/nvme0
```

Check the current namespace:

```bash
sudo nvme id-ns /dev/nvme0n1
```

## Installing NVMe Management Tools

```bash
sudo dnf install nvme-cli
```

## Setting the I/O Scheduler to none

NVMe devices have sophisticated internal command queuing. The Linux I/O scheduler adds unnecessary overhead:

```bash
cat /sys/block/nvme0n1/queue/scheduler
echo "none" | sudo tee /sys/block/nvme0n1/queue/scheduler
```

Make it persistent with a udev rule:

```bash
sudo tee /etc/udev/rules.d/60-nvme-scheduler.rules << 'UDEV'
ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", ATTR{queue/scheduler}="none"
UDEV
```

## Optimizing Queue Depth

NVMe supports deep hardware queues. Ensure the software queue matches:

```bash
# Check current setting
cat /sys/block/nvme0n1/queue/nr_requests

# Set to maximum
echo 1023 | sudo tee /sys/block/nvme0n1/queue/nr_requests
```

Check the number of hardware queues:

```bash
cat /sys/block/nvme0n1/queue/nr_hw_queues
```

NVMe creates one hardware queue per CPU core by default, enabling true parallel I/O.

## Tuning Read-Ahead

For NVMe, a smaller read-ahead is usually better because the device is fast enough for on-demand reads:

```bash
# Check current value
cat /sys/block/nvme0n1/queue/read_ahead_kb

# Set for random workloads
echo 128 | sudo tee /sys/block/nvme0n1/queue/read_ahead_kb

# Set for sequential workloads
echo 2048 | sudo tee /sys/block/nvme0n1/queue/read_ahead_kb
```

## Configuring IRQ Affinity

NVMe uses MSI-X interrupts, one per queue. Proper CPU affinity ensures interrupts are handled by the right cores:

```bash
# View current IRQ assignments
cat /proc/interrupts | grep nvme
```

Use `irqbalance` for automatic distribution:

```bash
sudo systemctl enable --now irqbalance
```

For manual control, set affinity per IRQ:

```bash
# Find NVMe IRQs
grep nvme /proc/interrupts | awk '{print $1}' | tr -d ':'

# Set IRQ 45 to CPU 0
echo 1 | sudo tee /proc/irq/45/smp_affinity
```

## Optimizing File System for NVMe

### XFS on NVMe

```bash
sudo mkfs.xfs -f -d agcount=32 /dev/nvme0n1p1
```

Using multiple allocation groups (`agcount`) allows parallel metadata operations.

### ext4 on NVMe

```bash
sudo mkfs.ext4 -E lazy_itable_init=0,lazy_journal_init=0 /dev/nvme0n1p1
```

### Mount Options

```bash
sudo mount -o noatime,nodiratime /dev/nvme0n1p1 /data
```

The `noatime` option eliminates unnecessary write operations for access time updates.

## Enabling TRIM/Discard

Enable periodic TRIM for NVMe SSDs:

```bash
sudo systemctl enable --now fstrim.timer
```

Or enable continuous discard in the mount options:

```bash
# In fstab
UUID=...  /data  xfs  defaults,noatime,discard  0 0
```

Periodic TRIM (via fstrim.timer) is generally preferred over continuous discard because it has less performance impact.

## NUMA Awareness

For multi-socket servers, ensure NVMe I/O stays on the same NUMA node as the device:

```bash
# Check which NUMA node the NVMe device is on
cat /sys/block/nvme0n1/device/numa_node
```

Pin application processes to the same NUMA node:

```bash
numactl --cpunodebind=0 --membind=0 your_application
```

## Monitoring NVMe Performance

Check device health:

```bash
sudo nvme smart-log /dev/nvme0
```

Key metrics:

- **temperature** - Should stay within device specifications
- **percentage_used** - SSD wear level (100% means end of life)
- **data_units_read/written** - Total I/O volume
- **host_read_commands/write_commands** - Total operations

Monitor real-time performance:

```bash
iostat -x /dev/nvme0n1 1
```

## Using the tuned Profile

The `throughput-performance` profile includes NVMe optimizations:

```bash
sudo tuned-adm profile throughput-performance
```

## Benchmarking NVMe

Test with fio using io_uring for best performance:

```bash
fio --name=nvme-test --filename=/dev/nvme0n1 \
    --rw=randread --bs=4k --direct=1 \
    --numjobs=4 --iodepth=128 \
    --runtime=60 --time_based \
    --ioengine=io_uring --group_reporting
```

## Summary

Tuning NVMe on RHEL involves setting the I/O scheduler to none, maximizing queue depth, optimizing IRQ affinity, using appropriate file system settings, and enabling TRIM. NVMe devices deliver their best performance when the software stack stays out of the way. Monitor health with `nvme smart-log` and benchmark with fio using io_uring to validate your tuning.
