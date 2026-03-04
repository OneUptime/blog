# How to Diagnose and Fix Memory Leaks and High Memory Usage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, Performance, Troubleshooting, Linux, Debugging

Description: Learn how to diagnose memory leaks and resolve high memory usage on RHEL using system monitoring and debugging tools.

---

Memory leaks cause applications to consume increasing amounts of memory over time, eventually leading to system instability or OOM (Out of Memory) killer events. RHEL provides several tools to identify memory-hungry processes and diagnose leaks.

## Prerequisites

- A RHEL system
- Root or sudo access

## Step 1: Check Current Memory Usage

View system memory:

```bash
free -h
```

Key values:

- **used** - Memory actively used by applications
- **buff/cache** - Memory used for filesystem buffers and cache (reclaimable)
- **available** - Memory available for new applications

A system is not necessarily low on memory just because "used" is high. Check "available" for the true picture.

## Step 2: Identify Memory-Hungry Processes

Find processes using the most memory:

```bash
ps aux --sort=-%mem | head -15
```

Key columns:

- **%MEM** - Percentage of total physical memory
- **RSS** - Resident Set Size (actual physical memory used, in KB)
- **VSZ** - Virtual memory size (allocated, not necessarily used)

More detailed view:

```bash
ps -eo pid,ppid,user,rss:10,vsz:10,comm --sort=-rss | head -15
```

## Step 3: Monitor Memory Growth

Watch a specific process for memory growth over time:

```bash
pidstat -r -p $(pgrep my-app | head -1) 5 60
```

This samples every 5 seconds for 60 intervals. If RSS grows continuously, you likely have a memory leak.

## Step 4: Check for OOM Events

Look for OOM killer activity:

```bash
sudo dmesg | grep -i "out of memory"
sudo journalctl -k | grep -i "oom"
```

View which processes were killed:

```bash
sudo dmesg | grep -i "killed process"
```

## Step 5: Analyze Process Memory Maps

View detailed memory allocation for a process:

```bash
cat /proc/$(pgrep my-app | head -1)/smaps_rollup
```

View the memory map:

```bash
pmap -x $(pgrep my-app | head -1)
```

Key columns:

- **Kbytes** - Size of the mapping
- **RSS** - Resident pages
- **Dirty** - Modified pages (potentially leaked)

## Step 6: Trace Memory Allocations

### Using memleak (BCC tool)

Trace outstanding allocations that are not freed:

```bash
sudo dnf install bcc-tools -y
sudo /usr/share/bcc/tools/memleak -p $(pgrep my-app | head -1) 30
```

This shows stack traces for allocations not freed after 30 seconds.

### Using Valgrind

For applications you can restart, use Valgrind:

```bash
sudo dnf install valgrind -y
valgrind --leak-check=full --show-leak-kinds=all ./my-application
```

Valgrind slows execution by 10-50x, so use it only in test environments.

## Step 7: Check Kernel Memory Usage

View slab cache usage:

```bash
sudo slabtop -s c
```

Large slab caches can indicate kernel memory issues. Check for excessive dentry or inode caches:

```bash
cat /proc/meminfo | grep -E "Slab|SReclaimable|SUnreclaim"
```

## Step 8: Free Cached Memory

If the system is under memory pressure, drop caches:

```bash
# Drop page cache
echo 1 | sudo tee /proc/sys/vm/drop_caches

# Drop dentries and inodes
echo 2 | sudo tee /proc/sys/vm/drop_caches

# Drop all caches
echo 3 | sudo tee /proc/sys/vm/drop_caches
```

This is a temporary measure. The caches will rebuild.

## Step 9: Limit Process Memory with cgroups

Prevent a process from using too much memory:

```bash
sudo mkdir -p /sys/fs/cgroup/mem-limited
echo "2G" | sudo tee /sys/fs/cgroup/mem-limited/memory.max
echo "1G" | sudo tee /sys/fs/cgroup/mem-limited/memory.high
echo $PID | sudo tee /sys/fs/cgroup/mem-limited/cgroup.procs
```

## Step 10: Configure the OOM Killer

Adjust OOM killer priority for critical processes:

```bash
# Lower score = less likely to be killed (range: -1000 to 1000)
echo -500 | sudo tee /proc/$(pgrep critical-app | head -1)/oom_score_adj
```

Protect a process from OOM killer:

```bash
echo -1000 | sudo tee /proc/$(pgrep critical-app | head -1)/oom_score_adj
```

## Conclusion

Diagnosing memory leaks on RHEL requires monitoring memory growth over time, tracing allocations with memleak or Valgrind, and analyzing process memory maps. Use cgroups to limit memory usage and configure OOM killer priorities to protect critical applications.
