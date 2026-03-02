# How to Configure Disk I/O Scheduling Policies on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, Performance, Linux, Kernel

Description: Configure Linux I/O scheduler policies on Ubuntu to optimize disk performance for different workloads, including SSDs, NVMe drives, and spinning disks.

---

The Linux I/O scheduler determines the order in which disk requests are submitted to the block device. The right scheduler can significantly improve throughput and latency for specific workloads. Modern Linux kernels offer several schedulers, each with different trade-offs that make them suitable for different storage types and workload patterns.

This guide explains the available schedulers, how to choose one, and how to apply and persist the configuration on Ubuntu.

## Understanding I/O Schedulers

The kernel block layer sits between the filesystem and the storage driver. When multiple processes read and write simultaneously, the I/O scheduler reorders, batches, and queues requests to optimize performance.

### Available Schedulers

**none (NoOp):** No reordering. Requests go to the device driver in submission order. Appropriate for:
- NVMe drives with their own high-performance queuing
- Virtual machines where the hypervisor handles scheduling
- Benchmarking to establish a baseline

**mq-deadline:** A multi-queue version of the classic deadline scheduler. Merges and sorts requests to minimize seek time while guaranteeing requests complete within a time limit (deadline). Best for:
- Spinning hard disks
- Mixed read/write workloads on HDDs
- Database servers on spinning disks

**bfq (Budget Fair Queueing):** Gives each process a "budget" of I/O operations and schedules them fairly. Provides low latency for interactive workloads. Best for:
- Desktop systems with spinning disks
- Mixed workloads where responsiveness matters
- When multiple applications compete for I/O

**kyber:** Simple scheduler designed for fast storage devices. Uses two queues (read and synchronous write) with target latency goals. Best for:
- SSDs and NVMe drives
- Latency-sensitive workloads

## Checking Current Scheduler

```bash
# Check scheduler for a specific device
cat /sys/block/sda/queue/scheduler

# Example output: [mq-deadline] kyber bfq none
# The scheduler in brackets is currently active

# Check all block devices
for dev in /sys/block/*/queue/scheduler; do
    echo "${dev%/queue/scheduler}: $(cat $dev)"
done

# More readable view
lsblk -o NAME,SCHED
```

## Checking Device Type

Choosing the right scheduler starts with knowing your storage type:

```bash
# Check rotation rate (0 = SSD, >0 = HDD RPM)
for dev in /sys/block/sd*/queue/rotational; do
    echo "${dev%/queue/rotational}: $(cat $dev)"
done

# Check if NVMe
ls /sys/block/ | grep nvme

# Detailed device info
lsblk -d -o NAME,ROTA,SIZE,MODEL,SCHED
# ROTA=0: SSD/NVMe, ROTA=1: HDD
```

## Changing the Scheduler

### Temporary Change (applies immediately, lost on reboot)

```bash
# Set mq-deadline for sda (HDD)
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler

# Set none for NVMe
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler

# Set bfq for sdb
echo bfq | sudo tee /sys/block/sdb/queue/scheduler

# Verify
cat /sys/block/sda/queue/scheduler
```

### Permanent Change with udev Rules

The recommended approach on Ubuntu is using udev rules that apply the scheduler when the device is detected:

```bash
sudo nano /etc/udev/rules.d/60-io-scheduler.rules
```

```ini
# Set scheduler based on device rotation flag
# Non-rotating devices (SSD/NVMe) - use none or mq-deadline
ACTION=="add|change", KERNEL=="sd[a-z]|mmcblk[0-9]*", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="none"

# Rotating devices (HDD) - use mq-deadline or bfq
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"

# NVMe drives - always use none
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"
```

Apply the rules:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger --type=devices --action=change

