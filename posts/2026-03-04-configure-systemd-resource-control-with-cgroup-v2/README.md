# How to Configure systemd Resource Control with Cgroup v2 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd, System Administration, Cgroups, Linux

Description: Learn how to configure systemd Resource Control with Cgroup v2 on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Cgroup v2 is the default control group hierarchy on RHEL and provides a unified way to manage CPU, memory, I/O, and other resources for services managed by systemd. This guide covers how to configure resource control for systemd services using cgroup v2.

## Prerequisites

- RHEL (cgroup v2 is enabled by default)
- Root or sudo access
- Basic familiarity with systemd unit files

## Verify Cgroup v2 Is Active

```bash
mount | grep cgroup2
# Expected: cgroup2 on /sys/fs/cgroup type cgroup2
stat -f /sys/fs/cgroup/ | grep Type
```

If you see `cgroup2` in the output, the unified hierarchy is active.

## Understanding the Cgroup Hierarchy

systemd organizes cgroups into slices, scopes, and services:

```bash
-.slice (root)
  |-- system.slice (system services)
  |     |-- httpd.service
  |     |-- sshd.service
  |-- user.slice (user sessions)
  |-- machine.slice (VMs and containers)
```

## Step 1: Set CPU Limits for a Service

Edit or create a drop-in configuration:

```bash
sudo systemctl edit myapp.service
```

Add resource controls:

```ini
[Service]
CPUQuota=200%
CPUWeight=100
```

`CPUQuota=200%` means the service can use up to two full CPU cores. `CPUWeight` controls relative priority (default is 100, range 1-10000).

## Step 2: Set Memory Limits

```ini
[Service]
MemoryMax=2G
MemoryHigh=1G
MemorySwapMax=512M
```

| Property | Description |
|----------|-------------|
| `MemoryMax` | Hard memory limit (OOM kill if exceeded) |
| `MemoryHigh` | Soft limit (throttling begins) |
| `MemoryLow` | Memory protection (best-effort reservation) |
| `MemoryMin` | Hard memory reservation |
| `MemorySwapMax` | Maximum swap usage |

## Step 3: Set I/O Limits

```ini
[Service]
IOWeight=200
IOReadBandwidthMax=/dev/sda 50M
IOWriteBandwidthMax=/dev/sda 30M
```

## Step 4: Create a Custom Slice

For grouping related services:

```bash
sudo vi /etc/systemd/system/apps.slice
```

```ini
[Unit]
Description=Application Services Slice

[Slice]
CPUQuota=400%
MemoryMax=8G
```

Assign a service to this slice:

```ini
[Service]
Slice=apps.slice
```

## Step 5: Apply and Verify

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp.service
```

Check the cgroup settings:

```bash
systemctl show myapp.service | grep -E 'CPU|Memory|IO'
cat /sys/fs/cgroup/system.slice/myapp.service/memory.max
cat /sys/fs/cgroup/system.slice/myapp.service/cpu.max
```

## Step 6: Monitor Resource Usage

```bash
systemd-cgtop
```

This shows real-time CPU, memory, and I/O usage per cgroup.

For a specific service:

```bash
systemctl status myapp.service
cat /sys/fs/cgroup/system.slice/myapp.service/memory.current
```

## Conclusion

systemd with cgroup v2 on RHEL provides fine-grained resource control for services. By setting CPU quotas, memory limits, and I/O constraints, you can prevent runaway processes from affecting the rest of the system and ensure fair resource allocation across workloads.
