# How to Use Memory Cgroups to Limit and Monitor Application Memory on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cgroups, Memory, Linux

Description: Learn how to use Memory Cgroups to Limit and Monitor Application Memory on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Memory cgroups (control groups) let you set hard limits, throttling thresholds, and memory protections for applications, preventing any single process or group from consuming all available RAM. On RHEL 9 with cgroup v2, memory control is integrated with systemd.

## Prerequisites

- RHEL 9 with cgroup v2 (default), or RHEL 8 configured to use cgroup v2
- Root or sudo access

## Step 1: Set Memory Limits via systemd

The simplest approach is using systemd service properties:

```bash
sudo systemctl edit myapp.service
```

```ini
[Service]
MemoryMax=2G
MemoryHigh=1536M
MemorySwapMax=512M
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp.service
```

## Step 2: Understand Memory Limit Types

| Property | Behavior |
|----------|----------|
| `MemoryMin` | Hard memory protection |
| `MemoryLow` | Best-effort memory protection |
| `MemoryHigh` | Throttling threshold (slows down allocation) |
| `MemoryMax` | Absolute limit (OOM killer is invoked if usage cannot be contained) |
| `MemorySwapMax` | Maximum swap usage |

## Step 3: Monitor Memory Usage

```bash
systemctl show myapp.service --property=MemoryCurrent
```

Or directly from the cgroup filesystem:

```bash
cat /sys/fs/cgroup/system.slice/myapp.service/memory.current
cat /sys/fs/cgroup/system.slice/myapp.service/memory.stat
```

Key fields in `memory.stat`:
- `anon` - Anonymous memory (heap, stack)
- `file` - Page cache
- `slab` - Kernel slab allocations
- `pgfault` - Page faults

## Step 4: Set Limits with systemd-run

For temporary limits:

```bash
sudo systemd-run --scope --property=MemoryMax=1G /usr/local/bin/myapp
```

## Step 5: View Memory Events

```bash
cat /sys/fs/cgroup/system.slice/myapp.service/memory.events
```

Fields include:
- `low` - Times memory was reclaimed despite being below MemoryLow
- `high` - Times memory exceeded MemoryHigh (throttled)
- `max` - Times memory hit MemoryMax (reclaim attempted)
- `oom` - OOM events
- `oom_kill` - Processes killed by OOM

## Step 6: Create a Memory-Limited Slice

```bash
sudo vi /etc/systemd/system/memlimited.slice
```

```ini
[Unit]
Description=Memory Limited Applications

[Slice]
MemoryMax=4G
MemoryHigh=3G
```

```bash
sudo systemctl daemon-reload
```

Assign services:

```ini
[Service]
Slice=memlimited.slice
```

## Step 7: Test Memory Limits

```bash
sudo systemd-run --scope --property=MemoryMax=100M   stress-ng --vm 1 --vm-bytes 200M -t 30s
```

You should see the process get OOM-killed when it tries to use more than 100 MB.

## Conclusion

Memory cgroups on RHEL provide essential resource isolation. Use `MemoryHigh` for graceful throttling and `MemoryMax` as a hard safety limit. Combined with systemd, memory cgroups make it straightforward to prevent any application from starving the system of memory.
