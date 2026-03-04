# How to Use cgroups v2 to Limit CPU and Memory for Individual Processes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cgroups, Linux

Description: Learn how to use cgroups v2 to Limit CPU and Memory for Individual Processes on RHEL with step-by-step instructions, configuration examples, and best practices.

---

cgroups v2 on RHEL provides fine-grained resource control for individual processes. You can limit CPU, memory, and I/O for any process without needing to modify its code or run it as a systemd service.

## Prerequisites

- RHEL (cgroups v2 enabled by default)
- Root or sudo access

## Step 1: Verify cgroups v2

```bash
mount | grep cgroup2
```

## Step 2: Create a Custom Cgroup

```bash
sudo mkdir /sys/fs/cgroup/limited
```

Enable controllers:

```bash
echo "+cpu +memory +io" | sudo tee /sys/fs/cgroup/cgroup.subtree_control
```

## Step 3: Set CPU Limits

Limit to 50% of one CPU core (50000 microseconds per 100000 microsecond period):

```bash
echo "50000 100000" | sudo tee /sys/fs/cgroup/limited/cpu.max
```

Set CPU weight (relative priority):

```bash
echo "50" | sudo tee /sys/fs/cgroup/limited/cpu.weight
```

## Step 4: Set Memory Limits

Hard limit of 512 MB:

```bash
echo "536870912" | sudo tee /sys/fs/cgroup/limited/memory.max
```

Soft limit (throttling threshold):

```bash
echo "268435456" | sudo tee /sys/fs/cgroup/limited/memory.high
```

## Step 5: Add a Process to the Cgroup

```bash
echo $PID | sudo tee /sys/fs/cgroup/limited/cgroup.procs
```

Or start a new process in the cgroup:

```bash
sudo systemd-run --scope --slice=limited.slice   --property=MemoryMax=512M --property=CPUQuota=50%   /usr/local/bin/myapp
```

## Step 6: Monitor Usage

```bash
cat /sys/fs/cgroup/limited/cpu.stat
cat /sys/fs/cgroup/limited/memory.current
cat /sys/fs/cgroup/limited/memory.stat
```

## Step 7: Set I/O Limits

Find your disk's major:minor number:

```bash
lsblk -d -o NAME,MAJ:MIN
```

Set bandwidth limits:

```bash
echo "8:0 rbps=10485760 wbps=5242880" | sudo tee /sys/fs/cgroup/limited/io.max
```

This limits reads to 10 MB/s and writes to 5 MB/s on device 8:0.

## Step 8: Clean Up

Remove all processes from the cgroup first, then remove it:

```bash
for pid in $(cat /sys/fs/cgroup/limited/cgroup.procs); do
    echo $pid | sudo tee /sys/fs/cgroup/cgroup.procs
done
sudo rmdir /sys/fs/cgroup/limited
```

## Conclusion

cgroups v2 on RHEL gives you direct control over resource usage for any process. Whether you use the raw cgroup filesystem or systemd-run for convenience, cgroups are essential for preventing resource contention on shared systems.
