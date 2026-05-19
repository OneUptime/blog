# How to Configure zswap for Compressed Swap on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Zswap, Memory, Performance, Kernel

Description: Enable and configure zswap on Ubuntu to compress swap pages in RAM before writing to disk, reducing I/O and improving system responsiveness under memory pressure.

---

zswap is a Linux kernel feature that acts as a compressed cache in front of your disk-based swap device. When a page needs to be swapped out, zswap compresses it and stores it in a small pool of RAM. If the pool is full or decompression is needed, the page is written to or read from the actual swap device. The result is fewer disk I/O operations, faster swap access, and often meaningfully better system responsiveness when memory is under pressure.

## How zswap Differs from zram

It's worth distinguishing zswap from zram:

- **zswap** sits in front of an existing swap device. It's a write-back cache - pages that don't fit in the compressed pool eventually go to disk swap. You still need a disk swap partition or file.
- **zram** creates a virtual block device backed entirely by compressed RAM. No disk swap is needed, but you're limited to what fits in RAM (even compressed).

zswap is generally preferred when you have disk swap and want to reduce I/O while keeping a disk-based safety net.

## Checking if zswap is Available

```bash
# Check if zswap is compiled into the kernel

cat /sys/module/zswap/parameters/enabled 2>/dev/null || \
  echo "zswap not loaded as module"

# Check the kernel config
zcat /proc/config.gz 2>/dev/null | grep -E "ZSWAP|ZBUD|Z3FOLD|ZSMALLOC" || \
  grep -E "ZSWAP|ZBUD" /boot/config-$(uname -r)

# Check if it's currently enabled
cat /sys/module/zswap/parameters/enabled
# Y = enabled, N = disabled

# List available compressors
ls /sys/module/zswap/parameters/
cat /sys/module/zswap/parameters/compressor
```

## Enabling zswap

On Ubuntu 20.04 and later, zswap can be enabled via kernel boot parameters or at runtime:

### Enable at Runtime

```bash
# Enable zswap immediately (no reboot needed)
echo 1 | sudo tee /sys/module/zswap/parameters/enabled

# Verify it's enabled
cat /sys/module/zswap/parameters/enabled
# Should show Y

# Check zswap statistics immediately
cat /sys/kernel/debug/zswap/pool_total_size 2>/dev/null || \
  grep -r "" /sys/kernel/debug/zswap/ 2>/dev/null
```

### Enable at Boot via Kernel Parameters

Edit the GRUB configuration to enable zswap on every boot:

```bash
sudo nano /etc/default/grub
```

Find the `GRUB_CMDLINE_LINUX_DEFAULT` line and add zswap parameters:

```bash
# /etc/default/grub
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash zswap.enabled=1 zswap.compressor=lz4 zswap.max_pool_percent=20"
```

```bash
# Update GRUB
sudo update-grub

# Verify the parameters will be applied
grep zswap /boot/grub/grub.cfg
```

## Choosing Compressor and Memory Pool Algorithm

zswap supports multiple compression algorithms. Some kernels also expose selectable pool allocators. The right choice affects CPU overhead and compression ratio:

### Compression Algorithms

```bash
# Available compressors (varies by kernel config)
grep -E "^(name|driver)" /proc/crypto | grep -E "lzo|lz4|zstd|deflate"

# Check the current zswap compressor
cat /sys/module/zswap/parameters/compressor

# lz4: fastest compression/decompression, lower compression ratio
# Good default for most systems
echo lz4 | sudo tee /sys/module/zswap/parameters/compressor

# zstd: better compression ratio than lz4, slightly more CPU
# Good for systems where memory savings matter more than CPU overhead
echo zstd | sudo tee /sys/module/zswap/parameters/compressor

# lzo: original zswap default, slower than lz4
# Use lz4 or zstd instead on modern systems
echo lzo | sudo tee /sys/module/zswap/parameters/compressor
```

### Memory Pool Allocators

```bash
# Check whether your kernel exposes a selectable zpool backend
ls /sys/module/zswap/parameters/
cat /sys/module/zswap/parameters/zpool 2>/dev/null || \
  echo "This kernel uses the built-in zswap pool backend"

# zsmalloc: current default on many kernels and the only backend on newer kernels
# Best compression density, with a more complex allocator
if [ -e /sys/module/zswap/parameters/zpool ]; then
    echo zsmalloc | sudo tee /sys/module/zswap/parameters/zpool
fi

# zbud: original allocator, only 2 pages per slot
if [ -e /sys/module/zswap/parameters/zpool ]; then
    echo zbud | sudo tee /sys/module/zswap/parameters/zpool
fi

# z3fold: older allocator that supports up to 3 compressed pages per page
# It may be unavailable on newer kernels
if [ -e /sys/module/zswap/parameters/zpool ]; then
    echo z3fold | sudo tee /sys/module/zswap/parameters/zpool
fi
```

