# How to Create and Manage Swap Files on Ubuntu (Not Swap Partitions)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Memory Management, Storage, System Administration, Linux

Description: Create, resize, and manage swap files on Ubuntu as a flexible alternative to swap partitions, including tuning swappiness and managing multiple swap files.

---

Swap provides overflow memory capacity when physical RAM is exhausted. Ubuntu 22.04 and later create a swap file by default (`/swapfile`) rather than a dedicated swap partition. Swap files are more flexible - you can create, resize, or remove them without repartitioning the disk.

## Checking Current Swap

```bash
# Show all swap spaces
swapon --show

# Or
cat /proc/swaps

# Show memory and swap usage
free -h
```

Example output:

```
NAME      TYPE  SIZE  USED PRIO
/swapfile file  2G    0B   -2
```

```
              total        used        free      shared  buff/cache   available
Mem:          3.8Gi       1.2Gi       1.0Gi        45Mi       1.5Gi       2.3Gi
Swap:         2.0Gi          0B       2.0Gi
```

## Creating a Swap File

### Using fallocate (fastest method)

```bash
# Create a 4GB swap file
sudo fallocate -l 4G /swapfile

# Set correct permissions (swap files should not be readable by others)
sudo chmod 600 /swapfile

# Set up the swap area
sudo mkswap /swapfile

# Enable the swap file
sudo swapon /swapfile

# Verify
swapon --show
```

### Using dd (compatible with all filesystems, including Btrfs)

`fallocate` creates sparse files on some filesystems, which can cause problems with swap. Use `dd` when you need guaranteed physical allocation:

```bash
# Create a 4GB swap file using dd (writes actual zeros)
# bs=1M count=4096 = 4GB
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress

# Set permissions
sudo chmod 600 /swapfile

# Format as swap
sudo mkswap /swapfile

# Enable
sudo swapon /swapfile
```

Note: `dd` is slower than `fallocate` because it writes every byte, but it guarantees the file isn't sparse. For Btrfs filesystems, always use `dd` (Btrfs doesn't support swap on sparse files).

## Making Swap Persistent Across Reboots

After creating and enabling the swap file, add it to `/etc/fstab`:

```bash
# Check if there's already a swapfile entry
grep swap /etc/fstab
```

If not present, add it:

```bash
echo '/swapfile  none  swap  sw  0  0' | sudo tee -a /etc/fstab
```

Verify the fstab entry works:

```bash
# Disable swap, re-enable from fstab to test
sudo swapoff /swapfile
sudo swapon -a  # Enables all swap in fstab
swapon --show   # Should show swapfile active again
```

## Resizing an Existing Swap File

Ubuntu's default `/swapfile` is often 2GB. On servers doing memory-intensive work, you'll want more.

```bash
# Step 1: Disable the current swap file
sudo swapoff /swapfile

# Step 2: Remove and recreate at the new size
sudo rm /swapfile
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile

# Step 3: Enable it
sudo swapon /swapfile

# Step 4: Verify
free -h
swapon --show
```

The fstab entry remains unchanged since we kept the same filename.

## Creating Multiple Swap Files

You can have multiple swap files active simultaneously, useful when you need to add temporary swap quickly:

```bash
# Create a secondary swap file
sudo fallocate -l 2G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2

# Enable with lower priority than the primary swap
sudo swapon --priority 5 /swapfile2

# The primary swap (from fstab) has priority -2 by default
# Lower priority number = higher priority (used first)
swapon --show
```

Output:

```
NAME       TYPE  SIZE  USED PRIO
/swapfile  file    8G    0B   -2
/swapfile2 file    2G    0B    5
```

The kernel uses higher-priority swap first. The temporary `/swapfile2` will be used after `/swapfile` is full (it has lower priority due to higher number).

When you no longer need the temporary swap:

```bash
sudo swapoff /swapfile2
sudo rm /swapfile2
```

## Tuning Swappiness

`vm.swappiness` controls how aggressively the kernel uses swap. The value ranges from 0 to 100:

- **0**: Don't swap until absolutely necessary (only when RAM is genuinely full)
- **10**: Low swappiness - prefer keeping data in RAM
- **60**: Default Ubuntu value - moderate use of swap
- **100**: Aggressively swap - swap even when RAM is available

For a desktop or interactive server, lower swappiness reduces latency:

```bash
# Check current swappiness
cat /proc/sys/vm/swappiness

# Set temporarily (takes effect immediately, lost on reboot)
sudo sysctl vm.swappiness=10

# Set permanently
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl -p /etc/sysctl.d/99-swappiness.conf
```

Recommended swappiness values:

| Workload | Swappiness |
|----------|-----------|
| Desktop | 10-20 |
| Web server | 10-30 |
| Database server | 1-10 |
| Memory-constrained (2GB RAM) | 30-60 |

### VFS cache pressure

A related setting controls how aggressively the kernel reclaims memory used for filesystem caches:

```bash
# Check current value (default: 100)
cat /proc/sys/vm/vfs_cache_pressure

# Lower value = kernel less eager to reclaim cache memory
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.d/99-swappiness.conf
```

## Monitoring Swap Usage

```bash
# Real-time memory and swap stats
watch -n 1 free -h

# Process-level swap usage (who's using swap?)
for pid in /proc/[0-9]*; do
    pid_num=$(basename $pid)
    comm=$(cat "$pid/comm" 2>/dev/null)
    swap=$(cat "$pid/status" 2>/dev/null | awk '/VmSwap/{print $2}')
    if [ -n "$swap" ] && [ "$swap" -gt 0 ]; then
        echo "${swap}kB  $comm (PID $pid_num)"
    fi
done | sort -rn | head -15

# vmstat shows swap activity in real time
vmstat 1 10
# si = swap in (reading from swap to RAM)
# so = swap out (writing from RAM to swap)
```

High `so` values indicate memory pressure and excessive swapping.

## Disabling Swap Completely

On systems with enough RAM (32GB+), swap is sometimes disabled entirely:

```bash
# Disable all swap immediately
sudo swapoff -a

# Remove or comment out swap entries in fstab
sudo nano /etc/fstab
# Comment out: # /swapfile  none  swap  sw  0  0

# Optionally delete the swap file
sudo rm /swapfile
```

Note: Kubernetes cluster nodes sometimes require swap to be disabled, as the kubelet doesn't properly account for swap in its resource calculations.

## Swap on Btrfs Filesystems

Btrfs requires special handling for swap files:

```bash
# For Btrfs, create a subvolume for swap to avoid snapshot issues
sudo btrfs subvolume create /swap
sudo chattr +C /swap  # Disable copy-on-write for the swap subvolume

# Create the swap file (must use dd, not fallocate, on Btrfs)
sudo dd if=/dev/zero of=/swap/swapfile bs=1M count=4096 status=progress
sudo chmod 600 /swap/swapfile
sudo mkswap /swap/swapfile
sudo swapon /swap/swapfile
```

The `+C` attribute disables copy-on-write, which is required for swap files on Btrfs to work correctly.

Swap files offer the same performance as swap partitions on modern kernels (the performance difference was eliminated in Linux 2.6+), with the added benefit of being easy to create, resize, and remove without disk repartitioning. For cloud VMs where you can't easily change partition layouts, swap files are the practical approach to adding swap capacity.
