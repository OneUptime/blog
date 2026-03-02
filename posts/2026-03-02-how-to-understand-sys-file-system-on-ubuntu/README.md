# How to Understand /sys File System on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Kernel, System Administration, Hardware

Description: A practical guide to the /sys virtual filesystem on Ubuntu, covering how to read hardware information, control devices, and understand the sysfs hierarchy.

---

The `/sys` filesystem (sysfs) is a virtual filesystem exported by the Linux kernel that provides a structured view of the kernel's device tree. Unlike `/proc`, which is an older and somewhat unstructured interface, `/sys` was designed with a clear organization: it mirrors the kernel's internal object model, exposing devices, drivers, buses, and kernel subsystems in a hierarchical way.

Every file in `/sys` corresponds to a kernel object attribute. Reading a file returns that attribute's current value; writing to certain files allows you to change kernel behavior at runtime.

## The /sys Directory Structure

```bash
ls /sys

# Key subdirectories:
# block/     - Block devices (disks, partitions)
# bus/       - Kernel bus subsystems (pci, usb, i2c, etc.)
# class/     - Device classes (net, input, sound, etc.)
# dev/       - Device nodes organized by major:minor number
# devices/   - The full device tree (mirrors the kernel's object hierarchy)
# firmware/  - Firmware-related data (ACPI, EFI)
# fs/        - Filesystem-related info (cgroups, ext4, etc.)
# kernel/    - Kernel subsystem parameters
# module/    - Loaded kernel modules and their parameters
# power/     - System power management
```

## Exploring Devices

### Block Devices

```bash
# List all block devices
ls /sys/block/

# Explore a disk
ls /sys/block/sda/

# Get disk size (in 512-byte sectors)
cat /sys/block/sda/size
# Convert to GB
awk '{printf "%.1f GB\n", $1*512/1024/1024/1024}' /sys/block/sda/size

# Check if device is rotational (1=HDD, 0=SSD)
cat /sys/block/sda/queue/rotational

# Check device scheduler
cat /sys/block/sda/queue/scheduler

# Read-ahead size in KB
cat /sys/block/sda/queue/read_ahead_kb

# Check device model
cat /sys/block/sda/device/model

# View partition info
ls /sys/block/sda/
# Partitions appear as subdirectories: sda1, sda2, etc.
cat /sys/block/sda/sda1/size
cat /sys/block/sda/sda1/start   # Starting sector
```

### Network Devices

```bash
# List network interfaces
ls /sys/class/net/

# Interface details
ls /sys/class/net/eth0/

# MAC address
cat /sys/class/net/eth0/address

# Interface speed (in Mbps, -1 if unknown/not connected)
cat /sys/class/net/eth0/speed

# Duplex setting
cat /sys/class/net/eth0/duplex

# MTU
cat /sys/class/net/eth0/mtu

# Interface state
cat /sys/class/net/eth0/operstate   # up, down, unknown

# TX/RX statistics
cat /sys/class/net/eth0/statistics/rx_bytes
cat /sys/class/net/eth0/statistics/tx_bytes
cat /sys/class/net/eth0/statistics/rx_errors
cat /sys/class/net/eth0/statistics/tx_dropped

# Number of TX/RX queues
cat /sys/class/net/eth0/queues/rx-0/rps_cpus  # CPU affinity for RX queue
```

### Input Devices

```bash
# List input devices
ls /sys/class/input/

# Keyboard or mouse details
cat /sys/class/input/input0/name
cat /sys/class/input/input0/phys
cat /sys/class/input/input0/id/vendor
cat /sys/class/input/input0/id/product
```

## The PCI Bus

```bash
# List all PCI devices
ls /sys/bus/pci/devices/

# Each device is named by domain:bus:slot.function
# e.g., 0000:00:02.0 = domain 0, bus 0, slot 2, function 0

# Device details
cat /sys/bus/pci/devices/0000:00:02.0/vendor   # Vendor ID (hex)
cat /sys/bus/pci/devices/0000:00:02.0/device   # Device ID (hex)
cat /sys/bus/pci/devices/0000:00:02.0/class    # Class code

# Which driver is bound to this device
ls -la /sys/bus/pci/devices/0000:00:02.0/driver

# Power state
cat /sys/bus/pci/devices/0000:00:02.0/power/runtime_status
```

## USB Devices

```bash
# List USB devices
ls /sys/bus/usb/devices/

# Device information
cat /sys/bus/usb/devices/1-1/manufacturer
cat /sys/bus/usb/devices/1-1/product
cat /sys/bus/usb/devices/1-1/idVendor
cat /sys/bus/usb/devices/1-1/idProduct
cat /sys/bus/usb/devices/1-1/speed    # USB speed in Mbps
```

