# How to Monitor Memory Usage and Troubleshoot OOM Kills on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Memory Management, Linux, System Administration, Troubleshooting

Description: Learn how to monitor memory usage on Ubuntu, understand OOM killer behavior, investigate OOM kill events, and configure systems to prevent unexpected process terminations.

---

An OOM (Out of Memory) kill happens when the Linux kernel's OOM killer terminates a process because the system has run out of memory and cannot fulfill an allocation request. It's a last-resort mechanism, but when it kills a critical service mid-operation, the results can be severe. Understanding how to monitor memory, detect OOM kills, and adjust system behavior is a key skill for any Linux administrator.

## Checking Current Memory Usage

Start with the basics:

```bash
# Human-readable memory overview
free -h
```

Output:

```text
               total        used        free      shared  buff/cache   available
Mem:            15Gi        8.2Gi       1.1Gi       512Mi       6.1Gi       6.8Gi
Swap:          2.0Gi        0.0Gi       2.0Gi
```

The `available` column is what matters for OOM decisions - it represents how much memory can be made available quickly by freeing page cache. Don't confuse `free` with `available`.

```bash
# Detailed memory breakdown
cat /proc/meminfo
```

Key fields:
- `MemTotal` - Total physical RAM
- `MemAvailable` - Memory available for new allocations (most useful metric)
- `Committed_AS` - Total virtual memory committed by all processes
- `CommitLimit` - Total memory that can be committed (RAM + swap)
- `Cached` - Page cache (can be reclaimed)
- `Shmem` - Shared memory (tmpfs, etc.)

## Monitoring Memory Over Time

Watch memory usage continuously:

```bash
# Refresh free every 2 seconds
watch -n 2 free -h

# Use vmstat for memory trends
vmstat -S M 2  # show in megabytes, 2-second intervals
```

For historical data, use `sar`:

```bash
# Memory history for today
sar -r 1

# Watch for swap activity (a precursor to OOM)
sar -S 1
```

## Detecting OOM Kills

When a process is killed by the OOM killer, it's logged to the kernel ring buffer and system journal.

### Check Recent OOM Kills

```bash
# Check dmesg for OOM events
sudo dmesg | grep -i "oom\|killed\|out of memory"

# More detailed OOM messages
sudo dmesg | grep -A 10 "Out of memory"
```

OOM kill messages look like:

```text
[123456.789] Out of memory: Kill process 12345 (java) score 823 or sacrifice child
[123456.790] Killed process 12345 (java) total-vm:4194304kB, anon-rss:2097152kB, file-rss:0kB
```

### Check systemd Journal

```bash
# Search journal for OOM events
sudo journalctl -k | grep -i "oom\|killed process\|out of memory"

# Last 24 hours
sudo journalctl -k --since "24 hours ago" | grep -i oom

# Follow in real time
sudo journalctl -k -f | grep -i oom
```

### Check for Processes Killed by SIGKILL from Kernel

```bash
# Look for OOM kills in kernel messages with timestamp
sudo journalctl -k --since "1 hour ago" -g "oom" --output verbose
```

## Understanding the OOM Score

The OOM killer assigns each process an "OOM score" from 0 to 1000. Higher scores are killed first. The score is based on memory usage relative to total RAM, adjusted by the `oom_score_adj` value.

```bash
# Check OOM score for all processes
for pid in /proc/[0-9]*/; do
    pid_num=$(basename $pid)
    score=$(cat $pid/oom_score 2>/dev/null)
    name=$(cat $pid/comm 2>/dev/null)
    [ -n "$score" ] && echo "$score $pid_num $name"
done | sort -rn | head -20
```

```bash
# Check OOM score for a specific process
cat /proc/$(pgrep nginx | head -1)/oom_score

# Check the adjustment value
cat /proc/$(pgrep nginx | head -1)/oom_score_adj
```

## Protecting Critical Processes from OOM Kills

Adjust the `oom_score_adj` to make a process less likely to be killed. The range is -1000 (never kill) to 1000 (always kill first).