## Tuning Pool Size

The `max_pool_percent` parameter controls what percentage of total RAM zswap can use:

```bash
# Check current setting
cat /sys/module/zswap/parameters/max_pool_percent

# Default is 20% - use 20% of RAM for compressed swap pool
# On a system with 8GB RAM, this allows a ~1.6GB compressed pool

# Increase for systems with memory pressure but fast CPUs
echo 25 | sudo tee /sys/module/zswap/parameters/max_pool_percent

# Decrease if zswap is using too much memory
echo 15 | sudo tee /sys/module/zswap/parameters/max_pool_percent

# For a 16GB system with a 20% limit, maximum compressed pool = 3.2GB
# With 3:1 compression ratio, this can hold ~9.6GB of uncompressed swap data
```

## Monitoring zswap Effectiveness

```bash
# zswap statistics are in debugfs
# Mount debugfs if not already mounted
sudo mount -t debugfs none /sys/kernel/debug 2>/dev/null || true

# Check key statistics
sudo cat /sys/kernel/debug/zswap/pool_total_size    # Total pool size in bytes
sudo cat /sys/kernel/debug/zswap/stored_pages       # Pages currently in pool
sudo cat /sys/kernel/debug/zswap/pool_limit_hit     # Times pool limit was hit
sudo cat /sys/kernel/debug/zswap/written_back_pages  # Pages sent to disk swap
sudo cat /sys/kernel/debug/zswap/reject_alloc_fail   # Failed allocations
sudo cat /sys/kernel/debug/zswap/duplicate_entry     # Duplicate entries found

# Calculate compression ratio
STORED=$(sudo cat /sys/kernel/debug/zswap/stored_pages 2>/dev/null || echo 0)
POOL_SIZE=$(sudo cat /sys/kernel/debug/zswap/pool_total_size 2>/dev/null || echo 0)
PAGE_SIZE=$(getconf PAGE_SIZE)

if [ "$STORED" -gt 0 ] && [ "$POOL_SIZE" -gt 0 ]; then
    UNCOMPRESSED=$(( STORED * PAGE_SIZE ))
    RATIO=$(echo "scale=2; $UNCOMPRESSED / $POOL_SIZE" | bc)
    echo "Compression ratio: ${RATIO}:1"
    echo "Pages in pool: $STORED"
    echo "Pool size: $(( POOL_SIZE / 1024 / 1024 )) MB"
    echo "Equivalent uncompressed: $(( UNCOMPRESSED / 1024 / 1024 )) MB"
fi

# Monitor in a loop
watch -n 5 '
echo "=== zswap Statistics ==="
for f in /sys/kernel/debug/zswap/*; do
    printf "%-30s %s\n" "$(basename $f):" "$(cat $f 2>/dev/null)"
done
'
```

## Complete Persistent Configuration

Combine all settings into a coherent boot configuration:

```bash
# Set kernel parameters in GRUB for early boot
sudo nano /etc/default/grub
```

```bash
# /etc/default/grub
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash zswap.enabled=1 zswap.compressor=lz4 zswap.max_pool_percent=20"
```

```bash
sudo update-grub

# Apply runtime changes immediately
echo 1 | sudo tee /sys/module/zswap/parameters/enabled
echo lz4 | sudo tee /sys/module/zswap/parameters/compressor
if [ -e /sys/module/zswap/parameters/zpool ]; then
    echo zsmalloc | sudo tee /sys/module/zswap/parameters/zpool
fi
echo 20 | sudo tee /sys/module/zswap/parameters/max_pool_percent
```

## zswap with Different Workloads

For a desktop with memory pressure from many browser tabs:

```bash
# More aggressive pool size since desktop RAM is used interactively
echo 25 | sudo tee /sys/module/zswap/parameters/max_pool_percent
echo lz4 | sudo tee /sys/module/zswap/parameters/compressor  # Fast decompression
```

For a server running background batch jobs that can tolerate latency:

```bash
# Better compression to save more RAM
echo zstd | sudo tee /sys/module/zswap/parameters/compressor
echo 15 | sudo tee /sys/module/zswap/parameters/max_pool_percent
```

## Disabling zswap

If zswap causes problems or you're switching to zram:

```bash
# Disable at runtime
echo 0 | sudo tee /sys/module/zswap/parameters/enabled

# Remove from GRUB parameters
sudo nano /etc/default/grub
# Remove zswap.enabled=1 and related parameters
sudo update-grub
```

zswap provides a meaningful benefit on systems that swap regularly. The compressed in-RAM cache can reduce swap disk I/O, which often translates to lower latency and better responsiveness during memory pressure events.
