# How to Set Up and Manage SWAP Space on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, SWAP, Memory, System Administration, Performance, Tutorial

Description: Learn how to create, configure, and optimize swap space on Ubuntu for better memory management and system stability.

---

Swap space acts as overflow memory when your system's physical RAM fills up. While slower than RAM, swap prevents out-of-memory crashes and helps the kernel manage memory more efficiently. This guide covers creating swap files, tuning performance, and monitoring usage.

## Understanding Swap

Swap provides:
- **Overflow capacity**: Space for data when RAM is full
- **Hibernation support**: Stores RAM contents when hibernating
- **Memory flexibility**: Allows kernel to move inactive pages out of RAM

### Swap Types

- **Swap Partition**: Dedicated disk partition for swap
- **Swap File**: Regular file used as swap (easier to resize)

## Check Current Swap Status

Before creating swap, check if any exists:

```bash
# Show current swap usage
free -h

# Display detailed swap information
swapon --show

# Check /etc/fstab for swap entries
cat /etc/fstab | grep swap
```

## Creating a Swap File

Modern Ubuntu versions recommend swap files over partitions for flexibility.

### Step 1: Create the Swap File

Choose size based on your RAM and use case:

| RAM Size | Recommended Swap |
|----------|-----------------|
| < 2GB | 2x RAM |
| 2-8GB | Equal to RAM |
| 8-64GB | At least 4GB |
| > 64GB | At least 4GB |

```bash
# Create a 4GB swap file using fallocate (fast method)
sudo fallocate -l 4G /swapfile

# Alternative: Use dd if fallocate isn't available
# This creates a 4GB file filled with zeros
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
```

### Step 2: Secure the Swap File

Only root should access the swap file:

```bash
# Set permissions so only root can read/write
sudo chmod 600 /swapfile

# Verify permissions
ls -lh /swapfile
```

### Step 3: Set Up the Swap File

Format and enable the swap:

```bash
# Format the file as swap space
sudo mkswap /swapfile

# Enable the swap file immediately
sudo swapon /swapfile

# Verify swap is active
swapon --show
free -h
```

### Step 4: Make Swap Permanent

Add to fstab so swap activates on boot:

```bash
# Backup fstab before editing
sudo cp /etc/fstab /etc/fstab.backup

# Add swap entry to fstab
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify the entry was added
tail -1 /etc/fstab
```

## Adjusting Swap Settings

### Swappiness

Swappiness controls how aggressively the kernel uses swap (0-100):
- **0**: Only swap to avoid out-of-memory
- **10-30**: Conservative swapping (good for SSDs/desktops)
- **60**: Default value
- **100**: Aggressive swapping

```bash
# Check current swappiness value
cat /proc/sys/vm/swappiness

# Set swappiness temporarily (until reboot)
sudo sysctl vm.swappiness=10

# Make swappiness permanent
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# Apply without reboot
sudo sysctl -p
```

### Cache Pressure

VFS cache pressure affects how the kernel reclaims inode/dentry cache:

```bash
# Check current cache pressure (default is 100)
cat /proc/sys/vm/vfs_cache_pressure

# Lower value keeps cache longer (good for file-heavy workloads)
sudo sysctl vm.vfs_cache_pressure=50

# Make permanent
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
```

## Resizing Swap

### Increase Swap Size

```bash
# Disable current swap
sudo swapoff /swapfile

# Resize the swap file (example: increase to 8GB)
sudo fallocate -l 8G /swapfile
# Or use dd:
# sudo dd if=/dev/zero of=/swapfile bs=1M count=8192 status=progress

# Reformat as swap
sudo mkswap /swapfile

# Enable the resized swap
sudo swapon /swapfile

# Verify new size
swapon --show
```

### Decrease Swap Size

Same process as above, just use a smaller size:

```bash
# Disable swap
sudo swapoff /swapfile

# Create smaller file (example: 2GB)
sudo fallocate -l 2G /swapfile

# Reformat and enable
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Removing Swap

To completely remove swap:

```bash
# Disable the swap file
sudo swapoff /swapfile

# Remove from fstab
sudo nano /etc/fstab
# Delete or comment out the /swapfile line

# Delete the swap file
sudo rm /swapfile

# Verify swap is gone
swapon --show
free -h
```

## Creating a Swap Partition

For dedicated swap (useful for hibernation):

### Identify Available Space

```bash
# List disk partitions
sudo fdisk -l

