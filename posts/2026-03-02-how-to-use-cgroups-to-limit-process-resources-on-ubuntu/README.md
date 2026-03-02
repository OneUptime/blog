# How to Use cgroups to Limit Process Resources on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, cgroups, System Administration, Performance

Description: Learn how to use Linux control groups (cgroups) on Ubuntu to limit CPU, memory, I/O, and network resources for processes and services.

---

Control groups (cgroups) are a Linux kernel feature that lets you organize processes into hierarchical groups and apply resource limits, priorities, and accounting to each group. They're the foundation of container technologies like Docker and LXC, but you don't need containers to benefit from them.

Modern Ubuntu uses cgroups v2 (unified hierarchy), though v1 is still supported. This post focuses on cgroups v2 with systemd integration, which is the recommended approach on Ubuntu 22.04 and later.

## cgroups v1 vs v2

On Ubuntu 22.04+, cgroups v2 is the default. You can verify this:

```bash
# Check which cgroup version is in use
mount | grep cgroup

# cgroups v2 shows a single unified mount:
# cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nosuid,nodev,noexec,relatime)

# cgroups v1 shows multiple mounts:
# cgroup on /sys/fs/cgroup/memory type cgroup (rw,...,memory)
# cgroup on /sys/fs/cgroup/cpu,cpuacct type cgroup (rw,...,cpu,cpuacct)
```

## The cgroup Filesystem

Everything in cgroups is exposed through the virtual filesystem at `/sys/fs/cgroup`.

```bash
# View the root cgroup
ls /sys/fs/cgroup/

# Key interface files in cgroups v2:
# cgroup.controllers    - Available resource controllers
# cgroup.procs          - PIDs in this cgroup
# cgroup.subtree_control - Controllers enabled for child cgroups
# memory.max            - Memory limit
# cpu.max               - CPU quota
# io.max                - I/O limits
```

## Managing cgroups via systemd

The most practical way to use cgroups on Ubuntu is through systemd, which manages cgroups on behalf of all services and slices.

### System Slices

systemd organizes units into slices:
- `system.slice` - System services
- `user.slice` - User sessions
- `machine.slice` - Virtual machines and containers

```bash
# View slice hierarchy
systemd-cgls

# View resource usage per slice
systemd-cgtop

# Check which cgroup a process belongs to
cat /proc/$(pgrep nginx | head -1)/cgroup
```

### Setting Resource Limits on a systemd Service

The cleanest way to limit a service is via a drop-in override:

```bash
# Create an override for a service
sudo systemctl edit nginx.service

# This opens an editor. Add your limits:
```

```ini
[Service]
# Limit to 50% of one CPU core
CPUQuota=50%

# Memory limit: kill process if it exceeds this
MemoryMax=512M

# Memory high watermark: throttle before killing
MemoryHigh=400M

# I/O weight (100 is default, range 1-10000)
IOWeight=50

# Limit specific device I/O (reads and writes in bytes/sec)
IOReadBandwidthMax=/dev/sda 50M
IOWriteBandwidthMax=/dev/sda 25M
```

```bash
# Reload and restart the service
sudo systemctl daemon-reload
sudo systemctl restart nginx.service

# Verify the limits are applied
systemctl show nginx.service --property=CPUQuota,MemoryMax,IOWeight
```

### Setting Limits for All Services in a Slice

You can set defaults for an entire slice:

```bash
# Create a slice with limits
sudo nano /etc/systemd/system/limited.slice
```

```ini
[Unit]
Description=Slice for resource-limited services
Before=slices.target

[Slice]
CPUQuota=200%
MemoryMax=2G
IOWeight=50
```

```bash
# Assign a service to this slice
sudo systemctl edit myapp.service
```

```ini
[Service]
Slice=limited.slice
```

## Working Directly with the cgroup Filesystem

For more control, or for non-systemd processes, you can manage cgroups directly.

### Creating a cgroup

```bash
# Create a new cgroup
sudo mkdir /sys/fs/cgroup/mygroup

# Enable controllers for child cgroups
echo "+cpu +memory +io" | sudo tee /sys/fs/cgroup/mygroup/cgroup.subtree_control
```

### Setting Memory Limits

```bash
# Hard limit: processes are OOM-killed if they exceed this
echo "256M" | sudo tee /sys/fs/cgroup/mygroup/memory.max

# Soft limit: throttling begins above this, but processes aren't killed
echo "128M" | sudo tee /sys/fs/cgroup/mygroup/memory.high

# Minimum guaranteed memory
echo "64M" | sudo tee /sys/fs/cgroup/mygroup/memory.min

# Check current memory usage
cat /sys/fs/cgroup/mygroup/memory.current
```