```bash
# Protect a process - lower score means less likely to be killed
echo -500 | sudo tee /proc/$(pgrep sshd | head -1)/oom_score_adj

# Set a process as always-kill (sacrifice this first to protect others)
echo 1000 | sudo tee /proc/$(pgrep myapp)/oom_score_adj
```

For systemd services, set this in the unit file:

```bash
sudo systemctl edit sshd
```

Add:

```ini
[Service]
OOMScoreAdjust=-500
```

```bash
# Completely exempt a process (requires root and capability)
echo -1000 | sudo tee /proc/1/oom_score_adj  # protect init
```

## Disabling OOM Killer (Rare Cases)

In some scenarios you want the system to hang rather than kill processes (e.g., a database where data integrity matters more than availability):

```bash
# Disable OOM killer system-wide (use with caution)
sudo sysctl vm.overcommit_memory=2
sudo sysctl vm.overcommit_ratio=80  # allow commit up to 80% of RAM + swap
```

With `overcommit_memory=2`, memory allocations that would exceed the commit limit are refused immediately rather than allowed and later killed by OOM.

```bash
# Check current overcommit settings
sysctl vm.overcommit_memory vm.overcommit_ratio vm.overcommit_kbytes
```

## Monitoring Per-Process Memory

Find which process is using the most RAM:

```bash
# Sort processes by RSS (resident set size)
ps aux --sort=-%mem | head -20

# Show virtual, resident, and shared memory per process
ps -eo pid,comm,vsz,rss,pmem --sort=-%mem | head -20

# In megabytes
ps -eo pid,comm,rss --sort=-rss | head -20 | awk 'NR==1{print} NR>1{printf "%s %s %.1f MB\n", $1, $2, $3/1024}'
```

## Detecting Memory Leaks

A process whose RSS grows steadily over time has a memory leak:

```bash
# Watch RSS for a specific process over time
watch -n 5 "ps -o pid,rss,comm -p $(pgrep myapp) | awk '{print \$0, strftime(\"%H:%M:%S\")}'"

# Log RSS to file
while true; do
    echo "$(date +%T) $(cat /proc/$(pgrep myapp)/status | grep VmRSS)"
    sleep 30
done
```

## Kernel Memory Analysis

```bash
# Slab cache usage (kernel data structures)
cat /proc/slabinfo | sort -k3 -rn | head -20

# Or use slabtop for interactive view
sudo slabtop

# Memory zones
cat /proc/buddyinfo
```

High slab usage can contribute to OOM situations even when process RSS seems manageable.

## Setting Memory Limits with cgroups

Prevent runaway processes from exhausting memory systemd-wide:

```bash
# Set memory limit for a systemd service
sudo systemctl edit myservice
```

Add:

```ini
[Service]
MemoryMax=2G
MemoryHigh=1.5G
```

With `MemoryHigh`, systemd applies memory pressure to the service when it approaches the limit. With `MemoryMax`, the OOM killer within the cgroup is invoked rather than the global OOM killer.

```bash
# Check current memory limits for services
systemctl show myservice | grep -i memory
```

## Swap Configuration

Swap gives the OOM killer more time before it has to act. Configure swap:

```bash
# Check swap
swapon --show

# Add a swap file if none exists
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Adjust swappiness to control when swap is used:

```bash
# Default is 60; lower values prefer RAM over swap
sudo sysctl vm.swappiness=10

# Make permanent
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.d/99-memory.conf
```

## Real-Time OOM Monitoring

For a production alert when OOM events occur:

```bash
#!/bin/bash
# oom-monitor.sh - alert on OOM kills

journalctl -k -f | while read line; do
    if echo "$line" | grep -qi "oom\|killed process"; then
        echo "OOM EVENT at $(date): $line" | mail -s "OOM Kill Detected" admin@example.com
        logger -t oom-monitor "OOM DETECTED: $line"
    fi
done
```

Understanding memory usage and OOM kill patterns before an incident happens is far better than investigating after the fact. Set up memory monitoring early, protect critical processes with appropriate `oom_score_adj` values, and use cgroup memory limits to contain services that are prone to memory growth.
