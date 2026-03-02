# How to Tune I/O Schedulers (mq-deadline, bfq, none) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, I/O Schedulers, Performance Tuning, Storage, Kernel

Description: Understand and configure Linux I/O schedulers on Ubuntu - including mq-deadline, BFQ, and none - to optimize storage performance for different workload types.

---

The Linux I/O scheduler (also called the block layer scheduler or elevator) sits between the filesystem and the block device driver. It decides the order in which pending I/O requests are sent to the storage device. The right scheduler choice can dramatically affect throughput and latency - but the optimal choice depends heavily on the storage type (NVMe, SSD, HDD) and workload pattern (sequential, random, mixed, real-time).

Modern Linux (5.x+) uses the multi-queue block layer (blk-mq), which comes with three schedulers: `none`, `mq-deadline`, and `bfq`.

## Available Schedulers

### none (no-op)
No reordering of I/O requests. Requests go to the device driver in the order they arrive. Best for NVMe and high-end SSDs that have their own internal queuing and reordering. There's no point in the kernel adding overhead when the device handles ordering better on its own.

### mq-deadline
A simple, low-overhead scheduler that prevents request starvation by enforcing deadlines. Read requests get a 500ms deadline; writes get 5 seconds. Requests approaching their deadline are served next, regardless of location. Good for SSDs and for mixed read/write workloads on HDDs.

### bfq (Budget Fair Queueing)
A sophisticated scheduler designed for fairness between processes. It ensures interactive workloads (desktop applications, user processes) get low latency even when large background transfers are happening. Adds more CPU overhead than mq-deadline. Best for shared systems where multiple processes compete for I/O and for HDDs where request ordering matters.

## Checking Current Schedulers

```bash
# Check scheduler for each block device
# The active scheduler is shown in brackets
cat /sys/block/sda/queue/scheduler
# Example output: [none] mq-deadline bfq

cat /sys/block/nvme0n1/queue/scheduler
# Example output: [none]

# Check all devices at once
for dev in /sys/block/*/queue/scheduler; do
    echo "$dev: $(cat $dev)"
done

# Using lsblk with transport type
lsblk -d -o NAME,TYPE,ROTA,SCHED
# ROTA=0 means SSD/NVMe, ROTA=1 means spinning disk
```

## Changing the Scheduler

### Immediate Change (Non-Persistent)

```bash
# Switch /dev/sda to mq-deadline
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler

# Switch /dev/sdb to bfq
echo bfq | sudo tee /sys/block/sdb/queue/scheduler

# Switch NVMe to none (usually already default)
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler

# Verify the change
cat /sys/block/sda/queue/scheduler
```

### Persistent Change with udev Rules

```bash
cat << 'EOF' | sudo tee /etc/udev/rules.d/60-io-scheduler.rules
# I/O Scheduler configuration
# NVMe devices - use none (device handles its own queuing)
ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", ATTR{queue/scheduler}="none"

# SSDs (non-NVMe, non-rotating)
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="mq-deadline"

# HDDs (rotating disks)
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="bfq"

# virtio block devices in VMs - use none
ACTION=="add|change", KERNEL=="vd[a-z]", ATTR{queue/scheduler}="none"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Tuning mq-deadline Parameters

mq-deadline has several tunable parameters:

```bash
# View all mq-deadline parameters for /dev/sda
ls /sys/block/sda/queue/iosched/

# Read deadline (milliseconds) - how long before a read starves
cat /sys/block/sda/queue/iosched/read_expire
# Default: 500ms

# Write deadline (milliseconds)
cat /sys/block/sda/queue/iosched/write_expire
# Default: 5000ms (5 seconds)

# Starved writes allowed before flushing - higher values favor reads
cat /sys/block/sda/queue/iosched/writes_starved
# Default: 2

# Batch size - number of requests served from same direction before changing
cat /sys/block/sda/queue/iosched/fifo_batch

# Tuning for read-heavy workloads (e.g., web server):
echo 150 | sudo tee /sys/block/sda/queue/iosched/read_expire   # Faster reads
echo 2000 | sudo tee /sys/block/sda/queue/iosched/write_expire
echo 4 | sudo tee /sys/block/sda/queue/iosched/writes_starved   # More read priority

# Tuning for write-heavy workloads (e.g., logging server):
echo 500 | sudo tee /sys/block/sda/queue/iosched/read_expire
echo 1000 | sudo tee /sys/block/sda/queue/iosched/write_expire  # Faster writes
echo 1 | sudo tee /sys/block/sda/queue/iosched/writes_starved   # Equal priority
```

## Tuning BFQ Parameters

BFQ has more tuning knobs than mq-deadline:

```bash
# View BFQ parameters
ls /sys/block/sda/queue/iosched/  # When BFQ is active

