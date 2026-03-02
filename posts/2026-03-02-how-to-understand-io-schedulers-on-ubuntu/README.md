# How to Understand I/O Schedulers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Performance, Storage, Kernel

Description: A practical guide to Linux I/O schedulers on Ubuntu, covering available schedulers, how to select the right one for your workload, and tuning parameters for optimal disk performance.

---

The I/O scheduler (also called the disk elevator or block layer scheduler) sits between the filesystem and the block device driver. Its job is to decide the order in which pending I/O requests are submitted to the hardware. The right scheduler for a spinning disk is completely different from the right scheduler for an NVMe SSD, and choosing incorrectly can significantly degrade performance.

Ubuntu uses the blk-mq (multi-queue block layer) architecture, and the available schedulers have changed over kernel versions. This post covers the current state on Ubuntu 22.04 and later.

## Available I/O Schedulers

```bash
# Check available and current scheduler for a device
cat /sys/block/sda/queue/scheduler

# Output example:
# none [mq-deadline] kyber bfq
# The scheduler in brackets is the currently active one

# List schedulers for all block devices
for dev in /sys/block/*/queue/scheduler; do
    echo "$(dirname $(dirname $dev) | xargs basename): $(cat $dev)"
done
```

### none (No-op / Passthrough)

Passes I/O requests to the device in the order they arrive, with minimal reordering. The hardware or its driver handles any optimization.

**Best for:** NVMe SSDs, NVM Express devices with their own internal queuing. These devices handle thousands of concurrent I/O requests internally and don't benefit from scheduler reordering.

### mq-deadline

A multi-queue aware version of the classic deadline scheduler. It maintains sorted queues of read and write requests, tries to merge adjacent requests, and ensures no request waits longer than a configurable deadline.

**Best for:** SATA SSDs, SAS disks, and spindles where some reordering helps but latency guarantees matter. Good default for mixed workloads.

### BFQ (Budget Fair Queueing)

A sophisticated scheduler that provides proportional-share fairness between processes/cgroups. It tracks per-process I/O and gives each process a fair share of disk bandwidth. It also prioritizes interactive workloads to keep latency low.

**Best for:** Desktop systems (keeps UI responsive even during heavy I/O), virtualization hosts (fair I/O between VMs), any workload where fairness between processes matters.

### Kyber

A low-overhead multi-queue scheduler designed for fast NVMe devices. It uses token buckets to maintain latency targets for reads and synchronous writes. Very lightweight.

**Best for:** Very fast devices (NVMe) where you want some scheduling logic but can't afford BFQ's overhead.

## Checking Current I/O Scheduler

```bash
# For all block devices
lsblk -o NAME,SCHED

# Using cat directly
cat /sys/block/sda/queue/scheduler
cat /sys/block/nvme0n1/queue/scheduler
cat /sys/block/vda/queue/scheduler

# Check if blk-mq is in use
cat /sys/block/sda/queue/nr_requests   # number of queued requests allowed
```

## Changing the I/O Scheduler

### Temporary Change (resets on reboot)

```bash
# Change to bfq
echo bfq | sudo tee /sys/block/sda/queue/scheduler

# Change to none (best for NVMe)
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler

# Verify
cat /sys/block/sda/queue/scheduler
```

### Persistent Change via udev Rules

```bash
# Create a udev rule file
sudo nano /etc/udev/rules.d/60-block-scheduler.rules
```

```bash
# Set scheduler based on device type
# Rotational drives (HDD) - use mq-deadline
ACTION=="add|change", KERNEL=="sd[a-z]*", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"

# Non-rotational drives (SSD) - use bfq or none
ACTION=="add|change", KERNEL=="sd[a-z]*", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="bfq"

# NVMe devices - use none (they have internal queuing)
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"

# Virtual devices (in VMs)
ACTION=="add|change", KERNEL=="vd[a-z]", ATTR{queue/scheduler}="none"
```

```bash
# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Setting Default via Kernel Command Line

```bash
# Edit GRUB
sudo nano /etc/default/grub

# Add to GRUB_CMDLINE_LINUX_DEFAULT
# GRUB_CMDLINE_LINUX_DEFAULT="quiet splash elevator=bfq"

sudo update-grub
```

## Scheduler-Specific Tuning

### Tuning mq-deadline

```bash
# Read deadline (milliseconds) - default 500ms
cat /sys/block/sda/queue/iosched/read_expire

# Write deadline - default 5000ms (5 seconds)
cat /sys/block/sda/queue/iosched/write_expire

# Writes starved parameter - how many reads to service before forcing writes
cat /sys/block/sda/queue/iosched/writes_starved

