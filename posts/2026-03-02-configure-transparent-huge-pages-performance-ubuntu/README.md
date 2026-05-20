# How to Configure Transparent Huge Pages for Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance, Kernel, Memory, Sysadmin

Description: Learn how to configure Transparent Huge Pages (THP) on Ubuntu to improve application performance or disable them for databases that work better without THP.

---

Transparent Huge Pages (THP) is a Linux kernel feature that automatically manages huge memory pages (2MB instead of 4KB) for applications. The idea is to reduce TLB (Translation Lookaside Buffer) misses, which improves performance for memory-intensive workloads. However, THP has a complicated reputation - it helps some workloads significantly while causing serious latency issues for others.

## What Are Huge Pages?

Standard Linux pages are 4KB. For processes using gigabytes of memory, the kernel's page table becomes enormous, and the TLB (hardware cache for page table entries) gets overwhelmed. Huge pages - 2MB each - reduce the number of page table entries by 512x, dramatically reducing TLB pressure.

There are two approaches:
- **Explicit huge pages**: Applications specifically request huge pages via `mmap()` with `MAP_HUGETLB` or `shmget()` with `SHM_HUGETLB`. Requires application changes.
- **Transparent Huge Pages (THP)**: The kernel automatically promotes regular pages to huge pages behind the scenes. No application changes needed.

## Checking Current THP Status

```bash
# Check the current THP setting

cat /sys/kernel/mm/transparent_hugepage/enabled

# Output shows the current mode in brackets: [always] madvise never
# or: always [madvise] never
# or: always madvise [never]

# Check if defragmentation is enabled
cat /sys/kernel/mm/transparent_hugepage/defrag

# Check khugepaged daemon settings (the background process that promotes pages)
cat /sys/kernel/mm/transparent_hugepage/khugepaged/scan_sleep_millisecs
cat /sys/kernel/mm/transparent_hugepage/khugepaged/alloc_sleep_millisecs
```

The top-level anonymous THP control has three modes:
- **always**: THP is enabled for all eligible memory regions
- **madvise**: THP only applies to regions where the application explicitly calls `madvise(MADV_HUGEPAGE)`
- **never**: THP is disabled for normal fault-time allocation and background collapse (on newer kernels, `madvise(MADV_COLLAPSE)` can still request collapse)

## When THP Helps

THP benefits workloads that:
- Access large, sequential memory regions
- Have high TLB miss rates (measurable via `perf stat -e dTLB-load-misses`)
- Are memory bandwidth-intensive (scientific computing, big data processing)
- Use Java JVM with large heap sizes

### Enabling THP for All Workloads

```bash
# Enable THP immediately (does not persist across reboots)
echo always | sudo tee /sys/kernel/mm/transparent_hugepage/enabled

# Enable defragmentation to maximize huge page usage
echo always | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

## When THP Hurts

THP causes problems for:
- **Redis**: THP causes copy-on-write overhead during background saves (BGSAVE), leading to high latency spikes. Redis explicitly warns about this.
- **MongoDB 7.0 and earlier**: Database workloads often perform poorly with THP enabled; MongoDB documentation recommends disabling THP for these versions. MongoDB 8.0 and later uses an upgraded TCMalloc and has different THP guidance.
- **MySQL/MariaDB**: THP fragmentation can cause unpredictable latency.
- **Any real-time or low-latency application**: The khugepaged daemon and defragmentation process can cause latency spikes.

### Disabling THP Permanently

The safest way to disable THP persistently is via a systemd service:

```bash
# Create the systemd service unit file
sudo tee /etc/systemd/system/disable-thp.service << 'EOF'
[Unit]
Description=Disable Transparent Huge Pages
DefaultDependencies=no
After=sysinit.target local-fs.target
Before=basic.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/enabled'
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/defrag'
RemainAfterExit=yes

[Install]
WantedBy=basic.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable --now disable-thp.service

# Verify THP is disabled
cat /sys/kernel/mm/transparent_hugepage/enabled
# Should show: always madvise [never]
```

### Alternative: Kernel Command Line

You can also disable THP via the kernel boot parameter:

```bash
# Edit the GRUB configuration
sudo nano /etc/default/grub

# Find the GRUB_CMDLINE_LINUX_DEFAULT line and add transparent_hugepage=never
# GRUB_CMDLINE_LINUX_DEFAULT="quiet splash transparent_hugepage=never"

# Update GRUB
sudo update-grub