# Check partition layout
lsblk
```

### Create Partition with fdisk

```bash
# Start fdisk on your disk (replace sda with your disk)
sudo fdisk /dev/sda

# In fdisk:
# n - new partition
# p - primary
# (select partition number)
# (select first sector - default)
# +4G (size of swap)
# t - change type
# 82 - Linux swap
# w - write and exit
```

### Format and Enable

```bash
# Format as swap (replace sda3 with your partition)
sudo mkswap /dev/sda3

# Enable swap
sudo swapon /dev/sda3

# Add to fstab for persistence
echo '/dev/sda3 none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Monitoring Swap Usage

### Real-Time Monitoring

```bash
# Watch memory and swap usage
watch -n 1 free -h

# Detailed memory info
cat /proc/meminfo | grep -i swap

# Using vmstat (updates every 2 seconds)
vmstat 2

# Using top - press 'M' to sort by memory
top
```

### Check What's Using Swap

```bash
# Show swap usage per process
for proc in /proc/*/status; do
    awk '/VmSwap|Name/ {printf $2 " " $3}END{ print ""}' "$proc" 2>/dev/null
done | sort -k 2 -n -r | head -20
```

Or use this more readable script:

```bash
# Create swap usage monitoring script
cat > /tmp/swap-usage.sh << 'EOF'
#!/bin/bash
# Display processes using swap, sorted by usage
printf "%-8s %-20s %s\n" "PID" "PROCESS" "SWAP(KB)"
for pid in /proc/[0-9]*; do
    pid=${pid##*/}
    if [ -r "/proc/$pid/status" ]; then
        swap=$(awk '/VmSwap/ {print $2}' /proc/$pid/status 2>/dev/null)
        name=$(awk '/Name/ {print $2}' /proc/$pid/status 2>/dev/null)
        if [ -n "$swap" ] && [ "$swap" -gt 0 ]; then
            printf "%-8s %-20s %s\n" "$pid" "$name" "$swap"
        fi
    fi
done | sort -k3 -n -r | head -15
EOF
bash /tmp/swap-usage.sh
```

## Swap Best Practices

### For Servers

- Use swappiness of 10-30 for database servers
- Monitor swap usage in your observability stack
- Consider zram for memory compression before swap

### For Desktops/Laptops

- Swap size >= RAM for hibernation support
- Swappiness of 10-30 for responsiveness
- Place swap file on fastest disk (SSD preferred)

### For Cloud VMs

- Cloud providers often don't include swap
- Create swap file based on workload needs
- Be aware that swap on network storage can be slow

## Enabling Hibernation

Hibernation requires swap >= RAM size:

```bash
# Check current swap size is sufficient
free -h

# Find UUID of swap
sudo blkid | grep swap

# Add resume parameter to GRUB
sudo nano /etc/default/grub
# Add resume=UUID=your-swap-uuid to GRUB_CMDLINE_LINUX_DEFAULT

# Update GRUB
sudo update-grub

# Update initramfs
sudo update-initramfs -u
```

## Using zram (Compressed Swap)

zram creates compressed swap in RAM, reducing need for disk swap:

```bash
# Install zram-config
sudo apt install zram-config -y

# Check zram status
cat /proc/swaps

# View zram configuration
cat /sys/block/zram0/disksize
```

## Troubleshooting

### "swapon failed: Invalid argument"

File wasn't formatted as swap:

```bash
# Format the file properly
sudo mkswap /swapfile
sudo swapon /swapfile
```

### "swapon: /swapfile: insecure permissions"

Permissions are too open:

```bash
# Fix permissions
sudo chmod 600 /swapfile
```

### High Swap Usage with Free RAM

This is normal-the kernel proactively swaps inactive pages:

```bash
# Lower swappiness to reduce this behavior
sudo sysctl vm.swappiness=10
```

### Cannot Disable Swap

Processes are using swap space:

```bash
# Check what's using swap
cat /proc/*/status | grep -E "^(Name|VmSwap)" | grep -B1 -E "[1-9]+ kB"

# Force processes to move back to RAM (may be slow)
sudo swapoff -a && sudo swapon -a
```

---

Properly configured swap improves system stability and allows the kernel to manage memory efficiently. For most Ubuntu servers, a swap file equal to RAM (up to 4-8GB) with a swappiness of 10-30 provides good balance between performance and safety.
