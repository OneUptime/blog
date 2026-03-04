# How to Diagnose and Resolve High I/O Wait on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, I/O Wait, Performance, Troubleshooting, Storage, Linux

Description: Learn how to diagnose the root cause of high I/O wait on RHEL and apply targeted fixes to restore system performance.

---

High I/O wait (%iowait) means CPUs are idle because they are waiting for disk operations to complete. This is one of the most common performance problems on Linux servers and can make an otherwise fast system feel sluggish. On RHEL, several tools help you trace the problem from symptom to root cause.

## Identifying High I/O Wait

Check current I/O wait:

```bash
top
```

Look at the `%wa` (wait) value in the CPU line. Values consistently above 20% indicate a storage bottleneck.

Or use vmstat:

```bash
vmstat 1
```

The `wa` column shows I/O wait percentage.

## Step 1: Identify Which Device Is Overloaded

```bash
iostat -x 1
```

Look for devices with high `%util` (approaching 100%) and high `await` values. This tells you which physical device is the bottleneck.

## Step 2: Identify Which Processes Are Causing I/O

```bash
sudo iotop -oP
```

This shows only processes actively performing I/O, sorted by throughput. Look for:

- Processes with high read or write rates
- Processes with high IO% (time spent waiting for I/O)

## Step 3: Understand What Files Are Being Accessed

Use fatrace to see real-time file access:

```bash
sudo dnf install fatrace
sudo fatrace -f W  # Show only writes
```

Or use strace on a specific process:

```bash
sudo strace -e trace=read,write,open -p PID
```

## Common Causes and Solutions

### Excessive Logging

Symptom: A process writing heavily to /var/log.

Fix:

```bash
# Reduce log verbosity in the application configuration
# Rotate logs more aggressively
sudo vi /etc/logrotate.d/application
```

### Swap Thrashing

Symptom: High I/O wait with heavy swap usage.

Check:

```bash
free -h
vmstat 1
```

If `si` (swap in) and `so` (swap out) are consistently non-zero:

```bash
# Add more RAM (permanent fix)
# Or reduce swappiness temporarily
sudo sysctl vm.swappiness=10
```

### Database Queries Causing Full Table Scans

Symptom: Database process shows high I/O in iotop.

Fix: Add proper indexes, optimize queries, or increase database buffer pool size.

### Filesystem Journaling Overhead

Check if journal writes are the bottleneck:

```bash
iostat -x 1 | grep -E "Device|journal"
```

Consider using `nobarrier` mount option for non-critical data (use with caution):

```bash
sudo mount -o remount,nobarrier /data
```

### Insufficient I/O Scheduler Tuning

Check and change the I/O scheduler:

```bash
cat /sys/block/sda/queue/scheduler
# For SSDs
echo "none" | sudo tee /sys/block/sda/queue/scheduler
# For HDDs with mixed workloads
echo "mq-deadline" | sudo tee /sys/block/sda/queue/scheduler
```

### Too Many Small Random Writes

Symptom: High IOPS with low throughput on HDDs.

Solutions:

- Move workload to SSD
- Increase application write buffering
- Use a write-back cache

## Step 4: Check for Hardware Issues

```bash
sudo smartctl -H /dev/sda
sudo smartctl -A /dev/sda
```

Look for:

- Reallocated sectors
- Pending sectors
- UDMA CRC errors

A failing drive can cause dramatically increased I/O wait.

## Step 5: Check for RAID Rebuild

```bash
cat /proc/mdstat
```

A rebuilding RAID array consumes significant I/O bandwidth. You can throttle the rebuild speed:

```bash
# Reduce rebuild speed to free I/O for applications
echo 50000 | sudo tee /proc/sys/dev/raid/speed_limit_max
```

## Tuning Dirty Page Settings

If writes are bursty, tune the kernel's dirty page handling:

```bash
# Allow more dirty pages in memory (delays writes)
sudo sysctl vm.dirty_ratio=40
sudo sysctl vm.dirty_background_ratio=10

# Increase dirty page expiry time
sudo sysctl vm.dirty_expire_centisecs=6000
```

Make persistent in `/etc/sysctl.d/`:

```bash
sudo tee /etc/sysctl.d/90-io-tuning.conf << CONF
vm.dirty_ratio = 40
vm.dirty_background_ratio = 10
vm.dirty_expire_centisecs = 6000
vm.dirty_writeback_centisecs = 500
CONF
sudo sysctl --system
```

## Using perf for Deep Analysis

```bash
sudo perf record -g -a -- sleep 30
sudo perf report
```

Look for kernel functions related to I/O in the call stacks.

## Quick Diagnostic Checklist

1. `top` or `vmstat 1` - Confirm high iowait
2. `iostat -x 1` - Identify the overloaded device
3. `sudo iotop -oP` - Identify the responsible processes
4. `smartctl -H` - Check for hardware failures
5. `free -h` and `vmstat 1` - Check for swap thrashing
6. `cat /proc/mdstat` - Check for RAID rebuilds
7. Check I/O scheduler and queue settings

## Summary

High I/O wait on RHEL is a symptom, not a root cause. Use iostat to find the overloaded device, iotop to find the responsible processes, and then investigate whether the issue is application behavior, hardware failure, misconfiguration, or simply insufficient storage capacity. Apply targeted fixes based on the root cause rather than generic tuning, and always verify improvements with measurements.
