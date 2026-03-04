# How to Optimize Block Device Queue Depth and nr_requests on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Storage, Performance, Tuning, Block Devices, Linux

Description: Learn how to tune block device queue depth and nr_requests on RHEL to optimize I/O throughput and latency for different storage workloads.

---

Every block device on RHEL has an I/O request queue that buffers read and write operations before they are dispatched to the hardware. The queue depth and nr_requests parameters control how many operations can be queued simultaneously. Tuning these values can dramatically affect both throughput and latency depending on your storage hardware and workload.

## Understanding Queue Depth

Queue depth refers to how many I/O operations a device can process concurrently. Modern storage devices, especially NVMe SSDs, support deep queues that allow many parallel operations. HDDs benefit from smaller queues because they can only perform one physical operation at a time.

## Checking Current Queue Settings

View the current nr_requests value:

```bash
cat /sys/block/sda/queue/nr_requests
```

View the hardware queue depth:

```bash
cat /sys/block/sda/device/queue_depth
```

For NVMe devices:

```bash
cat /sys/block/nvme0n1/queue/nr_requests
```

## Understanding nr_requests

The `nr_requests` parameter sets the maximum number of read or write requests that can be queued for a device in the block layer. This is the software queue managed by the I/O scheduler.

Default values on RHEL:

- HDD: 64
- SSD: 64 or higher
- NVMe: 1023

## Tuning nr_requests

### For High-Throughput Sequential Workloads

Increase nr_requests to allow more operations to be batched:

```bash
echo 256 | sudo tee /sys/block/sda/queue/nr_requests
```

### For Low-Latency Workloads

Decrease nr_requests to reduce queuing delay:

```bash
echo 32 | sudo tee /sys/block/sda/queue/nr_requests
```

### For NVMe Devices

NVMe devices handle deep queues well:

```bash
echo 1023 | sudo tee /sys/block/nvme0n1/queue/nr_requests
```

## Tuning Hardware Queue Depth

The hardware queue depth controls how many commands the device driver sends to the hardware:

```bash
echo 64 | sudo tee /sys/block/sda/device/queue_depth
```

For SCSI/SAS devices in database workloads:

```bash
echo 32 | sudo tee /sys/block/sda/device/queue_depth
```

## Read-Ahead Settings

The read-ahead value controls how much data the kernel pre-fetches during sequential reads:

```bash
# View current read-ahead (in 512-byte sectors)
cat /sys/block/sda/queue/read_ahead_kb

# Increase for sequential workloads
echo 4096 | sudo tee /sys/block/sda/queue/read_ahead_kb

# Decrease for random workloads
echo 128 | sudo tee /sys/block/sda/queue/read_ahead_kb
```

## Making Changes Persistent with udev Rules

```bash
sudo vi /etc/udev/rules.d/70-queue-tuning.rules
```

```text
# HDD tuning
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/nr_requests}="128", ATTR{queue/read_ahead_kb}="1024"

# SSD tuning
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/nr_requests}="256", ATTR{queue/read_ahead_kb}="256"

# NVMe tuning
ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", ATTR{queue/nr_requests}="1023", ATTR{queue/read_ahead_kb}="256"
```

Apply:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Making Changes Persistent with sysctl (for read-ahead)

Using blockdev:

```bash
sudo blockdev --setra 8192 /dev/sda
```

The value is in 512-byte sectors, so 8192 equals 4096 KB.

## Tuning for Specific Workloads

### Database Workloads (Random I/O)

```bash
# Lower queue depth for consistent latency
echo 32 | sudo tee /sys/block/sda/queue/nr_requests
echo 32 | sudo tee /sys/block/sda/device/queue_depth
# Small read-ahead (databases do random reads)
echo 128 | sudo tee /sys/block/sda/queue/read_ahead_kb
```

### Streaming/Backup Workloads (Sequential I/O)

```bash
# Higher queue depth for throughput
echo 256 | sudo tee /sys/block/sda/queue/nr_requests
# Large read-ahead for sequential reads
echo 4096 | sudo tee /sys/block/sda/queue/read_ahead_kb
```

### Virtual Machine Host

```bash
# Deep queues for NVMe backend
echo 1023 | sudo tee /sys/block/nvme0n1/queue/nr_requests
echo 256 | sudo tee /sys/block/nvme0n1/queue/read_ahead_kb
```

## Monitoring the Effect of Changes

Before and after tuning, measure with fio:

```bash
# Random read test
fio --name=randread --filename=/data/test --size=1G \
    --rw=randread --bs=4k --direct=1 --numjobs=8 \
    --runtime=30 --time_based --group_reporting

# Sequential read test
fio --name=seqread --filename=/data/test --size=1G \
    --rw=read --bs=1M --direct=1 --numjobs=1 \
    --runtime=30 --time_based --group_reporting
```

Monitor queue utilization with iostat:

```bash
iostat -x 1
```

Watch the `aqu-sz` (average queue size) column. If it is consistently at or above nr_requests, consider increasing the value.

## Summary

Tuning block device queue depth and nr_requests on RHEL requires matching your settings to your hardware and workload. Use deeper queues and larger read-ahead for sequential throughput workloads, and smaller values for latency-sensitive random I/O. Make changes persistent with udev rules, and always benchmark before and after to verify improvements.