# Reboot to apply
sudo reboot
```

## Using madvise Mode (Best of Both Worlds)

The `madvise` mode is a good middle ground - THP is available for applications that know they want it, but it doesn't affect applications that haven't opted in:

```bash
# Set madvise mode
echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled

# With madvise, applications call:
# madvise(addr, size, MADV_HUGEPAGE)  - to request THP
# madvise(addr, size, MADV_NOHUGEPAGE) - to opt out
```

This is increasingly the recommended approach for mixed-use hosts: applications that know they benefit from THP can opt in. For example, JVMs can request THP with `-XX:+UseTransparentHugePages`, but that option is disabled by default in Oracle JDK documentation and should be benchmarked for your workload. PostgreSQL documentation currently discourages transparent huge pages and recommends explicit huge pages instead.

## Tuning khugepaged

The `khugepaged` daemon is the kernel thread that scans memory and promotes eligible regions to huge pages. Its aggressiveness can be tuned:

```bash
# How often khugepaged scans (milliseconds between scans)
# Lower = more aggressive but uses more CPU
cat /sys/kernel/mm/transparent_hugepage/khugepaged/scan_sleep_millisecs
echo 1000 | sudo tee /sys/kernel/mm/transparent_hugepage/khugepaged/scan_sleep_millisecs

# How many pages to scan per run
# Higher = promotes huge pages faster but uses more CPU
cat /sys/kernel/mm/transparent_hugepage/khugepaged/pages_to_scan
echo 4096 | sudo tee /sys/kernel/mm/transparent_hugepage/khugepaged/pages_to_scan

# Maximum time to sleep between allocations (milliseconds)
cat /sys/kernel/mm/transparent_hugepage/khugepaged/alloc_sleep_millisecs
```

## Measuring THP Impact

Before and after changing THP settings, measure the actual impact:

```bash
# Install perf tools
sudo apt install linux-tools-common linux-tools-generic -y

# Measure TLB misses for a workload
perf stat -e dTLB-load-misses,dTLB-store-misses,iTLB-load-misses \
    -- your-application --your-args

# Check how many huge pages are currently in use
grep -E "^(AnonHugePages|ShmemHugePages|FileHugePages)" /proc/meminfo

# Monitor huge page usage over time
watch -n 2 'grep AnonHugePages /proc/meminfo'
```

Check per-process THP usage:

```bash
# Get THP usage for a specific process (replace PID)
PID=$(pgrep redis-server)
grep AnonHugePages /proc/$PID/smaps | awk '{sum += $2} END {print sum/1024 " MB using THP"}'

# Or use smaps_rollup for a summary
cat /proc/$PID/smaps_rollup | grep -E "AnonHugePages|Private"
```

## Making Settings Persistent via a Startup Script

For THP and khugepaged tuning parameters, use a boot-time script or systemd unit rather than sysctl:

```bash
# Note: not all THP settings are sysctl-accessible
# The /sys/kernel/mm/transparent_hugepage/ path is not sysctl-managed
# Use the systemd service approach or rc.local for persistence

# Create a startup script
sudo tee /etc/rc.local << 'EOF'
#!/bin/bash
# THP configuration
echo madvise > /sys/kernel/mm/transparent_hugepage/enabled
echo defer+madvise > /sys/kernel/mm/transparent_hugepage/defrag
echo 1000 > /sys/kernel/mm/transparent_hugepage/khugepaged/scan_sleep_millisecs
exit 0
EOF

sudo chmod +x /etc/rc.local
```

## Summary: Recommendations by Workload

| Workload | THP Setting | Reason |
|----------|-------------|--------|
| Redis | never | Avoids copy-on-write latency during BGSAVE |
| MongoDB 7.0 and earlier | never | Reduces fragmentation-related latency |
| MongoDB 8.0 and later | always with defer+madvise defrag, or vendor guidance | Upgraded TCMalloc is designed to work better with THP |
| MySQL/MariaDB | never or benchmark carefully | MySQL supports explicit HugeTLB large pages; avoid blanket THP for latency-sensitive database workloads |
| PostgreSQL | never | PostgreSQL documentation discourages THP; use explicit `huge_pages` instead |
| Java (large heap) | madvise with JVM THP options, or benchmark always | Reduces TLB pressure for some heaps, but JVM THP support is opt-in and workload-dependent |
| Scientific computing | always | Large sequential memory access patterns |
| General-purpose server | madvise | Safe default, apps opt in as needed |

The key takeaway: measure before and after any change. What works for one workload can harm another running on the same machine.
