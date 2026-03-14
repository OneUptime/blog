# How to Use sysfs and procfs to Interact with the Kernel on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Linux, System Administration, Sysfs

Description: Learn how to read and write kernel parameters using sysfs and procfs on Ubuntu to inspect hardware, tune performance, and configure kernel behavior at runtime.

---

Linux exposes much of its internal state through two virtual filesystems: `/proc` (procfs) and `/sys` (sysfs). These aren't real filesystems with files on disk - they're interfaces to the kernel that present information and controls as if they were files. Being comfortable with these interfaces is essential for any sysadmin who needs to go beyond package management and truly understand what's running on their systems.

## What Are procfs and sysfs

**procfs** (`/proc`) has been around since early Linux. It exposes process information, kernel configuration, and various subsystem states. While it was originally just for process information (hence the name), it grew to include much more.

**sysfs** (`/sys`) was introduced later specifically to address the mess that `/proc` became. sysfs is more structured, organized around the kernel's device model. It reflects the hierarchy of devices, buses, drivers, and kernel objects.

Both are mounted automatically at boot:

```bash
# Verify they're mounted
mount | grep -E "proc|sysfs"
# proc on /proc type proc (rw,nosuid,nodev,noexec,relatime)
# sysfs on /sys type sysfs (rw,nosuid,nodev,noexec,relatime)
```

## Exploring /proc

### Process Information

Every running process has a directory in `/proc` named by its PID:

```bash
# List process directories
ls /proc | grep '^[0-9]' | head -20

# Examine the init process (PID 1)
ls /proc/1/

# Key files in a process directory:
cat /proc/1/cmdline | tr '\0' ' '   # Command line arguments
cat /proc/1/status                   # Process status and resource usage
cat /proc/1/maps                     # Memory mappings
cat /proc/1/fd/ 2>/dev/null && ls /proc/1/fd/  # Open file descriptors
cat /proc/1/net/tcp                  # Network connections (in network namespace)
```

### System-Wide Information

```bash
# CPU information
cat /proc/cpuinfo

# Count physical cores
cat /proc/cpuinfo | grep "cpu cores" | uniq

# Memory information
cat /proc/meminfo

# Kernel version and build info
cat /proc/version

# Current uptime and idle time
cat /proc/uptime

# System load averages
cat /proc/loadavg

# Running processes count
cat /proc/loadavg | awk '{print $4}'

# Kernel command line parameters
cat /proc/cmdline

# Mounted filesystems
cat /proc/mounts

# Filesystem statistics
cat /proc/diskstats

# Network interface statistics
cat /proc/net/dev

# IRQ assignments and counts
cat /proc/interrupts

# DMA channel usage
cat /proc/dma

# I/O port usage
cat /proc/ioports
```

### Kernel Tuning via /proc/sys

The `/proc/sys` subdirectory contains kernel parameters that can often be changed at runtime:

```bash
# Network parameters
cat /proc/sys/net/ipv4/ip_forward          # IP forwarding
cat /proc/sys/net/core/somaxconn           # Max socket connection backlog
cat /proc/sys/net/ipv4/tcp_fin_timeout     # TCP FIN timeout

# Kernel parameters
cat /proc/sys/kernel/hostname              # System hostname
cat /proc/sys/kernel/pid_max              # Maximum PID value
cat /proc/sys/kernel/threads-max          # Maximum threads
cat /proc/sys/kernel/panic                # Panic timeout

# VM parameters
cat /proc/sys/vm/swappiness               # Swap aggressiveness
cat /proc/sys/vm/dirty_ratio             # Dirty page ratio
cat /proc/sys/vm/overcommit_memory       # Memory overcommit behavior
```

Changing these parameters:

```bash
# Enable IP forwarding (needed for routing/NAT)
echo 1 > /proc/sys/net/ipv4/ip_forward

# Reduce swappiness (less aggressive swapping)
echo 10 > /proc/sys/vm/swappiness

# Increase somaxconn for high-traffic servers
echo 65535 > /proc/sys/net/core/somaxconn

# Verify the change took effect
cat /proc/sys/net/core/somaxconn
```

Note: Changes via `/proc/sys` don't survive reboots. Use `sysctl` and `/etc/sysctl.conf` for persistent changes.

## Exploring /sys (sysfs)

sysfs is organized differently from procfs. Its main top-level directories are:

```bash
ls /sys/
# block   bus   class   dev   devices   firmware   fs   hypervisor
# kernel  module  power
```

### /sys/class - Device Classes

This organizes devices by type regardless of physical connection:

```bash
# Network interfaces
ls /sys/class/net/
# eth0  lo  wlan0  ...

# Block devices
ls /sys/class/block/
# sda  sda1  sda2  nvme0n1  ...

# Input devices
ls /sys/class/input/

# Graphics
ls /sys/class/drm/
```

Reading network interface information:

```bash
# Network interface speed
cat /sys/class/net/eth0/speed

# Interface state
cat /sys/class/net/eth0/operstate

# MAC address
cat /sys/class/net/eth0/address

# Interface statistics
cat /sys/class/net/eth0/statistics/rx_bytes
cat /sys/class/net/eth0/statistics/tx_bytes
cat /sys/class/net/eth0/statistics/rx_errors
cat /sys/class/net/eth0/statistics/tx_errors

# MTU
cat /sys/class/net/eth0/mtu
```