## Kernel Modules via /sys/module/

```bash
# List all loaded modules
ls /sys/module/

# Module parameters (readable and sometimes writable)
ls /sys/module/usbcore/parameters/
cat /sys/module/usbcore/parameters/autosuspend   # USB autosuspend delay

# Module reference count
cat /sys/module/ext4/refcnt

# Change a module parameter at runtime
echo 2000 | sudo tee /sys/module/usbcore/parameters/autosuspend
```

## CPU Information and Control

```bash
# CPU topology
ls /sys/devices/system/cpu/

# Per-CPU info
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq
cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq

# Available governors
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors

# Change governor for all CPUs
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    echo "performance" | sudo tee "$cpu"
done

# CPU topology
cat /sys/devices/system/cpu/cpu0/topology/core_id
cat /sys/devices/system/cpu/cpu0/topology/physical_package_id
cat /sys/devices/system/cpu/cpu0/topology/thread_siblings_list

# Online/offline a CPU (for testing or power saving)
cat /sys/devices/system/cpu/cpu1/online
echo 0 | sudo tee /sys/devices/system/cpu/cpu1/online   # Take offline
echo 1 | sudo tee /sys/devices/system/cpu/cpu1/online   # Bring back online
# Note: cpu0 cannot be taken offline
```

## Memory and NUMA

```bash
# NUMA node information
ls /sys/devices/system/node/

# Memory on each NUMA node
cat /sys/devices/system/node/node0/meminfo

# CPU-to-node mapping
cat /sys/devices/system/node/node0/cpulist

# Huge pages
cat /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages     # Current count
cat /sys/kernel/mm/hugepages/hugepages-2048kB/free_hugepages   # Available
cat /sys/kernel/mm/hugepages/hugepages-2048kB/nr_overcommit_hugepages

# Allocate huge pages
echo 64 | sudo tee /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages

# Transparent huge pages
cat /sys/kernel/mm/transparent_hugepage/enabled
# [always] madvise never  <- value in brackets is current

# Disable transparent huge pages (common for databases like Redis/MongoDB)
echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
```

## Power Management

```bash
# System suspend states
cat /sys/power/state
# freeze mem disk

# Suspend to RAM
echo mem | sudo tee /sys/power/state

# Disk (hibernate)
echo disk | sudo tee /sys/power/state

# Wake-up sources
cat /sys/bus/pci/devices/0000:00:1f.3/power/wakeup
```

## LEDs and Status Indicators

```bash
# List LED devices (common on servers and laptops)
ls /sys/class/leds/

# LED state
cat /sys/class/leds/input0::capslock/brightness

# Trigger (what controls it)
cat /sys/class/leds/input0::capslock/trigger

# Manually control an LED (where permitted)
echo 1 | sudo tee /sys/class/leds/platform::backlight/brightness
```

## Writing a Simple Hardware Inventory Script

```bash
#!/bin/bash
# Quick hardware summary using /sys

echo "=== System Hardware Summary ==="
echo ""

echo "CPUs:"
echo "  Total: $(ls /sys/devices/system/cpu/cpu[0-9]* -d | wc -l)"
echo "  Model: $(grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)"
echo "  Governor: $(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || echo 'N/A')"
echo ""

echo "Network Interfaces:"
for iface in /sys/class/net/*/; do
    name=$(basename "$iface")
    [ "$name" = "lo" ] && continue
    state=$(cat "$iface/operstate" 2>/dev/null)
    mac=$(cat "$iface/address" 2>/dev/null)
    echo "  $name: $state ($mac)"
done
echo ""

echo "Block Devices:"
for dev in /sys/block/*/; do
    name=$(basename "$dev")
    [[ "$name" == loop* ]] && continue
    size_sectors=$(cat "$dev/size" 2>/dev/null)
    size_gb=$(echo "$size_sectors" | awk '{printf "%.0f GB", $1*512/1024/1024/1024}')
    rotational=$(cat "$dev/queue/rotational" 2>/dev/null)
    type=$( [ "$rotational" = "1" ] && echo "HDD" || echo "SSD/NVMe" )
    echo "  $name: $size_gb ($type)"
done
```

The `/sys` filesystem turns hardware introspection and runtime tuning into simple file reads and writes. Whether you're checking disk rotation type, monitoring network statistics, adjusting CPU frequency scaling, or diagnosing hardware issues, sysfs provides a consistent and well-organized interface without requiring specialized tools.
