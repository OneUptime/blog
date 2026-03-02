# How to Understand Memory Management (Virtual Memory) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Kernel, Performance, System Administration

Description: A thorough explanation of Linux virtual memory management on Ubuntu, covering page tables, the page cache, swap, OOM killer, and memory tuning parameters.

---

Linux memory management is one of the most misunderstood aspects of the kernel. Administrators see high "used" memory and worry, not realizing the kernel is aggressively using spare RAM for cache. Or they see processes consuming more virtual memory than physical RAM exists, which seems impossible until you understand virtual addressing.

This post covers how Linux virtual memory works on Ubuntu, what the various memory metrics mean, and how to tune the key parameters.

## Virtual vs Physical Memory

Every process on Linux runs in its own virtual address space. A 64-bit process sees a 128 TB address space regardless of how much physical RAM the machine has. The kernel's Memory Management Unit (MMU) translates virtual addresses to physical addresses using page tables.

Key implications:
- Multiple processes can use the same virtual address simultaneously (each maps to different physical memory)
- Physical memory can be shared between processes (shared libraries, copy-on-write fork)
- A process's virtual address space can exceed physical RAM (pages are swapped out to disk)
- Forking is cheap because pages are copy-on-write (shared until one writes)

```bash
# See process virtual vs resident memory
ps aux --sort=-rss | head -10

# VIRT = Virtual memory size (total address space claimed)
# RES  = Resident Set Size (physical pages currently in RAM)
# SHR  = Shared pages (shared libraries, etc.)

# Per-process memory breakdown
cat /proc/1234/status | grep -E "Vm|RSS"
```

## Pages and Page Tables

Physical memory is divided into fixed-size pages (typically 4KB). When a process accesses a virtual address, the CPU checks the page table entry:
- If mapped and present: access proceeds
- If not present (page fault): kernel intervenes to load the page from disk or allocate a new page
- If not mapped at all: segfault

```bash
# Check page size
getconf PAGE_SIZE   # typically 4096

# Process page fault statistics
cat /proc/1234/stat | awk '{print "Minor faults:", $10, "Major faults:", $12}'
# Minor fault = page was available but not mapped (no disk I/O)
# Major fault = page had to be read from disk (slow)

# Watch page faults in real time
sar -B 1          # requires sysstat package
# pgfault/s = minor + major page faults per second
# majflt/s  = major (disk) page faults per second
```

## The Page Cache

The kernel uses all free RAM as a page cache for file data. When you read a file, the kernel caches its pages in RAM. Subsequent reads hit the cache instead of disk.

This is why `free` shows high "used" memory on an active system - the kernel is making good use of available RAM.

```bash
# Memory overview
free -h

# Output breakdown:
# total    = physical RAM
# used     = in use (including cache/buffers)
# free     = completely unused
# shared   = tmpfs usage
# buff/cache = kernel buffer + page cache
# available = memory available for new processes (free + reclaimable cache)

# The "available" column is what matters for "is there enough memory?"

# Detailed cache breakdown
cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|Buffers|^Cached|SwapCached|Active|Inactive|Dirty|Writeback|Slab"
```

### Dropping the Page Cache

```bash
# Sync filesystems to flush dirty pages
sync

# Drop page cache (safe, kernel will repopulate as needed)
echo 1 | sudo tee /proc/sys/vm/drop_caches

# Drop dentries and inodes cache
echo 2 | sudo tee /proc/sys/vm/drop_caches

# Drop all of the above
echo 3 | sudo tee /proc/sys/vm/drop_caches
```

Dropping caches is rarely necessary in production. The kernel manages the cache well on its own.

## Anonymous Memory vs File-Backed Memory

Memory pages are either:

**File-backed** - Backed by a file on disk. The kernel can drop these pages and reload from disk (clean pages) or write them to disk then drop (dirty pages). This is your page cache.

**Anonymous** - Not backed by any file. Heap, stack, and mmap allocations without a file. These must go to swap if evicted.

```bash
# See active/inactive breakdown
cat /proc/meminfo | grep -E "Active:|Inactive:"

# Active = recently used pages
# Inactive = not recently used (candidates for eviction)
# (file) = file-backed
# (anon) = anonymous
```

## Swap

Swap is disk space used when physical memory is full. The kernel moves anonymous pages to swap to free physical memory.

```bash
# Check swap status
swapon --show
cat /proc/meminfo | grep Swap

# Add a swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Check swap usage per process
for pid in /proc/[0-9]*/status; do
    name=$(awk '/^Name:/ {print $2}' "$pid")
    swap=$(awk '/^VmSwap:/ {print $2}' "$pid")
    [ "${swap:-0}" -gt 0 ] && echo "$swap $name"
done 2>/dev/null | sort -rn | head -10
```

### Swappiness

The `vm.swappiness` parameter (0-100) controls how aggressively the kernel uses swap vs reclaiming page cache:

