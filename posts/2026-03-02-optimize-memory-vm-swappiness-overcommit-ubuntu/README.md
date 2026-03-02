# How to Optimize Memory (vm.swappiness, overcommit) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance, Memory, Kernel, Sysadmin

Description: Learn how to tune Linux kernel memory parameters like vm.swappiness and overcommit settings on Ubuntu to improve system performance and stability.

---

Memory management is one of those areas where a few kernel parameter tweaks can have a dramatic impact on system behavior. Ubuntu ships with reasonably conservative defaults, but production servers often benefit from targeted adjustments based on workload type. This post covers the most impactful memory tuning parameters: `vm.swappiness`, `vm.overcommit_memory`, and related settings.

## Understanding vm.swappiness

The `vm.swappiness` kernel parameter controls how aggressively the kernel moves anonymous memory pages (process memory) to swap space. The value ranges from 0 to 200.

- **0**: The kernel avoids swapping as long as possible, only swapping under extreme memory pressure
- **10-20**: Suitable for most servers with plenty of RAM
- **60**: The default on Ubuntu, balanced between RAM and swap usage
- **100+**: The kernel swaps aggressively, even when RAM is available

Check the current value:

```bash
# Read the current swappiness value
cat /proc/sys/vm/swappiness

# Or via sysctl
sysctl vm.swappiness
```

### When to Lower swappiness

On database servers (PostgreSQL, MySQL, Redis), having swap kick in causes significant latency spikes. Swap I/O is orders of magnitude slower than RAM access, and a database that starts swapping is effectively broken from a performance standpoint.

For these workloads, set swappiness to 10 or even 1:

```bash
# Apply immediately (does not persist across reboots)
sudo sysctl -w vm.swappiness=10

# Verify it took effect
sysctl vm.swappiness
```

To make it permanent:

```bash
# Add to /etc/sysctl.d/ for persistence across reboots
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-memory-tuning.conf

# Apply all sysctl settings from config files
sudo sysctl --system
```

### When to Keep swappiness Higher

Desktop systems and CI build agents often benefit from the default or slightly lower settings. If you have multiple processes that briefly spike memory usage, allowing some swap prevents OOM kills while the spikes are short-lived.

## vm.overcommit_memory

This parameter controls how the kernel handles memory allocation requests that exceed physically available RAM plus swap.

### Overcommit Modes

```bash
# Check current mode
cat /proc/sys/vm/overcommit_memory
```

**Mode 0 (default - heuristic)**: The kernel uses a heuristic to decide whether to allow allocations. This works well for most workloads but can deny large allocations that would actually succeed.

**Mode 1 (always overcommit)**: The kernel always allows memory allocations, regardless of available memory. Useful for workloads that `fork()` heavily (like Redis) where the child process almost never uses all its inherited memory.

**Mode 2 (never overcommit)**: The kernel only allows allocations up to `swap + (overcommit_ratio% of RAM)`. This is the most conservative setting, good for systems where OOM kills would be catastrophic.

### Configuring for Redis

Redis documentation specifically recommends setting overcommit to 1 to avoid issues with background saves (`BGSAVE`) failing due to insufficient memory:

```bash
# Set for Redis workloads
echo 'vm.overcommit_memory=1' | sudo tee -a /etc/sysctl.d/99-memory-tuning.conf

sudo sysctl --system
```

### Configuring for Strict Memory Accounting (Mode 2)

If you need strict limits:

```bash
# Set mode 2 - strict overcommit denial
echo 'vm.overcommit_memory=2' | sudo tee -a /etc/sysctl.d/99-memory-tuning.conf

# Ratio of RAM that can be allocated (default 50)
# With overcommit_memory=2, max allocation = swap + (ratio% * RAM)
echo 'vm.overcommit_ratio=80' | sudo tee -a /etc/sysctl.d/99-memory-tuning.conf

sudo sysctl --system
```

## vm.dirty_ratio and vm.dirty_background_ratio