# Verify
for dev in /sys/block/*/queue/scheduler; do
    echo "${dev%/queue/scheduler}: $(cat $dev)"
done
```

### Permanent Change with GRUB (for root device)

For the root device, udev rules may not apply early enough in boot. Set the default scheduler via kernel parameters:

```bash
sudo nano /etc/default/grub
```

```bash
# Add elevator parameter to GRUB_CMDLINE_LINUX_DEFAULT
# This sets the default for devices that don't have a specific udev rule
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash elevator=mq-deadline"
```

```bash
sudo update-grub
```

## Scheduler-Specific Tuning

Each scheduler exposes tuning knobs in `/sys/block/DEVICE/queue/iosched/`.

### Tuning mq-deadline

```bash
# Check available parameters
ls /sys/block/sda/queue/iosched/

# Read deadline - time limit for read requests (in milliseconds)
cat /sys/block/sda/queue/iosched/read_expire
# Default: 500ms

# Write deadline
cat /sys/block/sda/queue/iosched/write_expire
# Default: 5000ms

# Writes starved - reads served before giving writes priority
cat /sys/block/sda/queue/iosched/writes_starved
# Default: 2

# Fifo batch - number of requests to pull from sorted list at once
cat /sys/block/sda/queue/iosched/fifo_batch
# Default: 16

# For a database workload, reduce write expire to minimize latency
echo 1000 | sudo tee /sys/block/sda/queue/iosched/write_expire

# For a backup workload that should not starve reads
echo 4 | sudo tee /sys/block/sda/queue/iosched/writes_starved
```

### Tuning bfq

```bash
# Check BFQ parameters
ls /sys/block/sda/queue/iosched/

# Slice idle - time BFQ waits for more I/O from a process (microseconds)
cat /sys/block/sda/queue/iosched/slice_idle
# Default: 8000 (8ms)

# Reduce for SSDs with BFQ
echo 0 | sudo tee /sys/block/sda/queue/iosched/slice_idle

# Max budget - maximum number of requests per process per slice
cat /sys/block/sda/queue/iosched/max_budget
# 0 = auto

# Enable/disable low latency mode
cat /sys/block/sda/queue/iosched/low_latency
echo 1 | sudo tee /sys/block/sda/queue/iosched/low_latency
```

### Tuning Queue Depth

Independent of the scheduler, queue depth affects how many requests the device processes simultaneously:

```bash
# Check current queue depth
cat /sys/block/sda/queue/nr_requests

# NVMe drives benefit from deeper queues
cat /sys/block/nvme0n1/queue/nr_requests
# Default is often 1023 for NVMe

# Increase queue depth for high-performance SSDs
echo 2048 | sudo tee /sys/block/nvme0n1/queue/nr_requests

# For HDDs, a smaller queue avoids seek amplification
echo 32 | sudo tee /sys/block/sda/queue/nr_requests
```

## Workload-Specific Recommendations

### Database Server (MySQL/PostgreSQL) on HDD

```bash
# mq-deadline with tuned write expire
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler
echo 500 | sudo tee /sys/block/sda/queue/iosched/read_expire
echo 1000 | sudo tee /sys/block/sda/queue/iosched/write_expire
echo 16 | sudo tee /sys/block/sda/queue/iosched/fifo_batch
```

### Database Server on NVMe

```bash
# none scheduler - let NVMe handle its own queue
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler

# Maximize queue depth
echo 4096 | sudo tee /sys/block/nvme0n1/queue/nr_requests
```

### File Server with Mixed Clients

```bash
# bfq provides fair access across clients
echo bfq | sudo tee /sys/block/sda/queue/scheduler
echo 1 | sudo tee /sys/block/sda/queue/iosched/low_latency
```

### Backup Server (Sequential Writes)

```bash
# mq-deadline with larger batch size for throughput
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler
echo 128 | sudo tee /sys/block/sda/queue/iosched/fifo_batch
```

## Benchmarking I/O Scheduler Performance

Use fio to compare schedulers:

```bash
sudo apt install fio -y

# Random read test (simulates database random access)
fio --name=randread --ioengine=libaio --iodepth=32 --rw=randread \
    --bs=4k --direct=1 --size=4G --numjobs=4 --runtime=60 \
    --group_reporting --filename=/tmp/fio-test

# Sequential write test (backup workload)
fio --name=seqwrite --ioengine=libaio --iodepth=1 --rw=write \
    --bs=1M --direct=1 --size=4G --numjobs=1 --runtime=60 \
    --group_reporting --filename=/tmp/fio-test

# Run with different schedulers and compare
for sched in none mq-deadline bfq; do
    echo "Testing $sched..."
    echo $sched | sudo tee /sys/block/sda/queue/scheduler
    fio --name=test --ioengine=libaio --iodepth=32 --rw=randread \
        --bs=4k --direct=1 --size=1G --runtime=30 \
        --filename=/dev/sda --output=/tmp/fio-$sched.txt
done
```

## Persisting Scheduler Tuning Parameters

For parameters you want persistent across reboots, add a udev rule or a systemd service:

```bash
sudo nano /etc/systemd/system/io-tuning.service
```

```ini
[Unit]
Description=Apply I/O scheduler tuning
After=local-fs.target

[Service]
Type=oneshot
RemainAfterExit=yes

# Apply all tuning in one ExecStart
ExecStart=/bin/sh -c '\
    echo mq-deadline > /sys/block/sda/queue/scheduler && \
    echo 500 > /sys/block/sda/queue/iosched/read_expire && \
    echo 1000 > /sys/block/sda/queue/iosched/write_expire \
'

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable io-tuning.service
sudo systemctl start io-tuning.service
```

The choice of I/O scheduler is one of the lower-effort performance optimizations available - switching from the default to a workload-appropriate scheduler on a heavily loaded HDD can noticeably improve throughput and reduce latency without any hardware changes.