### Setting CPU Limits

In cgroups v2, CPU limits are expressed as a quota within a period:

```bash
# Format: quota_microseconds period_microseconds
# Limit to 50% of one CPU: 50000 out of 100000 microseconds
echo "50000 100000" | sudo tee /sys/fs/cgroup/mygroup/cpu.max

# Limit to 200% (2 full CPUs) in a period of 100ms:
echo "200000 100000" | sudo tee /sys/fs/cgroup/mygroup/cpu.max

# No limit
echo "max 100000" | sudo tee /sys/fs/cgroup/mygroup/cpu.max

# CPU weight (relative priority, 1-10000, default 100)
echo "50" | sudo tee /sys/fs/cgroup/mygroup/cpu.weight
```

### Setting I/O Limits

```bash
# Find device major:minor numbers
ls -la /dev/sda
# brw-rw---- 1 root disk 8, 0 ...  <- 8:0 is the major:minor

# Limit read bandwidth to 10 MB/s
echo "8:0 rbps=10485760" | sudo tee /sys/fs/cgroup/mygroup/io.max

# Limit write bandwidth to 5 MB/s
echo "8:0 wbps=5242880" | sudo tee /sys/fs/cgroup/mygroup/io.max

# Limit read IOPS to 1000
echo "8:0 riops=1000" | sudo tee /sys/fs/cgroup/mygroup/io.max

# Combine multiple limits
echo "8:0 rbps=10485760 wbps=5242880 riops=1000 wiops=500" | sudo tee /sys/fs/cgroup/mygroup/io.max
```

### Adding Processes to a cgroup

```bash
# Move a process to a cgroup
echo 12345 | sudo tee /sys/fs/cgroup/mygroup/cgroup.procs

# Move the current shell and all subsequent children
echo $$ | sudo tee /sys/fs/cgroup/mygroup/cgroup.procs

# Run a command inside a cgroup using systemd-run
sudo systemd-run --slice=mygroup.slice --scope mycommand
```

## Using systemd-run for Temporary Limits

`systemd-run` is excellent for quickly running a command with resource constraints:

```bash
# Run a command with memory limit
sudo systemd-run --scope -p MemoryMax=512M mycommand

# Run with CPU limit (50%)
sudo systemd-run --scope -p CPUQuota=50% mycommand

# Multiple limits
sudo systemd-run --scope \
  -p MemoryMax=1G \
  -p CPUQuota=100% \
  -p IOWeight=10 \
  make -j8

# Run as a specific user
sudo systemd-run --uid=1000 --scope -p MemoryMax=512M mycommand
```

## Monitoring cgroup Resource Usage

```bash
# Real-time per-cgroup resource usage (like top for cgroups)
systemd-cgtop

# Memory usage of a specific cgroup
cat /sys/fs/cgroup/system.slice/nginx.service/memory.current

# CPU usage stats
cat /sys/fs/cgroup/system.slice/nginx.service/cpu.stat

# I/O stats
cat /sys/fs/cgroup/system.slice/nginx.service/io.stat

# Pressure information (cpu, io, memory pressure)
cat /sys/fs/cgroup/system.slice/nginx.service/cpu.pressure
cat /sys/fs/cgroup/system.slice/nginx.service/memory.pressure
cat /sys/fs/cgroup/system.slice/nginx.service/io.pressure
```

The pressure files report stall information using the PSI (Pressure Stall Information) format, which tells you what percentage of time processes are stalled waiting for a resource.

## Practical Example: Protecting a Database Server

Suppose you want to ensure your PostgreSQL database gets priority over other services:

```bash
# Create a high-priority slice for critical services
sudo nano /etc/systemd/system/critical.slice
```

```ini
[Unit]
Description=Critical Services Slice
Before=slices.target

[Slice]
# High CPU priority
CPUWeight=800

# High I/O priority
IOWeight=800

# Reserve memory
MemoryMin=2G
```

```bash
# Move PostgreSQL to this slice
sudo systemctl edit postgresql.service
```

```ini
[Service]
Slice=critical.slice
```

```bash
# Constrain a less important batch job
sudo systemctl edit batchjob.service
```

```ini
[Service]
CPUQuota=25%
MemoryMax=512M
IOWeight=10
Nice=15
```

cgroups give you precise control over how system resources are distributed across workloads. Whether you're preventing a runaway process from taking down a server, ensuring fair resource sharing between tenants, or prioritizing critical services over background tasks, cgroups provide the mechanism to enforce these policies reliably at the kernel level.
