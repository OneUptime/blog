# How to Tune Disk I/O Performance and Schedulers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Disk I/O, Performance, Schedulers, Linux, Tuning, Storage

Description: Learn how to tune disk I/O performance and configure I/O schedulers on RHEL for optimal storage throughput and latency.

---

Disk I/O performance directly impacts application responsiveness and throughput on RHEL. By selecting the right I/O scheduler, tuning queue parameters, and adjusting readahead values, you can optimize storage performance for your workload.

## Prerequisites

- A RHEL system
- Root or sudo access

## Understanding I/O Schedulers

RHEL uses the multi-queue block layer with these schedulers:

- **none** - No scheduling, requests go directly to the device. Best for NVMe and fast SSDs.
- **mq-deadline** - Guarantees latency for reads and writes. Good for general-purpose workloads.
- **bfq** (Budget Fair Queueing) - Fair I/O scheduling, good for interactive desktops and mixed workloads.
- **kyber** - Low-overhead scheduler for fast devices.

## Checking the Current Scheduler

View the active scheduler for a device:

```bash
cat /sys/block/sda/queue/scheduler
```

Output shows available schedulers with the active one in brackets:

```
[mq-deadline] kyber bfq none
```

## Changing the I/O Scheduler

Change the scheduler temporarily:

```bash
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler
```

Make the change persistent with a udev rule:

```bash
sudo tee /etc/udev/rules.d/60-ioscheduler.rules << 'UDEV'
# NVMe devices - no scheduler needed
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"

# SATA/SAS SSDs - mq-deadline
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="mq-deadline"

# Rotational disks - bfq
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="bfq"
UDEV
```

Reload udev rules:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Tuning Readahead

Readahead controls how much data the kernel prefetches during sequential reads.

Check current readahead (in 512-byte sectors):

```bash
blockdev --getra /dev/sda
```

Increase readahead for sequential workloads:

```bash
sudo blockdev --setra 8192 /dev/sda
```

Decrease for random I/O workloads:

```bash
sudo blockdev --setra 256 /dev/sda
```

Make persistent with a udev rule:

```bash
echo 'ACTION=="add|change", KERNEL=="sda", ATTR{bdi/read_ahead_kb}="4096"' | sudo tee /etc/udev/rules.d/61-readahead.rules
```

## Tuning Queue Depth

Adjust the number of outstanding I/O requests:

```bash
# View current queue depth
cat /sys/block/sda/queue/nr_requests

# Increase for high-throughput workloads
echo 256 | sudo tee /sys/block/sda/queue/nr_requests

# Decrease for latency-sensitive workloads
echo 32 | sudo tee /sys/block/sda/queue/nr_requests
```

## Tuning mq-deadline Parameters

Adjust mq-deadline settings:

```bash
# Read expiry time in milliseconds
cat /sys/block/sda/queue/iosched/read_expire
echo 100 | sudo tee /sys/block/sda/queue/iosched/read_expire

# Write expiry time
echo 5000 | sudo tee /sys/block/sda/queue/iosched/write_expire

# Batch size for reads before switching to writes
echo 16 | sudo tee /sys/block/sda/queue/iosched/fifo_batch
```

## Monitoring Disk I/O

Use iostat for real-time monitoring:

```bash
iostat -xz 2
```

Key metrics:

- **await** - Average I/O latency in milliseconds
- **%util** - Device utilization percentage
- **r/s, w/s** - Reads and writes per second
- **rkB/s, wkB/s** - Read and write throughput

Use `iotop` to see per-process I/O:

```bash
sudo dnf install iotop -y
sudo iotop
```

## Benchmarking Disk Performance

Test sequential read performance:

```bash
sudo fio --name=seqread --rw=read --bs=1m --size=1g --numjobs=1 --runtime=30 --group_reporting
```

Test random read performance:

```bash
sudo fio --name=randread --rw=randread --bs=4k --size=1g --numjobs=4 --runtime=30 --group_reporting
```

Install fio if needed:

```bash
sudo dnf install fio -y
```

## Conclusion

Tuning disk I/O on RHEL starts with selecting the right scheduler for your device type and adjusting readahead and queue depth for your workload. Use none for NVMe, mq-deadline for general purpose, and bfq for mixed workloads. Monitor with iostat and benchmark with fio to validate changes.
