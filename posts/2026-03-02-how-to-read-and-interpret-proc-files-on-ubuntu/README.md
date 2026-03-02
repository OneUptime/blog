# How to Read and Interpret /proc Files on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, System Administration, Kernel, Performance

Description: Learn how to read and interpret the /proc virtual filesystem on Ubuntu to gather system information, monitor processes, and tune kernel parameters.

---

The `/proc` filesystem is a window into the running kernel. It is not a real filesystem stored on disk - it is a virtual interface created by the kernel at boot time. Every file you read from `/proc` is generated on the fly by the kernel in response to your read request. This makes it an invaluable tool for monitoring, debugging, and tuning a Linux system without installing any additional software.

## Understanding the /proc Structure

The `/proc` directory contains two types of entries: files with system-wide information, and numbered subdirectories (one per running process, named after the process ID).

```bash
# Quick overview
ls /proc

# You'll see entries like:
# 1  2  3  ...  (process directories)
# cpuinfo  meminfo  version  uptime  ...  (system info files)
```

## System-Wide Information Files

### /proc/cpuinfo

Contains detailed information about each CPU core.

```bash
# View all CPU info
cat /proc/cpuinfo

# Count physical CPUs
grep "physical id" /proc/cpuinfo | sort -u | wc -l

# Count total cores
grep "cpu cores" /proc/cpuinfo | head -1

# Count logical CPUs (hardware threads)
grep -c "^processor" /proc/cpuinfo

# Get CPU model name
grep "model name" /proc/cpuinfo | head -1 | awk -F: '{print $2}' | xargs

# Check for virtualization support (vmx=Intel, svm=AMD)
grep -m1 "flags" /proc/cpuinfo | grep -o "vmx\|svm"
```

### /proc/meminfo

The most comprehensive source of memory statistics on the system.

```bash
cat /proc/meminfo

# Key fields:
# MemTotal     - Total physical RAM
# MemFree      - Completely unused RAM
# MemAvailable - RAM available for new allocations (better metric than MemFree)
# Buffers      - Kernel buffer cache (raw block device data)
# Cached       - Page cache (file-backed pages)
# SwapTotal    - Total swap space
# SwapFree     - Unused swap
# Dirty        - Memory waiting to be written to disk
# AnonPages    - Non-file-backed pages (heap, stack, etc.)
# Slab         - Kernel data structure cache

# Quick one-liner for available memory in GB
awk '/MemAvailable/ {printf "%.1f GB\n", $2/1024/1024}' /proc/meminfo
```

### /proc/uptime

```bash
cat /proc/uptime
# Output: 123456.78 456789.12
# First number: seconds since boot
# Second number: sum of idle time across all CPUs

# Human-readable uptime
awk '{days=int($1/86400); hours=int(($1%86400)/3600); mins=int(($1%3600)/60); printf "%d days, %d hours, %d minutes\n", days, hours, mins}' /proc/uptime
```

### /proc/loadavg

```bash
cat /proc/loadavg
# Output: 0.52 0.48 0.45 1/423 12847
# Fields: 1-min-avg  5-min-avg  15-min-avg  running/total-tasks  last-pid
```

The load average represents the number of processes in the run queue (running or waiting for CPU). A value of 1.0 on a single-core system means 100% utilization. On a 4-core system, a load of 4.0 means full utilization.

### /proc/version

```bash
cat /proc/version
# Shows kernel version, GCC version used to compile it, and build info
```

### /proc/cmdline

```bash
cat /proc/cmdline
# Shows the command line passed to the kernel by the bootloader
```

### /proc/filesystems

```bash
cat /proc/filesystems
# Lists all filesystem types the kernel knows about
# "nodev" entries are virtual (proc, sysfs, tmpfs, etc.)
```

### /proc/mounts

```bash
cat /proc/mounts
# Currently mounted filesystems - more reliable than /etc/mtab which can be stale

# Find where a specific filesystem type is mounted
grep " ext4 " /proc/mounts
```

### /proc/net/

The `/proc/net/` directory contains networking statistics.

```bash
# Network interface statistics
cat /proc/net/dev

# TCP connections
cat /proc/net/tcp
# Fields are in hex: local_address, rem_address, state, tx_queue:rx_queue, ...

# UDP sockets
cat /proc/net/udp

# ARP table
cat /proc/net/arp

# Routing table
cat /proc/net/route

# Network statistics counters
cat /proc/net/snmp
```

Decoding the TCP state field from `/proc/net/tcp`:
- 01 = ESTABLISHED
- 02 = SYN_SENT
- 06 = TIME_WAIT
- 0A = LISTEN

### /proc/diskstats