### /sys/block - Block Devices

```bash
# List block devices
ls /sys/block/

# Disk size (in 512-byte sectors)
cat /sys/block/sda/size
# Convert to GB: echo "$(cat /sys/block/sda/size) * 512 / 1024 / 1024 / 1024" | bc

# Scheduler (I/O queue scheduler)
cat /sys/block/sda/queue/scheduler

# Change scheduler (without reboot)
echo mq-deadline > /sys/block/sda/queue/scheduler

# Read-ahead size in KB
cat /sys/block/sda/queue/read_ahead_kb

# Increase read-ahead for sequential workloads
echo 4096 > /sys/block/sda/queue/read_ahead_kb

# Queue depth
cat /sys/block/nvme0n1/queue/nr_requests

# Check if SSD (rotational = 0 means SSD)
cat /sys/block/sda/queue/rotational
```

### /sys/devices - Hardware Hierarchy

This reflects the physical device hierarchy:

```bash
# PCI devices
ls /sys/devices/pci*/

# USB devices
ls /sys/bus/usb/devices/

# CPU topology
ls /sys/devices/system/cpu/

# CPU frequency information
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Change CPU frequency governor
echo performance > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Apply to all CPUs
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    echo performance > $cpu
done
```

### /sys/module - Loaded Module Parameters

```bash
# List all loaded modules via sysfs
ls /sys/module/

# View module parameters
ls /sys/module/bluetooth/parameters/

# Read a parameter
cat /sys/module/bluetooth/parameters/disable_ertm

# Write a parameter (if writable)
echo 1 > /sys/module/usbcore/parameters/autosuspend

# Check module taint status
cat /sys/module/nouveau/taint 2>/dev/null
```

### /sys/kernel - Kernel Tunables

```bash
# Security-related kernel settings
ls /sys/kernel/security/

# Kernel debug settings
ls /sys/kernel/debug/ 2>/dev/null

# Check lockdown mode
cat /sys/kernel/security/lockdown 2>/dev/null

# Memory keys
cat /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages
```

## Practical Examples

### Find Which Process Is Holding a File Open

```bash
# Find open files using /proc
for pid in /proc/[0-9]*/fd/*; do
    target=$(readlink "$pid" 2>/dev/null)
    if [ "$target" = "/var/log/syslog" ]; then
        echo "PID: $(echo $pid | cut -d/ -f3), FD: $(basename $pid)"
    fi
done
```

### Monitor Real-Time Network Throughput

```bash
#!/bin/bash
# Monitor network throughput using /sys

INTERFACE="eth0"
STATS_DIR="/sys/class/net/$INTERFACE/statistics"

prev_rx=$(cat $STATS_DIR/rx_bytes)
prev_tx=$(cat $STATS_DIR/tx_bytes)

while true; do
    sleep 1
    curr_rx=$(cat $STATS_DIR/rx_bytes)
    curr_tx=$(cat $STATS_DIR/tx_bytes)

    rx_rate=$(( (curr_rx - prev_rx) / 1024 ))
    tx_rate=$(( (curr_tx - prev_tx) / 1024 ))

    echo "RX: ${rx_rate} KB/s  TX: ${tx_rate} KB/s"

    prev_rx=$curr_rx
    prev_tx=$curr_tx
done
```

### Check CPU Temperature

```bash
# Thermal zone temperatures
for zone in /sys/class/thermal/thermal_zone*/; do
    type=$(cat "$zone/type" 2>/dev/null)
    temp=$(cat "$zone/temp" 2>/dev/null)
    if [ -n "$temp" ]; then
        # Temperature is in millidegrees Celsius
        echo "$type: $(echo "scale=1; $temp/1000" | bc)°C"
    fi
done
```

### Temporarily Disable a CPU Core

```bash
# Take CPU 3 offline (CPU 0 cannot be taken offline)
echo 0 > /sys/devices/system/cpu/cpu3/online

# Bring it back online
echo 1 > /sys/devices/system/cpu/cpu3/online

# Verify
cat /sys/devices/system/cpu/cpu3/online
```

## Differences Between procfs and sysfs

| Aspect | /proc | /sys |
|--------|-------|------|
| Organization | Mixed, somewhat ad-hoc | Structured, hierarchical |
| Focus | Processes and kernel state | Devices and kernel objects |
| Introduced | Early Linux | Kernel 2.6 |
| Writeable files | Many in /proc/sys | Many device settings |
| Stability | Relatively stable API | More structured contract |

## Safety Notes

Reading from these virtual filesystems is always safe. Writing is more dangerous:

- Always verify the current value before changing it
- Some changes are irreversible without a reboot
- Changes to `/proc/sys` and `/sys` don't persist across reboots
- For permanent changes, use `/etc/sysctl.d/` for kernel parameters and udev rules for device settings
- On production systems, test changes during a maintenance window

The `/proc` and `/sys` filesystems are among the most powerful diagnostic and tuning tools available on Linux. Spending time exploring them on a test system gives you deep insight into how the kernel manages hardware and system resources.