# Enable back-seeking - allows reads to go backwards on disk (useful for HDDs)
cat /sys/block/sda/queue/iosched/back_seek_max

# BFQ slice idle - time (microseconds) BFQ waits for more requests from same process
cat /sys/block/sda/queue/iosched/slice_idle
# Default: 8000 (8ms) - helps batch requests from same process

# For desktop/interactive workloads (low latency for interactive processes):
echo 8000 | sudo tee /sys/block/sda/queue/iosched/slice_idle

# For server workloads (maximize throughput, fairness less important):
echo 0 | sudo tee /sys/block/sda/queue/iosched/slice_idle  # Disable idle waiting

# Timeout for BFQ requests (seconds)
cat /sys/block/sda/queue/iosched/timeout_sync
cat /sys/block/sda/queue/iosched/timeout_async
```

## Queue Depth Tuning

The queue depth (nr_requests) controls how many requests can be queued:

```bash
# Check current queue depth
cat /sys/block/nvme0n1/queue/nr_requests
cat /sys/block/sda/queue/nr_requests

# NVMe can handle very deep queues (supports NCQ/NQ deeply)
echo 1024 | sudo tee /sys/block/nvme0n1/queue/nr_requests

# For HDDs, moderate queue depth prevents head thrashing
echo 64 | sudo tee /sys/block/sda/queue/nr_requests

# For SSDs without NVMe
echo 256 | sudo tee /sys/block/sdb/queue/nr_requests
```

## Benchmarking Different Schedulers

Always validate scheduler choices with benchmarks matching your workload:

```bash
sudo apt install fio -y

# Helper function to test a scheduler
test_scheduler() {
    local dev=$1
    local sched=$2

    echo "=== Testing $sched on $dev ==="
    echo "$sched" | sudo tee /sys/block/$(basename $dev)/queue/scheduler > /dev/null

    # Random read IOPS (typical OLTP database pattern)
    sudo fio --name=randread \
        --filename=$dev \
        --rw=randread \
        --bs=4k \
        --direct=1 \
        --numjobs=4 \
        --iodepth=32 \
        --time_based \
        --runtime=30 \
        --group_reporting \
        --output-format=terse 2>/dev/null | awk -F';' '{print "Random Read IOPS: "$8}'

    # Sequential read throughput
    sudo fio --name=seqread \
        --filename=$dev \
        --rw=read \
        --bs=1m \
        --direct=1 \
        --numjobs=1 \
        --iodepth=8 \
        --time_based \
        --runtime=30 \
        --group_reporting \
        --output-format=terse 2>/dev/null | awk -F';' '{print "Sequential Read MB/s: "$6/1024}'
}

# Test all schedulers on an HDD
for sched in mq-deadline bfq; do
    test_scheduler /dev/sdb $sched
done

# NVMe
test_scheduler /dev/nvme0n1 none
```

## Scheduler Recommendations by Use Case

### NVMe SSDs (local and enterprise)
```bash
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler
```
The NVMe spec allows thousands of queues with deep queue depths. Software scheduling adds latency without benefit.

### SATA/SAS SSDs
```bash
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler
# mq-deadline prevents starvation with minimal overhead
# bfq also works well; test both for your workload
```

### SATA/SAS HDDs - General Server
```bash
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler
# mq-deadline with deadline enforcement is good for server workloads
```

### HDDs - Desktop or Shared Access
```bash
echo bfq | sudo tee /sys/block/sda/queue/scheduler
# BFQ prevents interactive latency spikes during background transfers
```

### Virtual Machines (virtio-blk)
```bash
echo none | sudo tee /sys/block/vda/queue/scheduler
# The hypervisor handles scheduling; kernel scheduler adds unnecessary overhead
```

## Making Changes in /etc/default/grub (Alternative)

For a simple global default at boot:

```bash
sudo nano /etc/default/grub

# For all block devices default to mq-deadline:
# GRUB_CMDLINE_LINUX="elevator=mq-deadline"

# For NVMe specifically (most common case - keep none):
# No change needed; NVMe defaults to none

sudo update-grub
```

The per-device udev approach is more flexible and preferred over the global grub parameter, since different devices in the same system benefit from different schedulers.

Monitoring the effect of scheduler changes with `iostat -xz 1` helps confirm whether your changes improved throughput and reduced await time as expected.