```bash
cat /proc/diskstats
# Per-device I/O statistics used by iostat and other tools

# Fields (for each device):
# reads completed, reads merged, sectors read, time reading (ms),
# writes completed, writes merged, sectors written, time writing (ms),
# I/Os in progress, time doing I/Os (ms), weighted time doing I/Os (ms)
```

### /proc/interrupts

```bash
cat /proc/interrupts
# Shows interrupt counts per CPU per IRQ
# Useful for diagnosing interrupt affinity issues

# Watch interrupts in real time
watch -n1 cat /proc/interrupts
```

## Per-Process Directories

Each numbered directory corresponds to a running process. The directory name is the PID.

```bash
# Find PID of a process
pgrep nginx

# Or
pidof nginx
```

### /proc/PID/status

```bash
# Human-readable process status
cat /proc/1234/status

# Key fields:
# Name     - Process name
# State    - R(running), S(sleeping), D(disk sleep), Z(zombie), T(stopped)
# Pid      - Process ID
# PPid     - Parent process ID
# Threads  - Number of threads
# VmRSS    - Resident Set Size (physical memory used)
# VmSize   - Virtual memory size
# VmSwap   - Amount of swap used
```

### /proc/PID/cmdline

```bash
# Full command line of process (arguments separated by null bytes)
cat /proc/1234/cmdline | tr '\0' ' '
echo
```

### /proc/PID/fd/

```bash
# List open file descriptors
ls -la /proc/1234/fd

# Count open files
ls /proc/1234/fd | wc -l

# See what files are open
for fd in /proc/1234/fd/*; do readlink -f "$fd" 2>/dev/null; done
```

### /proc/PID/maps

```bash
# Memory map of the process
cat /proc/1234/maps

# Each line: address-range perms offset dev inode pathname
# Shows: code, data, heap, stack, shared libraries
```

### /proc/PID/io

```bash
# I/O statistics for the process
cat /proc/1234/io

# rchar: bytes read (including cache hits)
# wchar: bytes written
# read_bytes: actual disk reads
# write_bytes: actual disk writes
```

### /proc/PID/net/

```bash
# Network sockets for this process's namespace
cat /proc/1234/net/tcp
```

## Kernel Tunable Parameters via /proc/sys/

The `/proc/sys/` subtree is writable - you can tune kernel behavior by writing to these files.

```bash
# View a parameter
cat /proc/sys/vm/swappiness

# Change it temporarily (resets on reboot)
echo 10 | sudo tee /proc/sys/vm/swappiness

# Equivalent using sysctl
sysctl vm.swappiness
sudo sysctl -w vm.swappiness=10

# Make permanent (survives reboot)
echo "vm.swappiness = 10" | sudo tee -a /etc/sysctl.d/99-custom.conf
sudo sysctl -p /etc/sysctl.d/99-custom.conf
```

Common tunable parameters:

```bash
# Network
cat /proc/sys/net/core/somaxconn          # Max socket listen backlog
cat /proc/sys/net/ipv4/ip_local_port_range  # Ephemeral port range
cat /proc/sys/net/ipv4/tcp_fin_timeout    # TIME_WAIT timeout

# Virtual memory
cat /proc/sys/vm/swappiness              # 0-100, lower = less swap
cat /proc/sys/vm/dirty_ratio             # % RAM dirty pages before writeback
cat /proc/sys/vm/overcommit_memory       # 0=heuristic, 1=always, 2=never

# Kernel
cat /proc/sys/kernel/pid_max             # Maximum PID value
cat /proc/sys/kernel/threads-max        # Maximum threads
cat /proc/sys/kernel/dmesg_restrict     # Restrict dmesg to root only
```

## Practical Monitoring Scripts

```bash
#!/bin/bash
# Simple memory report from /proc/meminfo

total=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
available=$(awk '/MemAvailable/ {print $2}' /proc/meminfo)
used=$((total - available))
pct=$((used * 100 / total))

echo "Memory: ${used}KB used / ${total}KB total (${pct}%)"
echo "Load: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"
echo "Uptime: $(awk '{days=int($1/86400); printf "%d days\n", days}' /proc/uptime)"
```

```bash
#!/bin/bash
# Find top memory consumers using /proc

for pid in /proc/[0-9]*/status; do
    name=$(grep "^Name:" "$pid" 2>/dev/null | awk '{print $2}')
    rss=$(grep "^VmRSS:" "$pid" 2>/dev/null | awk '{print $2}')
    if [ -n "$rss" ]; then
        echo "$rss $name"
    fi
done | sort -rn | head -10
```

The `/proc` filesystem is one of the most powerful diagnostic tools available on Linux. Because every tool that reports system information - `top`, `ps`, `free`, `netstat`, `iostat` - reads from `/proc` under the hood, reading it directly gives you access to the same data with no additional overhead and no dependency on external utilities.