These parameters control how much dirty (unwritten) page cache the kernel accumulates before forcing writes to disk.

```bash
# Check current values
sysctl vm.dirty_ratio vm.dirty_background_ratio vm.dirty_writeback_centisecs
```

- `vm.dirty_background_ratio`: Percentage of RAM at which background writeback starts (default: 10)
- `vm.dirty_ratio`: Percentage at which processes are blocked waiting for writeback (default: 20)
- `vm.dirty_writeback_centisecs`: How often (in centiseconds) the kernel writes dirty data (default: 500 = 5 seconds)

### Tuning for Write-Heavy Workloads

For servers with fast NVMe storage, you can lower these values to reduce the chance of large write bursts:

```bash
cat << 'EOF' | sudo tee -a /etc/sysctl.d/99-memory-tuning.conf
# Start background writeback at 5% dirty pages instead of 10%
vm.dirty_background_ratio=5

# Block processes at 10% dirty pages instead of 20%
vm.dirty_ratio=10

# Write dirty data every 2 seconds instead of 5
vm.dirty_writeback_centisecs=200
EOF

sudo sysctl --system
```

For write-buffered batch workloads where you want to maximize throughput by letting the OS accumulate more dirty data:

```bash
# More aggressive buffering - appropriate for ETL or batch write jobs
cat << 'EOF' | sudo tee -a /etc/sysctl.d/99-memory-tuning.conf
vm.dirty_background_ratio=15
vm.dirty_ratio=30
EOF
```

## Monitoring Memory Pressure

Before changing anything in production, gather baseline data:

```bash
# Overall memory picture
free -h

# Detailed memory stats from /proc
cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable|Cached|Swap'

# vmstat output - shows swap activity over time (1 second intervals, 10 samples)
vmstat 1 10

# Columns of interest: si (swap in), so (swap out), free, buff, cache
```

Watch for swap I/O in real time:

```bash
# Monitor swap usage changes
watch -n 1 'cat /proc/meminfo | grep -E "SwapTotal|SwapFree|SwapCached"'

# sar for historical memory data (requires sysstat package)
sudo apt install sysstat -y
sar -r 1 5
```

## Complete Example: Database Server Configuration

Here is a complete `/etc/sysctl.d/99-memory-tuning.conf` for a dedicated database server:

```ini
# Reduce swap aggressiveness - databases should stay in RAM
vm.swappiness=10

# Allow memory overcommit for fork-heavy operations (PostgreSQL, Redis)
vm.overcommit_memory=1

# Start background writeback sooner to avoid large bursts
vm.dirty_background_ratio=5
vm.dirty_ratio=10

# Write dirty data more frequently
vm.dirty_writeback_centisecs=200

# Increase the amount of memory used for inode and dentry cache
vm.vfs_cache_pressure=50
```

Apply all settings:

```bash
# Apply without rebooting
sudo sysctl --system

# Verify all settings applied correctly
sysctl vm.swappiness vm.overcommit_memory vm.dirty_ratio vm.dirty_background_ratio vm.vfs_cache_pressure
```

## Verifying the Impact

After applying changes, monitor memory behavior under load:

```bash
# Check if swapping is occurring
vmstat 2 30 | awk 'NR>2 {print $7, $8}' | head -20
# si=swap in, so=swap out - both should be 0 on a healthy system

# Check for OOM kills in the kernel log
dmesg | grep -i "out of memory"
sudo journalctl -k | grep -i "oom"

# Profile memory allocation patterns with smem
sudo apt install smem -y
sudo smem -t -p | tail -20
```

Memory tuning is iterative. Apply conservative changes first, monitor for a few days, then adjust further based on observed behavior. The default Ubuntu settings work fine for most cases - only tune when you have specific problems or workloads that justify it.

For applications running on Ubuntu, tracking memory-related issues in production is important. OneUptime can help monitor system health and alert when memory pressure affects availability: https://oneuptime.com/blog/post/ecryptfs-home-directory-encryption-ubuntu/view
