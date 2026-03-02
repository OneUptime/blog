# How to Configure Transparent Huge Pages on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Memory Management, Performance Tuning, Linux, Kernel

Description: Learn how to configure Transparent Huge Pages (THP) on Ubuntu to improve or reduce memory performance, including when to enable or disable THP for different workloads like databases and Java applications.

---

Transparent Huge Pages (THP) is a Linux kernel feature that uses 2MB memory pages instead of the standard 4KB pages. The premise is that fewer, larger pages mean fewer TLB (Translation Lookaside Buffer) entries to manage, which reduces TLB misses and can improve performance for workloads that access large amounts of memory sequentially.

However, THP has a complicated relationship with real-world workloads. Many databases (PostgreSQL, MongoDB, Redis, Oracle) explicitly recommend disabling it. Understanding why - and when to enable or disable it - is important for tuning Ubuntu systems correctly.

## Checking Current THP Status

```bash
# Check THP setting
cat /sys/kernel/mm/transparent_hugepage/enabled
```

Output shows the available options with the current setting in brackets:

```
[always] madvise never
```

Or:

```
always madvise [never]
```

Options:
- `always` - THP is enabled system-wide (default on Ubuntu)
- `madvise` - THP is only used for memory regions that explicitly request it via `madvise()`
- `never` - THP is completely disabled

Also check the defragmentation mode:

```bash
cat /sys/kernel/mm/transparent_hugepage/defrag
```

```
always defer defer+madvise [madvise] never
```

The `defrag` setting controls whether the kernel compacts memory (khugepaged) to create huge pages:
- `always` - Aggressively defragment to create huge pages
- `defer` - Defer defrag to background thread
- `madvise` - Only defrag for regions that use `madvise(MADV_HUGEPAGE)`
- `never` - Don't defrag

## Why Databases Hate THP

The main problem with THP for databases isn't the huge pages themselves - it's the defragmentation process. When the kernel needs to create a 2MB contiguous region, it may move pages around in memory (compaction). This can cause:

1. **Latency spikes** - Compaction pauses can take milliseconds
2. **Increased memory usage** - Pages that partially fill a 2MB page waste the unused portion
3. **Fragmentation issues** - Databases like PostgreSQL manage their own memory very carefully; THP interferes

For example, PostgreSQL uses shared_buffers to manage 8KB buffer pages. THP may try to pack these into 2MB huge pages, but the access pattern is random (any of thousands of 8KB pages could be accessed next), negating the TLB benefit while adding compaction overhead.

## Disabling THP for Databases

### Permanent Disable via rc.local or systemd

The most reliable approach is a systemd service that disables THP on boot:

```bash
sudo nano /etc/systemd/system/disable-thp.service
```

```ini
[Unit]
Description=Disable Transparent Huge Pages
After=sysinit.target local-fs.target
Before=mongod.service postgresql.service redis.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c "echo never > /sys/kernel/mm/transparent_hugepage/enabled"
ExecStart=/bin/sh -c "echo never > /sys/kernel/mm/transparent_hugepage/defrag"
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable disable-thp
sudo systemctl start disable-thp
```

Verify:

```bash
cat /sys/kernel/mm/transparent_hugepage/enabled
# Should show: always madvise [never]
```

### Using GRUB (Kernel Parameter)

Alternatively, disable at boot via kernel parameters:

```bash
sudo nano /etc/default/grub
```

Add `transparent_hugepage=never` to `GRUB_CMDLINE_LINUX`:

```
GRUB_CMDLINE_LINUX="transparent_hugepage=never"
```

Update GRUB:

```bash
sudo update-grub
sudo reboot
```

## Using madvise Mode (Best of Both Worlds)

The `madvise` mode is often the best compromise: THP is disabled by default but applications that explicitly benefit from it can opt in. This avoids THP for databases while keeping it available for workloads like JVMs that can benefit.

```bash
echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo defer+madvise | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

Applications use `madvise(addr, len, MADV_HUGEPAGE)` to request huge pages for specific regions. The JVM can be configured to do this:

```bash
# Java JVM flags to use THP where appropriate
java -XX:+UseTransparentHugePages -jar myapp.jar
```

## When THP Helps: HPC and Analytics Workloads

For workloads that access large arrays sequentially - scientific computing, in-memory analytics, large matrix operations - THP can genuinely help by reducing TLB pressure:

```bash
# Enable THP for analytics workloads
echo always | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo defer | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

The `defer` defrag mode is safer than `always` because defragmentation happens in the background rather than blocking the application's memory allocation.

## Measuring THP Impact

Check how many huge pages are currently in use:

```bash
# Huge page statistics
grep -i "hugepages\|thp" /proc/meminfo
```

Key fields:

```
AnonHugePages:   1234567 kB    # Memory in anonymous THP
ShmemHugePages:    12345 kB    # Shared memory in THP
HugePages_Total:       0       # Static huge pages (different from THP)
HugePages_Free:        0
Hugepagesize:       2048 kB
```

Monitor THP defragmentation activity:

```bash
# Watch THP events
cat /proc/vmstat | grep -i "thp\|compact"
```

Key metrics:
- `thp_fault_alloc` - THP pages allocated on page fault
- `thp_collapse_alloc` - THP pages created by collapsing smaller pages
- `compact_stall` - Times a process stalled waiting for compaction

High `compact_stall` values confirm THP defragmentation is causing latency.

## Checking if THP Is Causing Problems

A quick check using `perf stat`:

```bash
# Check TLB miss rate (with and without THP)
sudo perf stat -e dTLB-loads,dTLB-load-misses,iTLB-loads,iTLB-load-misses \
  -p $(pgrep postgres | head -1) sleep 10
```

If the TLB miss rate is low already, THP isn't needed. If it's high, THP might help (but check if the issue is access pattern, not page size).

## Checking THP khugepaged Settings

The `khugepaged` daemon collapses regular pages into huge pages in the background:

```bash
# View khugepaged settings
ls /sys/kernel/mm/transparent_hugepage/khugepaged/
cat /sys/kernel/mm/transparent_hugepage/khugepaged/scan_sleep_millisecs
cat /sys/kernel/mm/transparent_hugepage/khugepaged/pages_to_scan
```

Slow down khugepaged to reduce its impact:

```bash
# Increase sleep time between scans (default: 10000ms = 10s)
echo 30000 | sudo tee /sys/kernel/mm/transparent_hugepage/khugepaged/scan_sleep_millisecs

# Reduce pages scanned per run (default: 4096)
echo 512 | sudo tee /sys/kernel/mm/transparent_hugepage/khugepaged/pages_to_scan
```

## Summary of Recommendations

| Workload | THP Setting | Defrag Setting |
|----------|------------|----------------|
| PostgreSQL, MySQL | `never` | `never` |
| MongoDB, Redis | `never` | `never` |
| Oracle DB | `never` | `never` |
| Java application (tuned) | `madvise` | `defer+madvise` |
| Scientific computing | `always` | `defer` |
| General purpose server | `madvise` | `madvise` |
| In-memory analytics | `always` | `defer` |

The `madvise` setting is the safest default for mixed-use servers - it disables THP for most processes while allowing applications to opt in.

```bash
# Quick check of current settings
echo "THP enabled mode: $(cat /sys/kernel/mm/transparent_hugepage/enabled)"
echo "THP defrag mode: $(cat /sys/kernel/mm/transparent_hugepage/defrag)"
echo "Active huge pages: $(grep AnonHugePages /proc/meminfo)"
```

Getting THP right is one of those low-level settings that separates a well-tuned server from one that has random latency spikes. For most production database servers, the first thing to do after installation is disable THP.
