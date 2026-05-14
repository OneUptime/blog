# How to Tune the Linux I/O Scheduler (mq-deadline, bfq, none) on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, I/O Schedulers, Performance, Storage, Tuning, Linux

Description: Learn how to select and tune the Linux I/O scheduler on RHEL to optimize storage performance for different workloads and device types.

---

The Linux I/O scheduler determines how read and write requests are ordered and dispatched to storage devices. RHEL uses the multi-queue block layer, which supports mq-deadline, bfq, kyber, and none; this guide focuses on mq-deadline, bfq, and none. Choosing the right scheduler for your workload and storage type can significantly improve performance.

## Understanding the Three Schedulers

### mq-deadline

The mq-deadline scheduler attempts to provide a guaranteed latency for requests from the point where they reach the scheduler. It prevents starvation by using read and write batches and configurable expiration times. The kernel selects the default scheduler based on the device type; for NVMe devices, the default is none.

Best for:
- Database workloads
- Latency-sensitive applications
- Traditional hard drives (HDDs)
- Mixed read/write workloads

### bfq (Budget Fair Queuing)

The bfq scheduler allocates I/O bandwidth fairly among processes, similar to how CFS schedules CPU time. It provides good interactive responsiveness but has higher overhead than mq-deadline.

Best for:
- Desktop and interactive workloads
- Systems with many competing processes
- Scenarios where I/O fairness matters more than raw throughput

### none (No Scheduler)

The none scheduler uses a simple FIFO approach with minimal scheduler processing. It relies on the storage device's own command queuing (like NVMe or hardware RAID controllers) to optimize I/O order.

Best for:
- NVMe SSDs (which have their own internal schedulers)
- Hardware RAID controllers with write-back cache
- Virtual machine guests with multi-queue-capable host bus adapters
- High-performance SSDs

## Checking the Current Scheduler

```bash
cat /sys/block/sda/queue/scheduler
```

Output:

```text
[mq-deadline] kyber bfq none
```

The bracketed entry is the active scheduler.

For NVMe:

```bash
cat /sys/block/nvme0n1/queue/scheduler
```

## Changing the Scheduler Temporarily

```bash
echo "bfq" | sudo tee /sys/block/sda/queue/scheduler
```

This change takes effect immediately but does not persist across reboots.

## Making the Change Persistent with udev Rules

Create a udev rule:

```bash
sudo vi /etc/udev/rules.d/60-io-scheduler.rules
```

Set mq-deadline for HDDs and none for NVMe:

```text
# Set mq-deadline for rotational disks

ACTION=="add|change", SUBSYSTEM=="block", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"

# Set none for SSDs
ACTION=="add|change", SUBSYSTEM=="block", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="none"

# Set none for NVMe
ACTION=="add|change", SUBSYSTEM=="block", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"
```

Reload udev rules:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger --type=devices --action=change
```

## Making the Change Persistent with Kernel Parameters

Do not use the `elevator=` kernel parameter on RHEL 9. It no longer changes the I/O scheduler. Use udev rules or TuneD instead; udev rules offer per-device control.

## Tuning mq-deadline Parameters

View current settings:

```bash
ls /sys/block/sda/queue/iosched/
```

Key parameters:

```bash
# Read deadline in milliseconds (default: 500)
cat /sys/block/sda/queue/iosched/read_expire

# Write deadline in milliseconds (default: 5000)
cat /sys/block/sda/queue/iosched/write_expire

# Number of reads before a write batch (default: 2)
cat /sys/block/sda/queue/iosched/writes_starved

# FIFO batch size (default: 16)
cat /sys/block/sda/queue/iosched/fifo_batch
```

For database workloads, reduce read deadline:

```bash
echo 100 | sudo tee /sys/block/sda/queue/iosched/read_expire
echo 1000 | sudo tee /sys/block/sda/queue/iosched/write_expire
```

## Tuning bfq Parameters

```bash
# Low latency mode (default: 1)
cat /sys/block/sda/queue/iosched/low_latency

# Slice idle time in microseconds
cat /sys/block/sda/queue/iosched/slice_idle_us
```

For throughput-oriented workloads with bfq:

```bash
echo 0 | sudo tee /sys/block/sda/queue/iosched/low_latency
```

## Benchmarking Different Schedulers

Use fio to compare performance:

```bash
for SCHED in mq-deadline bfq none; do
    echo "$SCHED" | sudo tee /sys/block/sda/queue/scheduler
    echo "Testing scheduler: $SCHED"
    fio --name=test --filename=/data/fio_test --size=1G \
        --rw=randrw --bs=4k --direct=1 --numjobs=4 \
        --runtime=30 --time_based --group_reporting
    echo "---"
done
```

## Scheduler Selection Guide

| Device Type | Recommended Scheduler | Reason |
|-------------|----------------------|--------|
| HDD | mq-deadline | Minimizes seek time with deadlines |
| SATA SSD | mq-deadline or none | Either works well |
| NVMe SSD | none | Device has internal scheduler |
| Virtual disk | mq-deadline, or none with a multi-queue-capable HBA | RHEL recommends mq-deadline for virtual guests, with none as an option for multi-queue-capable HBA drivers |
| HW RAID | none | Controller has write-back cache |

## Summary

Choosing the right I/O scheduler on RHEL is a straightforward but impactful optimization. Use mq-deadline or bfq for HDDs, bfq for interactive fairness, none for NVMe, and mq-deadline for most virtual guests unless a multi-queue-capable HBA makes none appropriate. Make changes persistent with udev rules for per-device control, and benchmark with fio to validate your choice for your specific workload.