# Front merge (merge requests at the front of the queue)
cat /sys/block/sda/queue/iosched/front_merges

# Adjust for latency-sensitive read workloads
echo 100 | sudo tee /sys/block/sda/queue/iosched/read_expire
echo 1000 | sudo tee /sys/block/sda/queue/iosched/write_expire
```

### Tuning BFQ

```bash
ls /sys/block/sda/queue/iosched/

# Slice idle time (ms) - how long to wait for more requests from a process
cat /sys/block/sda/queue/iosched/slice_idle

# Timeout for request queues
cat /sys/block/sda/queue/iosched/timeout_sync

# Low latency mode (optimize for interactive responsiveness)
cat /sys/block/sda/queue/iosched/low_latency
echo 1 | sudo tee /sys/block/sda/queue/iosched/low_latency

# Per-cgroup weights (for cgroup-based I/O fairness)
# Weights are in range 1-1000, default 100
# Set via cgroup I/O subsystem - see cgroups documentation
```

### Tuning Kyber

```bash
ls /sys/block/nvme0n1/queue/iosched/

# Latency targets in nanoseconds
cat /sys/block/nvme0n1/queue/iosched/read_lat_nsec     # default 2000000 (2ms)
cat /sys/block/nvme0n1/queue/iosched/write_lat_nsec    # default 10000000 (10ms)

# Reduce read latency target for low-latency databases
echo 500000 | sudo tee /sys/block/nvme0n1/queue/iosched/read_lat_nsec
```

## Queue Depth and Request Count

```bash
# Hardware queue depth (how many requests the device can handle simultaneously)
cat /sys/block/sda/device/queue_depth

# Number of requests the software queue holds
cat /sys/block/sda/queue/nr_requests

# For SSDs, increasing nr_requests can help throughput
echo 256 | sudo tee /sys/block/nvme0n1/queue/nr_requests

# Check if device uses multiple hardware queues (blk-mq)
ls /sys/block/sda/mq/
```

## Read-Ahead Tuning

Read-ahead speculatively fetches data past the current read position, assuming sequential access.

```bash
# Current read-ahead in KB
cat /sys/block/sda/queue/read_ahead_kb   # default: 128

# For sequential workloads (backups, media), increase it
echo 2048 | sudo tee /sys/block/sda/queue/read_ahead_kb

# For random access workloads (databases), decrease or disable
echo 0 | sudo tee /sys/block/sda/queue/read_ahead_kb

# Via blockdev utility
sudo blockdev --getra /dev/sda
sudo blockdev --setra 4096 /dev/sda  # 4096 * 512 bytes = 2MB
```

## Benchmarking Different Schedulers

Use `fio` to compare schedulers with a repeatable test:

```bash
# Install fio
sudo apt install fio

# Test random read latency (simulates database workload)
fio --name=randread \
    --ioengine=libaio \
    --iodepth=32 \
    --rw=randread \
    --bs=4k \
    --direct=1 \
    --size=1G \
    --filename=/dev/sda \
    --numjobs=4 \
    --runtime=60 \
    --group_reporting

# Change scheduler and rerun
echo bfq | sudo tee /sys/block/sda/queue/scheduler
fio --name=randread ...  # same parameters

# Compare the results - particularly:
# iops = operations per second
# lat = latency statistics (p99, p99.9 are important)
# bw   = throughput
```

## Monitoring I/O Scheduler Performance

```bash
# I/O statistics per device
iostat -x 1

# Key metrics:
# %util     = device utilization percentage
# await     = average wait time per request (ms)
# r_await   = read wait time
# w_await   = write wait time
# svctm     = actual service time (deprecated, unreliable)
# aqu-sz    = average queue size

# Per-process I/O
iotop
# or without curses
iotop -bod 5 | head -30

# Detailed block statistics
cat /proc/diskstats

# I/O pressure
cat /proc/pressure/io
```

## Scheduler Recommendations by Workload

| Workload | Device Type | Recommended Scheduler |
|----------|-------------|----------------------|
| General server | HDD | mq-deadline |
| General server | SATA SSD | bfq or mq-deadline |
| Database (PostgreSQL, MySQL) | NVMe | none |
| Desktop | Any | bfq |
| Virtual machine guest | Any | none (host handles it) |
| Container host | SSD | mq-deadline |
| Latency-sensitive | NVMe | none or kyber |
| Streaming/sequential | HDD | mq-deadline with high read-ahead |

Choosing the right I/O scheduler and tuning it for your workload is one of the easier performance wins available on Linux. The kernel defaults are conservative and generally reasonable, but for specific workloads - especially databases, high-throughput services, or latency-sensitive applications - matching the scheduler to the hardware and access pattern makes a measurable difference.
