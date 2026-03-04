# How to Configure Control Groups (cgroups v2) for Resource Management on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cgroups, Resource Management, Performance, Linux, Containers

Description: Learn how to configure cgroups v2 on RHEL to limit and manage CPU, memory, and I/O resources for processes and services.

---

Control Groups (cgroups) v2 is the unified resource management framework on RHEL. It lets you limit CPU, memory, I/O, and other resources for processes and services. RHEL uses cgroups v2 by default.

## Prerequisites

- A RHEL system
- Root or sudo access

## Verifying cgroups v2

Confirm cgroups v2 is active:

```bash
mount | grep cgroup2
```

Expected output:

```bash
cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nosuid,nodev,noexec,relatime)
```

Check available controllers:

```bash
cat /sys/fs/cgroup/cgroup.controllers
```

Output: `cpuset cpu io memory hugetlb pids rdma misc`

## Understanding the cgroups v2 Hierarchy

The cgroups v2 filesystem is mounted at `/sys/fs/cgroup/`. Each directory is a cgroup, and you manage it through files in that directory.

View the root cgroup:

```bash
ls /sys/fs/cgroup/
```

## Creating a cgroup

Create a new cgroup:

```bash
sudo mkdir /sys/fs/cgroup/mygroup
```

Enable controllers for the group:

```bash
echo "+cpu +memory +io" | sudo tee /sys/fs/cgroup/cgroup.subtree_control
```

## Limiting CPU Resources

### CPU Weight (Proportional Sharing)

Set CPU weight (default is 100, range is 1-10000):

```bash
echo 50 | sudo tee /sys/fs/cgroup/mygroup/cpu.weight
```

A group with weight 50 gets half the CPU time of a group with weight 100 when both are competing.

### CPU Maximum (Hard Limit)

Limit a group to 50% of one CPU:

```bash
echo "50000 100000" | sudo tee /sys/fs/cgroup/mygroup/cpu.max
```

The format is `quota period` in microseconds. 50000/100000 = 50% of one CPU.

Limit to 2 full CPUs:

```bash
echo "200000 100000" | sudo tee /sys/fs/cgroup/mygroup/cpu.max
```

### CPU Set (Specific CPUs)

Restrict to specific CPUs:

```bash
echo "0-3" | sudo tee /sys/fs/cgroup/mygroup/cpuset.cpus
echo "0" | sudo tee /sys/fs/cgroup/mygroup/cpuset.mems
```

## Limiting Memory Resources

### Memory Maximum (Hard Limit)

Limit a group to 2GB of memory:

```bash
echo "2G" | sudo tee /sys/fs/cgroup/mygroup/memory.max
```

### Memory High (Soft Limit)

Throttle memory allocation above this threshold:

```bash
echo "1G" | sudo tee /sys/fs/cgroup/mygroup/memory.high
```

Processes can exceed the high limit but will be throttled and reclaimed.

### Memory Low (Protection)

Protect at least 512MB from reclaim:

```bash
echo "512M" | sudo tee /sys/fs/cgroup/mygroup/memory.low
```

### Disable Swap

Limit swap usage:

```bash
echo "0" | sudo tee /sys/fs/cgroup/mygroup/memory.swap.max
```

## Limiting I/O Resources

### I/O Weight

Set proportional I/O weight (1-10000, default 100):

```bash
echo "default 50" | sudo tee /sys/fs/cgroup/mygroup/io.weight
```

### I/O Maximum (Hard Limit)

Find your block device's major:minor numbers:

```bash
lsblk -o NAME,MAJ:MIN
```

Limit read and write bandwidth on device 8:0 (sda):

```bash
echo "8:0 rbps=10485760 wbps=5242880" | sudo tee /sys/fs/cgroup/mygroup/io.max
```

This limits reads to 10MB/s and writes to 5MB/s.

Limit IOPS:

```bash
echo "8:0 riops=1000 wiops=500" | sudo tee /sys/fs/cgroup/mygroup/io.max
```

## Limiting Process Count

Prevent fork bombs:

```bash
echo 100 | sudo tee /sys/fs/cgroup/mygroup/pids.max
```

## Adding Processes to a cgroup

Move a running process:

```bash
echo $PID | sudo tee /sys/fs/cgroup/mygroup/cgroup.procs
```

View processes in a cgroup:

```bash
cat /sys/fs/cgroup/mygroup/cgroup.procs
```

## Using systemd for cgroup Management

Set resource limits for a service:

```bash
sudo systemctl edit myservice.service
```

Add:

```ini
[Service]
MemoryMax=2G
MemoryHigh=1G
CPUQuota=200%
CPUWeight=50
IOWeight=50
TasksMax=100
```

Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myservice
```

View the cgroup for a service:

```bash
systemctl show myservice.service -p ControlGroup
```

## Monitoring cgroup Resource Usage

View memory usage:

```bash
cat /sys/fs/cgroup/mygroup/memory.current
cat /sys/fs/cgroup/mygroup/memory.stat
```

View CPU usage:

```bash
cat /sys/fs/cgroup/mygroup/cpu.stat
```

View I/O usage:

```bash
cat /sys/fs/cgroup/mygroup/io.stat
```

## Conclusion

cgroups v2 on RHEL provides unified resource management for CPU, memory, I/O, and process counts. Use direct cgroup manipulation for custom setups or systemd resource directives for services. cgroups are the foundation of container resource isolation and are essential for multi-tenant systems.