```bash
# Check current value (default: 60)
cat /proc/sys/vm/swappiness

# Lower value = prefer keeping anonymous memory, reclaim page cache first
# Higher value = more aggressive swapping of anonymous memory
# 0 = avoid swapping as long as possible (don't completely disable swap)
# 10 = good for desktop/latency-sensitive workloads
# 60 = default, good for general servers
# 100 = swap aggressively

sudo sysctl -w vm.swappiness=10

# Permanent
echo "vm.swappiness = 10" | sudo tee /etc/sysctl.d/99-memory.conf
sudo sysctl -p /etc/sysctl.d/99-memory.conf
```

## Transparent Huge Pages

Instead of 4KB pages, the kernel can use 2MB "huge pages" to reduce TLB pressure for large allocations:

```bash
# Check THP status
cat /sys/kernel/mm/transparent_hugepage/enabled
# [always] madvise never

# "always" - kernel uses huge pages opportunistically
# "madvise" - only when process requests it via madvise()
# "never"   - disabled

# For databases (PostgreSQL, MongoDB, Redis), often set to madvise or never
echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled

# Check THP usage
cat /proc/meminfo | grep -i huge

# AnonHugePages = anonymous huge pages in use
# HugePages_Total/Free/Rsvd/Surp = explicit huge pages from hugetlbfs
```

### Explicit Huge Pages

```bash
# Reserve huge pages at boot (they're allocated immediately, not on demand)
echo 64 | sudo tee /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages

# Make permanent via sysctl
echo "vm.nr_hugepages = 64" | sudo tee -a /etc/sysctl.d/99-memory.conf

# Mount hugetlbfs for applications that need it
sudo mkdir /mnt/hugepages
sudo mount -t hugetlbfs none /mnt/hugepages
```

## The OOM Killer

When the system runs out of memory and swap, the kernel's Out-Of-Memory killer selects a process to kill. It uses a scoring algorithm based on process size, age, priority, and the `oom_score_adj` value.

```bash
# Check OOM score for a process (higher = more likely to be killed)
cat /proc/1234/oom_score

# Adjust OOM preference (-1000 = never kill, 1000 = kill first)
cat /proc/1234/oom_score_adj

# Protect a critical process from OOM killer
echo -1000 | sudo tee /proc/$(pgrep postgresql | head -1)/oom_score_adj

# Make a less important process more likely to be killed
echo 500 | sudo tee /proc/$(pgrep batchjob | head -1)/oom_score_adj

# View OOM events from past
sudo dmesg | grep -i "oom\|kill"
sudo journalctl -k | grep -i oom
```

### OOM Killer via systemd

```bash
# Set OOM adjustment in service file
sudo systemctl edit postgresql.service
```

```ini
[Service]
# Protect from OOM killer
OOMScoreAdjust=-900
```

## Memory Overcommit

Linux overcommits memory by default - it allows processes to allocate more memory than physically exists, betting that not all of it will be used simultaneously.

```bash
# Check overcommit policy
cat /proc/sys/vm/overcommit_memory
# 0 = heuristic (default): allow overcommit up to a point
# 1 = always allow (never fail malloc)
# 2 = strict: never allow committing more than physical+swap

# With mode 2, set the allowed ratio
cat /proc/sys/vm/overcommit_ratio  # default: 50 (50% of RAM + swap)

# For databases, strict overcommit prevents OOM situations
echo 2 | sudo tee /proc/sys/vm/overcommit_memory
echo 80 | sudo tee /proc/sys/vm/overcommit_ratio

# Check committed memory vs limit
cat /proc/meminfo | grep -E "CommitLimit|Committed_AS"
```

## Monitoring Memory Pressure

```bash
# Install vmstat (sysstat package)
sudo apt install sysstat

# Real-time memory stats (update every 2 seconds)
vmstat 2

# Key columns:
# swpd   = swap used
# free   = free memory
# buff   = buffer cache
# cache  = page cache
# si     = pages swapped in per second
# so     = pages swapped out per second (bad if consistently non-zero)
# bi     = blocks in from disk
# bo     = blocks out to disk

# PSI - Pressure Stall Information
cat /proc/pressure/memory
# some avg10=X.XX avg60=X.XX avg300=X.XX total=NNNN
# full avg10=X.XX avg60=X.XX avg300=X.XX total=NNNN

# "some" = at least one task was stalled waiting for memory
# "full" = all tasks were stalled
# avg10/60/300 = exponential moving average over 10s/60s/5min
```

## Key Memory Tuning Parameters

```bash
# Writeback throttling - dirty pages ratio before writeback
cat /proc/sys/vm/dirty_ratio          # default 20 (% of RAM)
cat /proc/sys/vm/dirty_background_ratio  # default 10 (background writeback starts)

# For databases with their own I/O management
echo 5 | sudo tee /proc/sys/vm/dirty_ratio
echo 2 | sudo tee /proc/sys/vm/dirty_background_ratio

# Minimum free memory (kernel tries to keep this available)
cat /proc/sys/vm/min_free_kbytes

# Zone reclaim mode (0=default, 1=reclaim before going to other zones)
cat /proc/sys/vm/zone_reclaim_mode
```

Understanding virtual memory management removes the guesswork from reading memory statistics. High memory usage is often normal and desirable (it means the page cache is warm). What actually matters is whether the "available" memory is trending toward zero, whether swap activity is continuous, and whether the OOM killer is activating - those are the real warning signs on a Linux system.
