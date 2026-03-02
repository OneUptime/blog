# How to Understand and Configure Swappiness on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance, Kernel, Memory, Linux

Description: Learn what swappiness controls in the Linux kernel, how to tune it for your workload on Ubuntu, and when to use different values for servers versus desktops.

---

Swappiness is one of the most commonly discussed Linux tuning parameters and one of the most commonly misunderstood. It does not directly control when the kernel starts swapping. It's a weighting factor that influences how aggressively the kernel reclaims anonymous memory (heap, stack, process memory) versus page cache (recently read files). Getting this right for your workload can meaningfully improve performance.

## What Swappiness Actually Controls

The kernel manages two types of reclaimable memory:

**Anonymous pages** - process memory not backed by a file (malloc'd memory, stack frames, heap data)
**File-backed pages** - the page cache, which holds recently read or written file data

When memory is needed, the kernel can free either type. File-backed pages are "cheap" to evict because they can be re-read from disk if needed. Anonymous pages must be written to swap before they can be freed.

The `swappiness` value (0-200 in modern kernels, 0-100 historically) adjusts the ratio of how much the kernel prefers to reclaim anonymous pages versus page cache pages. A lower value means the kernel will work harder to keep anonymous pages in RAM and will instead free page cache. A higher value means the kernel will use swap more readily.

The default value of 60 works reasonably well for general-purpose systems, but it's rarely optimal.

## Checking Current Swappiness

```bash
# Check the current swappiness value
cat /proc/sys/vm/swappiness

# Or with sysctl
sysctl vm.swappiness

# Check if you have swap configured at all
swapon --show
free -h | grep Swap

# Check current swap usage
cat /proc/swaps
```

## Recommended Values for Different Scenarios

### Desktop Systems

On a desktop with 8-16GB of RAM, the page cache is valuable - it makes applications launch faster when you switch between them. But you also want to keep interactive applications responsive, which means not swapping them out:

```bash
# Good value for most desktops
sudo sysctl -w vm.swappiness=10

# For systems with plenty of RAM (16GB+) where swap should be a last resort
sudo sysctl -w vm.swappiness=5
```

### Database Servers

Databases manage their own cache (PostgreSQL's shared_buffers, MySQL's InnoDB buffer pool). Having the kernel's page cache compete with the database cache is counterproductive. More importantly, swapping database process memory causes severe performance degradation:

```bash
# PostgreSQL and MySQL recommendation
sudo sysctl -w vm.swappiness=10

# Some DBAs use 1 (never 0 - see below for why)
sudo sysctl -w vm.swappiness=1
```

### Application Servers

For web application servers (Node.js, Python, Java), you generally want to avoid swapping because it causes latency spikes. The page cache helps with static file serving:

```bash
# Good balance for application servers
sudo sysctl -w vm.swappiness=20
```

### High-Performance Computing

For HPC workloads where you're processing large datasets and need maximum memory bandwidth:

```bash
# Prefer keeping process memory in RAM
sudo sysctl -w vm.swappiness=10
```

## The Swappiness=0 Debate

Setting swappiness to 0 doesn't disable swap entirely. In older kernels, it meant "avoid swap unless absolutely necessary." In kernels 3.5+, swappiness=0 means the kernel will not swap anonymous pages at all unless the system is about to go out of memory.

```bash
# This is NOT the same as disabling swap
sudo sysctl -w vm.swappiness=0

# Truly disable swap (requires root, dangerous on low-memory systems)
sudo swapoff -a

# To completely prevent swap usage, also remove swap from fstab
# and add vm.swappiness=0 to sysctl.conf
```

For most production servers, `swappiness=1` is a safer choice than `swappiness=0`. With `swappiness=1`, the kernel will use swap slightly, which is useful because some system components (like the OOM killer decision-making) work better when swap has been used rather than being completely empty.

## Making Swappiness Persistent

Changes via `sysctl -w` are temporary and reset on reboot. To make them permanent:

```bash
# Add to /etc/sysctl.conf
echo "vm.swappiness = 10" | sudo tee -a /etc/sysctl.conf

# Or better, use a drop-in file
sudo tee /etc/sysctl.d/99-swappiness.conf << 'EOF'
# Kernel memory management tuning
# Lower value: prefer keeping process memory in RAM, use page cache less aggressively
# Higher value: swap more readily, keep more page cache
vm.swappiness = 10
EOF

# Apply immediately without rebooting
sudo sysctl -p /etc/sysctl.d/99-swappiness.conf

# Verify
sysctl vm.swappiness
```

## Related Memory Parameters

Swappiness doesn't exist in isolation. These related parameters work together:

```bash
# /etc/sysctl.d/99-memory.conf

# How much of dirty (modified) page cache can accumulate before writeback
# Default: 20% of RAM can be dirty before background writeback starts
vm.dirty_ratio = 15

# Background writeback threshold - writeback starts when this % is dirty
# Default: 10%
vm.dirty_background_ratio = 5

# How often the kernel checks for dirty pages (in hundredths of a second)
# 500 = 5 seconds
vm.dirty_writeback_centisecs = 500

# How long a dirty page can stay before being written back (in hundredths of seconds)
# 3000 = 30 seconds
vm.dirty_expire_centisecs = 3000

# vfs_cache_pressure: how aggressively to reclaim directory/inode cache
# Default: 100
# Lower = keep more inode/dentry cache (good for workloads with many files)
vm.vfs_cache_pressure = 50
```

## Monitoring Memory Pressure

Watch what the kernel is doing with memory during your workload:

```bash
# Real-time memory statistics
vmstat 1

# vmstat output columns:
# si = swap in (KB/s coming FROM swap to RAM - bad if high)
# so = swap out (KB/s going TO swap from RAM - bad if high)
# Watch these during your workload

# More detailed memory stats
cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|Cached|SwapCached|SwapTotal|SwapFree|Active|Inactive"

# Monitor swap usage over time
watch -n 5 "free -h && echo '---' && vmstat 1 3 | tail -1"

# See per-process swap usage
for file in /proc/*/status; do
  awk '/VmSwap/{print FILENAME, $2, $3}' "$file" 2>/dev/null
done | sort -k2 -rn | head -20 | sed 's|/proc/||;s|/status||'

# Which process is using the most swap right now
sudo smem -s swap -r | head -15  # Requires smem package
```

## Testing Your Configuration

After changing swappiness, test under realistic load:

```bash
# Install stress-ng for controlled memory pressure testing
sudo apt install -y stress-ng

# Stress test with memory allocation
stress-ng --vm 4 --vm-bytes 80% --timeout 60

# Watch memory and swap usage during the test
vmstat 1

# Run a workload-specific benchmark before and after tuning
# For example, for a web server, measure response times under load
# and watch if swap activity correlates with latency spikes
```

## Tuning Swappiness for zswap or zram

If you're using compressed swap (zswap or zram), you may want a slightly higher swappiness since compressed swap is much faster than disk-based swap:

```bash
# Check if zswap is enabled
cat /sys/module/zswap/parameters/enabled

# Check if zram is configured
ls /dev/zram* 2>/dev/null
swapon --show | grep zram

# With zram (fast compressed RAM-based swap)
# A slightly higher swappiness is acceptable since the "swap" is still in RAM
sudo sysctl -w vm.swappiness=30
```

The right swappiness value depends on your specific workload and memory pressure patterns. Start with 10 for servers, test under real load, and watch `vmstat` to see if swap activity correlates with performance problems.
