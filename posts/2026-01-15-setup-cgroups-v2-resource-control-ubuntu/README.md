# How to Set Up cgroups v2 for Resource Control on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, cgroups, Resource Control, Containers, Linux, Tutorial

Description: Complete guide to using cgroups v2 for process resource management on Ubuntu.

---

Control groups (cgroups) are a Linux kernel feature that allows you to allocate, prioritize, and limit system resources such as CPU, memory, I/O, and network bandwidth for groups of processes. With the introduction of cgroups v2, the Linux kernel provides a unified hierarchy and improved resource management capabilities. This comprehensive guide walks you through setting up and using cgroups v2 on Ubuntu for effective process resource control.

## Understanding cgroups v2 vs v1

Before diving into the setup, it is important to understand the differences between cgroups v1 and v2.

### cgroups v1 (Legacy)

The original cgroups implementation introduced multiple separate hierarchies, one for each resource controller (CPU, memory, I/O, etc.). This design led to several issues:

- **Multiple hierarchies**: Each controller had its own independent tree structure
- **Inconsistent behavior**: Different controllers behaved differently across hierarchies
- **Complex management**: Processes could belong to different cgroups in different hierarchies
- **No unified view**: Difficult to get a holistic view of resource allocation

### cgroups v2 (Unified)

cgroups v2 addresses these limitations with a unified approach:

- **Single hierarchy**: All controllers share one unified tree structure
- **Consistent interface**: Uniform control file naming and behavior
- **Simplified management**: A process belongs to exactly one cgroup
- **Better resource distribution**: Improved algorithms for resource allocation
- **Pressure Stall Information (PSI)**: Built-in metrics for resource contention
- **Enhanced security**: Better delegation model for unprivileged users

```
# cgroups v1 structure (multiple hierarchies)
/sys/fs/cgroup/cpu/
/sys/fs/cgroup/memory/
/sys/fs/cgroup/blkio/
/sys/fs/cgroup/pids/

# cgroups v2 structure (unified hierarchy)
/sys/fs/cgroup/          # Single mount point for all controllers
```

## Checking Your Current cgroups Version

Before making changes, determine which cgroups version your system currently uses.

### Method 1: Check the Filesystem Mount

```bash
# Check what is mounted at the cgroup filesystem
mount | grep cgroup

# Expected output for cgroups v2 (unified):
# cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nosuid,nodev,noexec,relatime,nsdelegate,memory_recursiveprot)

# Expected output for cgroups v1 (legacy):
# tmpfs on /sys/fs/cgroup type tmpfs (rw,nosuid,nodev,noexec,mode=755)
# cgroup on /sys/fs/cgroup/cpu type cgroup (rw,nosuid,nodev,noexec,relatime,cpu)
# cgroup on /sys/fs/cgroup/memory type cgroup (rw,nosuid,nodev,noexec,relatime,memory)
```

### Method 2: Check the Cgroup Filesystem Type

```bash
# Check the filesystem type at the cgroup mount point
stat -fc %T /sys/fs/cgroup/

# Output for cgroups v2: cgroup2fs
# Output for cgroups v1: tmpfs
```

### Method 3: Check Available Controllers

```bash
# For cgroups v2, list available controllers
cat /sys/fs/cgroup/cgroup.controllers

# Example output: cpuset cpu io memory hugetlb pids rdma misc
```

### Method 4: Check Kernel Command Line

```bash
# View current kernel boot parameters
cat /proc/cmdline | grep -o 'systemd.unified_cgroup_hierarchy=[^ ]*'

# Or check the full command line
cat /proc/cmdline
```

## Enabling cgroups v2 on Ubuntu

Modern Ubuntu versions (20.04 LTS and later) support cgroups v2, but it may not be enabled by default. Here is how to enable it.

### Step 1: Update GRUB Configuration

```bash
# Edit the GRUB configuration file
sudo nano /etc/default/grub

# Find the line starting with GRUB_CMDLINE_LINUX_DEFAULT
# Add the following parameters to enable cgroups v2:
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash systemd.unified_cgroup_hierarchy=1"

# If you want to completely disable cgroups v1 (recommended for clean setup):
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash systemd.unified_cgroup_hierarchy=1 cgroup_no_v1=all"
```

### Step 2: Update GRUB and Reboot

```bash
# Update GRUB configuration
sudo update-grub

# Verify the configuration was updated
grep -i cgroup /boot/grub/grub.cfg

# Reboot to apply changes
sudo reboot
```

### Step 3: Verify cgroups v2 is Active

```bash
# After reboot, verify cgroups v2 is enabled
mount | grep cgroup2

# Check the filesystem type
stat -fc %T /sys/fs/cgroup/

# Should output: cgroup2fs

# List available controllers
cat /sys/fs/cgroup/cgroup.controllers

# Example output: cpuset cpu io memory hugetlb pids rdma misc
```

## Understanding the cgroup Hierarchy Structure

cgroups v2 uses a hierarchical tree structure where each cgroup can have child cgroups, forming a parent-child relationship.

### Root cgroup

The root cgroup is located at `/sys/fs/cgroup/` and contains all processes by default.

```bash
# View the root cgroup directory
ls -la /sys/fs/cgroup/

# Key files in the root cgroup:
# cgroup.controllers      - Available controllers
# cgroup.subtree_control  - Controllers enabled for child cgroups
# cgroup.procs            - PIDs of processes in this cgroup
# cgroup.threads          - TIDs of threads in this cgroup
# cgroup.stat             - Statistics about the cgroup
```

### Creating a cgroup Hierarchy

```bash
# Create a parent cgroup
sudo mkdir /sys/fs/cgroup/myapp

# Create child cgroups under the parent
sudo mkdir /sys/fs/cgroup/myapp/webserver
sudo mkdir /sys/fs/cgroup/myapp/database
sudo mkdir /sys/fs/cgroup/myapp/cache

# View the hierarchy
tree /sys/fs/cgroup/myapp/

# Output:
# /sys/fs/cgroup/myapp/
# ├── webserver/
# ├── database/
# └── cache/
```

### The No Internal Process Constraint

In cgroups v2, a cgroup with controllers enabled cannot have processes directly in it if it has child cgroups. This is called the "no internal process" constraint.

```bash
# Example: This structure is INVALID if controllers are enabled
/sys/fs/cgroup/myapp/
├── cgroup.procs         # Contains PIDs (INVALID with controllers + children)
├── webserver/
│   └── cgroup.procs     # Contains PIDs
└── database/
    └── cgroup.procs     # Contains PIDs

# Correct structure: Processes only in leaf cgroups
/sys/fs/cgroup/myapp/
├── cgroup.procs         # Empty (no direct processes)
├── webserver/
│   └── cgroup.procs     # Contains PIDs
└── database/
    └── cgroup.procs     # Contains PIDs
```

## CPU Controller: Managing CPU Resources

The CPU controller allows you to control CPU time allocation for processes in a cgroup.

### Enabling the CPU Controller

```bash
# First, check available controllers at the root
cat /sys/fs/cgroup/cgroup.controllers
# Output: cpuset cpu io memory hugetlb pids rdma misc

# Enable CPU controller for child cgroups of root
echo "+cpu" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Create a test cgroup
sudo mkdir /sys/fs/cgroup/cpu_test

# Verify CPU controller files are available
ls /sys/fs/cgroup/cpu_test/cpu.*
# Output: cpu.max  cpu.pressure  cpu.stat  cpu.weight  cpu.weight.nice
```

### cpu.max: Hard CPU Limit (Bandwidth Control)

The `cpu.max` file sets an absolute limit on CPU time. It uses the format `$MAX $PERIOD` where:
- `$MAX` is the maximum CPU time (in microseconds) the cgroup can use per period
- `$PERIOD` is the enforcement period (in microseconds), default is 100000 (100ms)

```bash
# Create a cgroup for CPU-limited processes
sudo mkdir -p /sys/fs/cgroup/limited_cpu

# Enable CPU controller
echo "+cpu" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Set CPU limit to 50% of one CPU core
# 50000 microseconds out of 100000 = 50%
echo "50000 100000" | sudo tee /sys/fs/cgroup/limited_cpu/cpu.max

# Limit to 25% of one CPU core
echo "25000 100000" | sudo tee /sys/fs/cgroup/limited_cpu/cpu.max

# Limit to 200% (2 full CPU cores on multi-core system)
echo "200000 100000" | sudo tee /sys/fs/cgroup/limited_cpu/cpu.max

# Remove the limit (set to max)
echo "max 100000" | sudo tee /sys/fs/cgroup/limited_cpu/cpu.max

# Read current setting
cat /sys/fs/cgroup/limited_cpu/cpu.max
```

### cpu.weight: Relative CPU Priority (Fair Scheduling)

The `cpu.weight` file sets the relative weight for CPU time distribution among sibling cgroups. Values range from 1 to 10000, with 100 being the default.

```bash
# Create two sibling cgroups for comparison
sudo mkdir -p /sys/fs/cgroup/app_high_priority
sudo mkdir -p /sys/fs/cgroup/app_low_priority

# Enable CPU controller for both
echo "+cpu" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Set high priority cgroup to weight 500 (5x default)
echo "500" | sudo tee /sys/fs/cgroup/app_high_priority/cpu.weight

# Set low priority cgroup to weight 50 (0.5x default)
echo "50" | sudo tee /sys/fs/cgroup/app_low_priority/cpu.weight

# When both cgroups compete for CPU:
# - high_priority gets 500/(500+50) = ~91% of contested CPU time
# - low_priority gets 50/(500+50) = ~9% of contested CPU time

# Read current weights
cat /sys/fs/cgroup/app_high_priority/cpu.weight  # 500
cat /sys/fs/cgroup/app_low_priority/cpu.weight   # 50
```

### Practical CPU Control Example

```bash
#!/bin/bash
# cpu_control_demo.sh - Demonstrates CPU resource control with cgroups v2

# Configuration
CGROUP_BASE="/sys/fs/cgroup"
APP_CGROUP="${CGROUP_BASE}/demo_app"

# Create the cgroup hierarchy
setup_cgroup() {
    echo "Setting up CPU-controlled cgroup..."

    # Enable CPU controller at root level
    echo "+cpu" | sudo tee ${CGROUP_BASE}/cgroup.subtree_control > /dev/null

    # Create application cgroup
    sudo mkdir -p ${APP_CGROUP}

    # Set CPU limit to 50% of one core
    echo "50000 100000" | sudo tee ${APP_CGROUP}/cpu.max > /dev/null

    # Set weight for fair scheduling
    echo "100" | sudo tee ${APP_CGROUP}/cpu.weight > /dev/null

    echo "Cgroup created with:"
    echo "  - CPU max: $(cat ${APP_CGROUP}/cpu.max)"
    echo "  - CPU weight: $(cat ${APP_CGROUP}/cpu.weight)"
}

# Run a process in the cgroup
run_in_cgroup() {
    local command="$1"

    # Start the process and get its PID
    $command &
    local pid=$!

    # Move the process to our cgroup
    echo $pid | sudo tee ${APP_CGROUP}/cgroup.procs > /dev/null

    echo "Process $pid moved to cgroup"
    echo "Current processes in cgroup: $(cat ${APP_CGROUP}/cgroup.procs)"

    # Wait for the process
    wait $pid
}

# Monitor CPU usage
monitor_cpu() {
    echo "CPU Statistics:"
    cat ${APP_CGROUP}/cpu.stat
    echo ""
    echo "CPU Pressure (PSI):"
    cat ${APP_CGROUP}/cpu.pressure
}

# Cleanup
cleanup() {
    echo "Cleaning up cgroup..."

    # Move all processes back to root cgroup
    for pid in $(cat ${APP_CGROUP}/cgroup.procs 2>/dev/null); do
        echo $pid | sudo tee ${CGROUP_BASE}/cgroup.procs > /dev/null 2>&1
    done

    # Remove the cgroup
    sudo rmdir ${APP_CGROUP} 2>/dev/null

    echo "Cleanup complete"
}

# Main execution
case "$1" in
    setup)
        setup_cgroup
        ;;
    run)
        shift
        run_in_cgroup "$*"
        ;;
    monitor)
        monitor_cpu
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {setup|run <command>|monitor|cleanup}"
        exit 1
        ;;
esac
```

## Memory Controller: Managing Memory Resources

The memory controller allows you to limit and monitor memory usage for processes in a cgroup.

### Enabling the Memory Controller

```bash
# Enable memory controller for child cgroups
echo "+memory" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Create a memory-controlled cgroup
sudo mkdir /sys/fs/cgroup/mem_test

# View available memory control files
ls /sys/fs/cgroup/mem_test/memory.*
# Output includes:
# memory.current    - Current memory usage
# memory.high       - Throttling threshold
# memory.low        - Best-effort memory protection
# memory.max        - Hard memory limit
# memory.min        - Guaranteed minimum memory
# memory.oom.group  - OOM behavior control
# memory.pressure   - Memory pressure metrics
# memory.stat       - Detailed memory statistics
# memory.swap.*     - Swap-related controls
```

### memory.max: Hard Memory Limit

The `memory.max` file sets an absolute upper limit on memory usage. If a cgroup exceeds this limit, the kernel's OOM (Out of Memory) killer may terminate processes.

```bash
# Create a memory-limited cgroup
sudo mkdir -p /sys/fs/cgroup/limited_memory

# Enable memory controller
echo "+memory" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Set hard limit to 512 MB
echo "536870912" | sudo tee /sys/fs/cgroup/limited_memory/memory.max

# Alternative: Use human-readable suffixes (if supported by your kernel)
# echo "512M" | sudo tee /sys/fs/cgroup/limited_memory/memory.max

# Set limit to 1 GB
echo "1073741824" | sudo tee /sys/fs/cgroup/limited_memory/memory.max

# Remove the limit
echo "max" | sudo tee /sys/fs/cgroup/limited_memory/memory.max

# Check current memory usage
cat /sys/fs/cgroup/limited_memory/memory.current
```

### memory.high: Soft Throttling Threshold

The `memory.high` file sets a throttling threshold. When memory usage exceeds this limit, the kernel aggressively reclaims memory but does not trigger OOM.

```bash
# Set soft limit to 256 MB (processes will be throttled above this)
echo "268435456" | sudo tee /sys/fs/cgroup/limited_memory/memory.high

# Set hard limit higher than soft limit
echo "536870912" | sudo tee /sys/fs/cgroup/limited_memory/memory.max

# This configuration:
# - Below 256 MB: Normal operation
# - 256 MB to 512 MB: Processes throttled, memory reclaimed aggressively
# - Above 512 MB: OOM killer may be invoked
```

### memory.low and memory.min: Memory Protection

```bash
# memory.min - Guaranteed minimum memory (hard protection)
# This memory is never reclaimed, even under extreme pressure
echo "134217728" | sudo tee /sys/fs/cgroup/limited_memory/memory.min  # 128 MB

# memory.low - Best-effort memory protection (soft protection)
# Memory below this threshold is protected unless there is no other reclaimable memory
echo "268435456" | sudo tee /sys/fs/cgroup/limited_memory/memory.low  # 256 MB
```

### Practical Memory Control Example

```bash
#!/bin/bash
# memory_control_demo.sh - Demonstrates memory resource control with cgroups v2

CGROUP_BASE="/sys/fs/cgroup"
APP_CGROUP="${CGROUP_BASE}/memory_demo"

# Convert human-readable sizes to bytes
to_bytes() {
    local size=$1
    local number=${size%[KkMmGg]*}
    local unit=${size##*[0-9]}

    case $unit in
        K|k) echo $((number * 1024)) ;;
        M|m) echo $((number * 1024 * 1024)) ;;
        G|g) echo $((number * 1024 * 1024 * 1024)) ;;
        *)   echo $number ;;
    esac
}

# Setup memory-controlled cgroup
setup_memory_cgroup() {
    local max_memory=${1:-"512M"}
    local high_memory=${2:-"384M"}

    echo "Setting up memory-controlled cgroup..."

    # Enable memory controller
    echo "+memory" | sudo tee ${CGROUP_BASE}/cgroup.subtree_control > /dev/null

    # Create cgroup
    sudo mkdir -p ${APP_CGROUP}

    # Set memory limits
    local max_bytes=$(to_bytes $max_memory)
    local high_bytes=$(to_bytes $high_memory)

    echo $max_bytes | sudo tee ${APP_CGROUP}/memory.max > /dev/null
    echo $high_bytes | sudo tee ${APP_CGROUP}/memory.high > /dev/null

    # Enable OOM group behavior (kill all processes in cgroup on OOM)
    echo "1" | sudo tee ${APP_CGROUP}/memory.oom.group > /dev/null

    echo "Memory cgroup configured:"
    echo "  - Hard limit (memory.max): $(cat ${APP_CGROUP}/memory.max) bytes"
    echo "  - Soft limit (memory.high): $(cat ${APP_CGROUP}/memory.high) bytes"
}

# Monitor memory usage
monitor_memory() {
    echo "=== Memory Usage ==="
    echo "Current: $(cat ${APP_CGROUP}/memory.current) bytes"
    echo "Peak: $(cat ${APP_CGROUP}/memory.peak 2>/dev/null || echo 'N/A') bytes"
    echo ""
    echo "=== Memory Statistics ==="
    cat ${APP_CGROUP}/memory.stat
    echo ""
    echo "=== Memory Pressure (PSI) ==="
    cat ${APP_CGROUP}/memory.pressure
}

# Test memory allocation
test_memory_limit() {
    local alloc_size=${1:-"256M"}

    echo "Testing memory allocation of $alloc_size..."

    # Create a process that allocates memory
    (
        # This process will be moved to the cgroup
        python3 -c "
import sys
import time

# Allocate memory in chunks
chunk_size = 10 * 1024 * 1024  # 10 MB chunks
target = int(sys.argv[1])
allocated = []

print(f'Attempting to allocate {target / (1024*1024):.0f} MB...')

while sum(len(c) for c in allocated) < target:
    try:
        allocated.append(b'x' * chunk_size)
        current = sum(len(c) for c in allocated)
        print(f'Allocated: {current / (1024*1024):.0f} MB')
        time.sleep(0.5)
    except MemoryError:
        print('Memory allocation failed - limit reached!')
        break

print(f'Final allocation: {sum(len(c) for c in allocated) / (1024*1024):.0f} MB')
time.sleep(5)
" $(to_bytes $alloc_size)
    ) &

    local pid=$!
    echo $pid | sudo tee ${APP_CGROUP}/cgroup.procs > /dev/null

    echo "Process $pid moved to cgroup"
    wait $pid
}

# Cleanup
cleanup() {
    # Move processes out
    for pid in $(cat ${APP_CGROUP}/cgroup.procs 2>/dev/null); do
        echo $pid | sudo tee ${CGROUP_BASE}/cgroup.procs > /dev/null 2>&1
    done
    sudo rmdir ${APP_CGROUP} 2>/dev/null
    echo "Cleanup complete"
}

case "$1" in
    setup)
        setup_memory_cgroup "$2" "$3"
        ;;
    monitor)
        monitor_memory
        ;;
    test)
        test_memory_limit "$2"
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {setup [max] [high]|monitor|test [size]|cleanup}"
        echo "Examples:"
        echo "  $0 setup 512M 384M    # Set up with 512MB max, 384MB high"
        echo "  $0 test 256M          # Test allocating 256MB"
        echo "  $0 monitor            # Show memory statistics"
        exit 1
        ;;
esac
```

## I/O Controller: Managing Disk I/O Resources

The I/O controller allows you to control and limit disk I/O operations for processes.

### Enabling the I/O Controller

```bash
# Enable I/O controller for child cgroups
echo "+io" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Create an I/O-controlled cgroup
sudo mkdir /sys/fs/cgroup/io_test

# View available I/O control files
ls /sys/fs/cgroup/io_test/io.*
# Output:
# io.max        - Hard I/O limits per device
# io.pressure   - I/O pressure metrics (PSI)
# io.prio.class - I/O priority class
# io.stat       - I/O statistics
# io.weight     - Relative I/O weight
```

### Finding Device Major:Minor Numbers

I/O controls are applied per-device, identified by major:minor numbers.

```bash
# List block devices with their major:minor numbers
lsblk -o NAME,MAJ:MIN,SIZE,TYPE

# Example output:
# NAME    MAJ:MIN   SIZE TYPE
# sda       8:0   500G disk
# ├─sda1    8:1   512M part
# └─sda2    8:2 499.5G part
# nvme0n1 259:0   1TB  disk

# Get major:minor for a specific device
stat -c '%t:%T' /dev/sda | xargs printf '%d:%d\n'
# Or use:
cat /sys/block/sda/dev
```

### io.max: Hard I/O Limits

The `io.max` file sets absolute limits on I/O operations per device.

```bash
# Create I/O-limited cgroup
sudo mkdir -p /sys/fs/cgroup/limited_io

# Enable I/O controller
echo "+io" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Format: MAJOR:MINOR rbps=BYTES wbps=BYTES riops=OPS wiops=OPS
# - rbps: Read bytes per second
# - wbps: Write bytes per second
# - riops: Read I/O operations per second
# - wiops: Write I/O operations per second

# Limit device 8:0 (sda) to 10 MB/s read and 5 MB/s write
echo "8:0 rbps=10485760 wbps=5242880" | sudo tee /sys/fs/cgroup/limited_io/io.max

# Limit I/O operations to 100 read IOPS and 50 write IOPS
echo "8:0 riops=100 wiops=50" | sudo tee /sys/fs/cgroup/limited_io/io.max

# Combine bandwidth and IOPS limits
echo "8:0 rbps=10485760 wbps=5242880 riops=100 wiops=50" | sudo tee /sys/fs/cgroup/limited_io/io.max

# Remove limits for a device
echo "8:0 rbps=max wbps=max riops=max wiops=max" | sudo tee /sys/fs/cgroup/limited_io/io.max

# Check current settings
cat /sys/fs/cgroup/limited_io/io.max
```

### io.weight: Relative I/O Priority

The `io.weight` file sets the relative weight for I/O scheduling among sibling cgroups.

```bash
# Create sibling cgroups with different I/O priorities
sudo mkdir -p /sys/fs/cgroup/high_io
sudo mkdir -p /sys/fs/cgroup/low_io

# Enable I/O controller
echo "+io" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Weight values range from 1 to 10000, default is 100
# Set high priority I/O weight
echo "default 500" | sudo tee /sys/fs/cgroup/high_io/io.weight

# Set low priority I/O weight
echo "default 50" | sudo tee /sys/fs/cgroup/low_io/io.weight

# Set weight for a specific device
echo "8:0 200" | sudo tee /sys/fs/cgroup/high_io/io.weight

# Check I/O statistics
cat /sys/fs/cgroup/high_io/io.stat
# Output format: MAJOR:MINOR rbytes=N wbytes=N rios=N wios=N dbytes=N dios=N
```

### Practical I/O Control Example

```bash
#!/bin/bash
# io_control_demo.sh - Demonstrates I/O resource control with cgroups v2

CGROUP_BASE="/sys/fs/cgroup"
IO_CGROUP="${CGROUP_BASE}/io_demo"

# Get the major:minor number for a device
get_device_id() {
    local device=$1
    cat /sys/block/${device}/dev 2>/dev/null || echo ""
}

# Setup I/O-controlled cgroup
setup_io_cgroup() {
    local device=${1:-"sda"}
    local read_limit=${2:-"10485760"}   # 10 MB/s default
    local write_limit=${3:-"5242880"}   # 5 MB/s default

    echo "Setting up I/O-controlled cgroup..."

    # Enable I/O controller
    echo "+io" | sudo tee ${CGROUP_BASE}/cgroup.subtree_control > /dev/null

    # Create cgroup
    sudo mkdir -p ${IO_CGROUP}

    # Get device ID
    local dev_id=$(get_device_id $device)
    if [ -z "$dev_id" ]; then
        echo "Error: Device $device not found"
        return 1
    fi

    echo "Configuring I/O limits for device $device ($dev_id)"

    # Set I/O bandwidth limits
    echo "$dev_id rbps=$read_limit wbps=$write_limit" | sudo tee ${IO_CGROUP}/io.max > /dev/null

    # Set I/O weight
    echo "default 100" | sudo tee ${IO_CGROUP}/io.weight > /dev/null

    echo "I/O cgroup configured:"
    echo "  - Device: $device ($dev_id)"
    echo "  - Read limit: $((read_limit / 1024 / 1024)) MB/s"
    echo "  - Write limit: $((write_limit / 1024 / 1024)) MB/s"
    echo "  - io.max: $(cat ${IO_CGROUP}/io.max)"
}

# Test I/O throughput
test_io_throughput() {
    local test_file=${1:-"/tmp/io_test_file"}
    local size_mb=${2:-"100"}

    echo "Testing I/O throughput..."

    # Run dd in the cgroup
    (
        dd if=/dev/zero of=$test_file bs=1M count=$size_mb oflag=direct 2>&1
    ) &

    local pid=$!
    echo $pid | sudo tee ${IO_CGROUP}/cgroup.procs > /dev/null

    echo "Process $pid moved to cgroup"

    # Monitor I/O while test runs
    while kill -0 $pid 2>/dev/null; do
        echo "I/O stats: $(cat ${IO_CGROUP}/io.stat | head -1)"
        sleep 1
    done

    wait $pid
    rm -f $test_file
}

# Monitor I/O
monitor_io() {
    echo "=== I/O Configuration ==="
    echo "io.max: $(cat ${IO_CGROUP}/io.max)"
    echo "io.weight: $(cat ${IO_CGROUP}/io.weight)"
    echo ""
    echo "=== I/O Statistics ==="
    cat ${IO_CGROUP}/io.stat
    echo ""
    echo "=== I/O Pressure (PSI) ==="
    cat ${IO_CGROUP}/io.pressure
}

# Cleanup
cleanup() {
    for pid in $(cat ${IO_CGROUP}/cgroup.procs 2>/dev/null); do
        echo $pid | sudo tee ${CGROUP_BASE}/cgroup.procs > /dev/null 2>&1
    done
    sudo rmdir ${IO_CGROUP} 2>/dev/null
    echo "Cleanup complete"
}

case "$1" in
    setup)
        setup_io_cgroup "$2" "$3" "$4"
        ;;
    test)
        test_io_throughput "$2" "$3"
        ;;
    monitor)
        monitor_io
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {setup [device] [read_bps] [write_bps]|test [file] [size_mb]|monitor|cleanup}"
        exit 1
        ;;
esac
```

## PID Controller: Limiting Process Count

The PID controller limits the number of processes that can be created in a cgroup, preventing fork bombs and resource exhaustion.

### Enabling the PID Controller

```bash
# Enable PID controller for child cgroups
echo "+pids" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Create a PID-limited cgroup
sudo mkdir /sys/fs/cgroup/pid_test

# View available PID control files
ls /sys/fs/cgroup/pid_test/pids.*
# Output:
# pids.current  - Current number of processes
# pids.events   - Event counters (including max reached)
# pids.max      - Maximum number of processes allowed
# pids.peak     - Peak number of processes (if available)
```

### Setting Process Limits

```bash
# Create a cgroup with process limits
sudo mkdir -p /sys/fs/cgroup/limited_pids

# Enable PID controller
echo "+pids" | sudo tee /sys/fs/cgroup/cgroup.subtree_control

# Limit to 100 processes
echo "100" | sudo tee /sys/fs/cgroup/limited_pids/pids.max

# Check current process count
cat /sys/fs/cgroup/limited_pids/pids.current

# Remove the limit
echo "max" | sudo tee /sys/fs/cgroup/limited_pids/pids.max

# Check for limit-reached events
cat /sys/fs/cgroup/limited_pids/pids.events
# Output: max N   (N is the number of times the limit was hit)
```

### Practical PID Control Example

```bash
#!/bin/bash
# pid_control_demo.sh - Demonstrates PID limits with cgroups v2

CGROUP_BASE="/sys/fs/cgroup"
PID_CGROUP="${CGROUP_BASE}/pid_demo"

# Setup PID-limited cgroup
setup_pid_cgroup() {
    local max_pids=${1:-"50"}

    echo "Setting up PID-limited cgroup (max: $max_pids processes)..."

    # Enable PID controller
    echo "+pids" | sudo tee ${CGROUP_BASE}/cgroup.subtree_control > /dev/null

    # Create cgroup
    sudo mkdir -p ${PID_CGROUP}

    # Set PID limit
    echo $max_pids | sudo tee ${PID_CGROUP}/pids.max > /dev/null

    echo "PID cgroup configured:"
    echo "  - Maximum PIDs: $(cat ${PID_CGROUP}/pids.max)"
    echo "  - Current PIDs: $(cat ${PID_CGROUP}/pids.current)"
}

# Test fork bomb protection
test_fork_protection() {
    echo "Testing fork bomb protection..."
    echo "Attempting to create many processes (this should be limited)..."

    # Run a controlled fork test
    (
        for i in $(seq 1 100); do
            sleep 60 &
            if [ $? -ne 0 ]; then
                echo "Fork failed at process $i (limit reached)"
                break
            fi
        done

        echo "Created processes, waiting..."
        jobs -l | wc -l

        # Kill all background jobs
        jobs -p | xargs kill 2>/dev/null
    ) &

    local pid=$!
    echo $pid | sudo tee ${PID_CGROUP}/cgroup.procs > /dev/null

    wait $pid

    echo ""
    echo "Final statistics:"
    echo "  - Current PIDs: $(cat ${PID_CGROUP}/pids.current)"
    echo "  - Events: $(cat ${PID_CGROUP}/pids.events)"
}

# Monitor PIDs
monitor_pids() {
    echo "=== PID Statistics ==="
    echo "Maximum allowed: $(cat ${PID_CGROUP}/pids.max)"
    echo "Current count: $(cat ${PID_CGROUP}/pids.current)"
    echo "Events: $(cat ${PID_CGROUP}/pids.events)"
    echo ""
    echo "=== Processes in cgroup ==="
    cat ${PID_CGROUP}/cgroup.procs | head -20
}

# Cleanup
cleanup() {
    # Kill all processes in the cgroup
    for pid in $(cat ${PID_CGROUP}/cgroup.procs 2>/dev/null); do
        kill $pid 2>/dev/null
    done
    sleep 1

    # Move remaining processes out
    for pid in $(cat ${PID_CGROUP}/cgroup.procs 2>/dev/null); do
        echo $pid | sudo tee ${CGROUP_BASE}/cgroup.procs > /dev/null 2>&1
    done

    sudo rmdir ${PID_CGROUP} 2>/dev/null
    echo "Cleanup complete"
}

case "$1" in
    setup)
        setup_pid_cgroup "$2"
        ;;
    test)
        test_fork_protection
        ;;
    monitor)
        monitor_pids
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {setup [max_pids]|test|monitor|cleanup}"
        exit 1
        ;;
esac
```

## Creating and Managing cgroups Manually

Here is a comprehensive guide to creating and managing cgroups manually from the command line.

### Complete Manual Setup Example

```bash
#!/bin/bash
# manual_cgroup_setup.sh - Complete manual cgroup v2 setup

CGROUP_ROOT="/sys/fs/cgroup"
APP_NAME="myapplication"
APP_CGROUP="${CGROUP_ROOT}/${APP_NAME}"

# Step 1: Verify cgroups v2 is active
verify_cgroupv2() {
    local fs_type=$(stat -fc %T ${CGROUP_ROOT})
    if [ "$fs_type" != "cgroup2fs" ]; then
        echo "Error: cgroups v2 is not enabled. Current type: $fs_type"
        echo "Please enable cgroups v2 and reboot."
        exit 1
    fi
    echo "cgroups v2 verified: $fs_type"
}

# Step 2: Enable required controllers at root
enable_controllers() {
    echo "Enabling controllers at root level..."

    # Check available controllers
    local available=$(cat ${CGROUP_ROOT}/cgroup.controllers)
    echo "Available controllers: $available"

    # Enable controllers for subtree
    echo "+cpu +memory +io +pids" | sudo tee ${CGROUP_ROOT}/cgroup.subtree_control > /dev/null

    # Verify enabled controllers
    local enabled=$(cat ${CGROUP_ROOT}/cgroup.subtree_control)
    echo "Enabled controllers: $enabled"
}

# Step 3: Create cgroup hierarchy
create_hierarchy() {
    echo "Creating cgroup hierarchy for ${APP_NAME}..."

    # Create main application cgroup
    sudo mkdir -p ${APP_CGROUP}

    # Enable controllers for the application's subtree
    echo "+cpu +memory +io +pids" | sudo tee ${APP_CGROUP}/cgroup.subtree_control > /dev/null

    # Create child cgroups for different components
    sudo mkdir -p ${APP_CGROUP}/frontend
    sudo mkdir -p ${APP_CGROUP}/backend
    sudo mkdir -p ${APP_CGROUP}/worker

    echo "Hierarchy created:"
    tree ${APP_CGROUP}
}

# Step 4: Configure resource limits
configure_limits() {
    echo "Configuring resource limits..."

    # Frontend: Light resources (web serving)
    echo "50000 100000" | sudo tee ${APP_CGROUP}/frontend/cpu.max > /dev/null      # 50% CPU
    echo "268435456" | sudo tee ${APP_CGROUP}/frontend/memory.max > /dev/null       # 256 MB
    echo "50" | sudo tee ${APP_CGROUP}/frontend/pids.max > /dev/null                # 50 processes

    # Backend: Medium resources (API processing)
    echo "100000 100000" | sudo tee ${APP_CGROUP}/backend/cpu.max > /dev/null       # 100% CPU (1 core)
    echo "536870912" | sudo tee ${APP_CGROUP}/backend/memory.max > /dev/null        # 512 MB
    echo "100" | sudo tee ${APP_CGROUP}/backend/pids.max > /dev/null                # 100 processes

    # Worker: Heavy resources (background jobs)
    echo "200000 100000" | sudo tee ${APP_CGROUP}/worker/cpu.max > /dev/null        # 200% CPU (2 cores)
    echo "1073741824" | sudo tee ${APP_CGROUP}/worker/memory.max > /dev/null        # 1 GB
    echo "200" | sudo tee ${APP_CGROUP}/worker/pids.max > /dev/null                 # 200 processes

    echo "Resource limits configured"
}

# Step 5: Move processes to cgroups
move_process() {
    local pid=$1
    local component=$2

    if [ -z "$pid" ] || [ -z "$component" ]; then
        echo "Usage: move_process <pid> <component>"
        return 1
    fi

    local target="${APP_CGROUP}/${component}/cgroup.procs"

    if [ ! -f "$target" ]; then
        echo "Error: Component $component does not exist"
        return 1
    fi

    echo $pid | sudo tee $target > /dev/null
    echo "Process $pid moved to ${APP_NAME}/${component}"
}

# Step 6: Monitor resource usage
monitor_all() {
    echo "=========================================="
    echo "Resource Usage for ${APP_NAME}"
    echo "=========================================="

    for component in frontend backend worker; do
        local cg="${APP_CGROUP}/${component}"
        if [ -d "$cg" ]; then
            echo ""
            echo "--- ${component} ---"
            echo "Processes: $(cat ${cg}/cgroup.procs | wc -l)"
            echo "CPU: $(cat ${cg}/cpu.stat | grep usage_usec | awk '{print $2}') usec"
            echo "Memory: $(cat ${cg}/memory.current) bytes"
            echo "PIDs: $(cat ${cg}/pids.current) / $(cat ${cg}/pids.max)"
        fi
    done
}

# Step 7: Cleanup cgroups
cleanup_all() {
    echo "Cleaning up cgroups..."

    # Move all processes back to root
    for component in frontend backend worker; do
        local cg="${APP_CGROUP}/${component}"
        if [ -d "$cg" ]; then
            for pid in $(cat ${cg}/cgroup.procs 2>/dev/null); do
                echo $pid | sudo tee ${CGROUP_ROOT}/cgroup.procs > /dev/null 2>&1
            done
        fi
    done

    # Remove cgroups (must be empty and have no children)
    for component in frontend backend worker; do
        sudo rmdir ${APP_CGROUP}/${component} 2>/dev/null
    done
    sudo rmdir ${APP_CGROUP} 2>/dev/null

    echo "Cleanup complete"
}

# Main execution
case "$1" in
    setup)
        verify_cgroupv2
        enable_controllers
        create_hierarchy
        configure_limits
        echo ""
        echo "Setup complete! Use '$0 move <pid> <component>' to assign processes"
        ;;
    move)
        move_process "$2" "$3"
        ;;
    monitor)
        monitor_all
        ;;
    cleanup)
        cleanup_all
        ;;
    *)
        echo "Usage: $0 {setup|move <pid> <component>|monitor|cleanup}"
        echo ""
        echo "Components: frontend, backend, worker"
        exit 1
        ;;
esac
```

## Using systemd for cgroup Management

systemd provides a higher-level interface for managing cgroups through units (services, slices, and scopes).

### Understanding systemd Slices

systemd organizes cgroups into a hierarchy of slices:

```
-.slice (root slice)
├── user.slice           # User sessions
│   └── user-1000.slice  # Specific user
├── system.slice         # System services
│   ├── nginx.service
│   └── postgresql.service
└── machine.slice        # Virtual machines and containers
```

### Creating a Custom Slice

```ini
# /etc/systemd/system/myapp.slice
[Unit]
Description=My Application Slice
Documentation=https://example.com/docs
Before=slices.target

[Slice]
# CPU limits
CPUQuota=200%           # Maximum 2 CPU cores
CPUWeight=100           # Default weight for fair scheduling

# Memory limits
MemoryMax=2G            # Hard limit
MemoryHigh=1536M        # Throttling threshold
MemorySwapMax=512M      # Swap limit

# I/O limits
IOWeight=100            # Default I/O weight

# PID limits
TasksMax=500            # Maximum number of tasks

[Install]
WantedBy=multi-user.target
```

### Creating a systemd Service with Resource Limits

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=myapp
Group=myapp
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/bin/start.sh
ExecStop=/opt/myapp/bin/stop.sh
Restart=on-failure
RestartSec=5

# Place in custom slice
Slice=myapp.slice

# CPU resource control
CPUQuota=100%                    # Limit to 1 CPU core (100%)
CPUWeight=80                     # Slightly lower priority than default

# Memory resource control
MemoryMax=512M                   # Hard memory limit
MemoryHigh=384M                  # Start throttling at 384M
MemorySwapMax=128M               # Limit swap usage

# I/O resource control
IOWeight=50                      # Lower I/O priority
IOReadBandwidthMax=/dev/sda 50M  # Max 50 MB/s read
IOWriteBandwidthMax=/dev/sda 25M # Max 25 MB/s write

# Process limits
TasksMax=100                     # Maximum 100 processes/threads

# Additional security and resource settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

### Managing systemd Resource Controls

```bash
# Reload systemd configuration after changes
sudo systemctl daemon-reload

# Start and enable the service
sudo systemctl start myapp.service
sudo systemctl enable myapp.service

# View current resource usage
systemctl status myapp.service

# Show detailed resource information
systemd-cgtop

# Show cgroup hierarchy
systemd-cgls

# Show specific slice/service cgroup
systemd-cgls /system.slice/myapp.service

# Runtime resource adjustment (temporary, until restart)
sudo systemctl set-property myapp.service CPUQuota=150%
sudo systemctl set-property myapp.service MemoryMax=768M

# Make runtime changes permanent
sudo systemctl set-property --runtime=false myapp.service CPUQuota=150%

# Show all resource properties
systemctl show myapp.service | grep -E '^(CPU|Memory|IO|Tasks)'
```

### systemd Transient Units (Runtime cgroups)

Create temporary cgroups for one-off commands:

```bash
# Run a command with resource limits using systemd-run
sudo systemd-run --scope \
    --property=CPUQuota=50% \
    --property=MemoryMax=256M \
    --property=TasksMax=10 \
    -- /path/to/command arg1 arg2

# Run as a specific user
sudo systemd-run --scope --uid=myuser --gid=mygroup \
    --property=CPUQuota=100% \
    --property=MemoryMax=512M \
    -- ./my_script.sh

# Create a named scope for easier management
sudo systemd-run --scope --unit=my-task \
    --property=CPUQuota=200% \
    --property=MemoryMax=1G \
    -- make -j4

# Monitor the transient unit
systemctl status my-task.scope
journalctl -u my-task.scope
```

## Resource Delegation

Resource delegation allows non-root users to manage cgroups within a delegated subtree.

### Understanding Delegation

By default, only root can create and manage cgroups. Delegation allows systemd to grant cgroup management permissions to unprivileged users.

```bash
# Check if delegation is enabled for the current user
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/cgroup.controllers

# Check subtree control
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/cgroup.subtree_control
```

### Enabling Delegation via systemd

Create a user service that enables delegation:

```ini
# ~/.config/systemd/user/delegate.slice
[Unit]
Description=Delegated Slice for User Cgroups

[Slice]
# Request delegation of controllers
Delegate=yes

# Enable specific controllers
CPUWeight=100
MemoryMax=4G
TasksMax=1000
```

Or enable delegation system-wide for user sessions:

```ini
# /etc/systemd/system/user@.service.d/delegate.conf
[Service]
Delegate=cpu memory io pids
```

### Using Delegated cgroups

```bash
#!/bin/bash
# user_cgroup_demo.sh - Managing user-delegated cgroups

# Find the user's cgroup
USER_CGROUP="/sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service"

# Check available controllers
echo "Available controllers: $(cat ${USER_CGROUP}/cgroup.controllers)"

# Enable controllers for subtree (if delegated)
echo "+cpu +memory +pids" > ${USER_CGROUP}/cgroup.subtree_control 2>/dev/null

# Create a user-owned cgroup
mkdir -p ${USER_CGROUP}/myapp

# Configure limits (within delegated boundaries)
echo "50000 100000" > ${USER_CGROUP}/myapp/cpu.max
echo "268435456" > ${USER_CGROUP}/myapp/memory.max

# Run a process in the user cgroup
my_command &
echo $! > ${USER_CGROUP}/myapp/cgroup.procs

# Monitor usage
cat ${USER_CGROUP}/myapp/cpu.stat
cat ${USER_CGROUP}/myapp/memory.current
```

## Monitoring cgroup Usage

Effective monitoring is crucial for understanding resource utilization and identifying bottlenecks.

### Built-in Monitoring Files

```bash
# CPU statistics
cat /sys/fs/cgroup/myapp/cpu.stat
# Output:
# usage_usec N          # Total CPU time consumed
# user_usec N           # CPU time in user mode
# system_usec N         # CPU time in kernel mode
# nr_periods N          # Number of enforcement periods
# nr_throttled N        # Number of times throttled
# throttled_usec N      # Total time throttled

# Memory statistics
cat /sys/fs/cgroup/myapp/memory.stat
# Key metrics:
# anon N                # Anonymous memory
# file N                # File-backed memory
# kernel_stack N        # Kernel stack memory
# pgfault N             # Page faults
# pgmajfault N          # Major page faults

# I/O statistics
cat /sys/fs/cgroup/myapp/io.stat
# Format: MAJ:MIN rbytes=N wbytes=N rios=N wios=N

# PID statistics
cat /sys/fs/cgroup/myapp/pids.current
cat /sys/fs/cgroup/myapp/pids.events
```

### Pressure Stall Information (PSI)

PSI provides metrics about resource contention:

```bash
# CPU pressure
cat /sys/fs/cgroup/myapp/cpu.pressure
# Output:
# some avg10=0.00 avg60=0.00 avg300=0.00 total=0
# full avg10=0.00 avg60=0.00 avg300=0.00 total=0

# Memory pressure
cat /sys/fs/cgroup/myapp/memory.pressure
# Output:
# some avg10=0.00 avg60=0.00 avg300=0.00 total=0
# full avg10=0.00 avg60=0.00 avg300=0.00 total=0

# I/O pressure
cat /sys/fs/cgroup/myapp/io.pressure
# Output:
# some avg10=0.00 avg60=0.00 avg300=0.00 total=0
# full avg10=0.00 avg60=0.00 avg300=0.00 total=0

# Interpretation:
# - 'some': Percentage of time at least one task was stalled
# - 'full': Percentage of time all tasks were stalled
# - avg10/60/300: Running averages over 10s, 60s, 300s
# - total: Total stall time in microseconds
```

### Comprehensive Monitoring Script

```bash
#!/bin/bash
# cgroup_monitor.sh - Comprehensive cgroup monitoring

CGROUP_PATH=${1:-"/sys/fs/cgroup/myapp"}
INTERVAL=${2:-2}

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Format bytes to human-readable
format_bytes() {
    local bytes=$1
    if [ $bytes -ge 1073741824 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1073741824}") GB"
    elif [ $bytes -ge 1048576 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1048576}") MB"
    elif [ $bytes -ge 1024 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1024}") KB"
    else
        echo "$bytes B"
    fi
}

# Format microseconds to human-readable
format_time() {
    local usec=$1
    if [ $usec -ge 1000000 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $usec/1000000}") s"
    elif [ $usec -ge 1000 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $usec/1000}") ms"
    else
        echo "$usec us"
    fi
}

# Check if cgroup exists
if [ ! -d "$CGROUP_PATH" ]; then
    echo "Error: Cgroup $CGROUP_PATH does not exist"
    exit 1
fi

echo "Monitoring cgroup: $CGROUP_PATH"
echo "Press Ctrl+C to stop"
echo ""

# Main monitoring loop
while true; do
    clear
    echo "=========================================="
    echo "Cgroup Monitor - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Path: $CGROUP_PATH"
    echo "=========================================="

    # Process count
    if [ -f "${CGROUP_PATH}/cgroup.procs" ]; then
        proc_count=$(cat ${CGROUP_PATH}/cgroup.procs | wc -l)
        echo -e "\n${GREEN}[Processes]${NC}"
        echo "  Count: $proc_count"
    fi

    # CPU statistics
    if [ -f "${CGROUP_PATH}/cpu.stat" ]; then
        echo -e "\n${GREEN}[CPU]${NC}"

        usage=$(grep "usage_usec" ${CGROUP_PATH}/cpu.stat | awk '{print $2}')
        throttled=$(grep "throttled_usec" ${CGROUP_PATH}/cpu.stat | awk '{print $2}')
        nr_throttled=$(grep "nr_throttled" ${CGROUP_PATH}/cpu.stat | awk '{print $2}')

        echo "  Usage: $(format_time ${usage:-0})"
        echo "  Throttled: $(format_time ${throttled:-0}) (${nr_throttled:-0} times)"

        if [ -f "${CGROUP_PATH}/cpu.max" ]; then
            echo "  Limit: $(cat ${CGROUP_PATH}/cpu.max)"
        fi

        # CPU pressure
        if [ -f "${CGROUP_PATH}/cpu.pressure" ]; then
            pressure=$(grep "some" ${CGROUP_PATH}/cpu.pressure | awk '{print $2}' | cut -d= -f2)
            if [ $(echo "$pressure > 10" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
                echo -e "  Pressure: ${RED}${pressure}%${NC}"
            else
                echo "  Pressure: ${pressure}%"
            fi
        fi
    fi

    # Memory statistics
    if [ -f "${CGROUP_PATH}/memory.current" ]; then
        echo -e "\n${GREEN}[Memory]${NC}"

        current=$(cat ${CGROUP_PATH}/memory.current)
        echo "  Current: $(format_bytes $current)"

        if [ -f "${CGROUP_PATH}/memory.max" ]; then
            max=$(cat ${CGROUP_PATH}/memory.max)
            if [ "$max" != "max" ]; then
                pct=$(awk "BEGIN {printf \"%.1f\", ($current/$max)*100}")
                echo "  Maximum: $(format_bytes $max)"
                if [ $(echo "$pct > 80" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
                    echo -e "  Utilization: ${RED}${pct}%${NC}"
                elif [ $(echo "$pct > 60" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
                    echo -e "  Utilization: ${YELLOW}${pct}%${NC}"
                else
                    echo "  Utilization: ${pct}%"
                fi
            else
                echo "  Maximum: unlimited"
            fi
        fi

        # Memory pressure
        if [ -f "${CGROUP_PATH}/memory.pressure" ]; then
            pressure=$(grep "some" ${CGROUP_PATH}/memory.pressure | awk '{print $2}' | cut -d= -f2)
            echo "  Pressure: ${pressure}%"
        fi
    fi

    # I/O statistics
    if [ -f "${CGROUP_PATH}/io.stat" ]; then
        echo -e "\n${GREEN}[I/O]${NC}"

        while read line; do
            if [ -n "$line" ]; then
                device=$(echo $line | awk '{print $1}')
                rbytes=$(echo $line | grep -o 'rbytes=[0-9]*' | cut -d= -f2)
                wbytes=$(echo $line | grep -o 'wbytes=[0-9]*' | cut -d= -f2)
                echo "  Device $device:"
                echo "    Read: $(format_bytes ${rbytes:-0})"
                echo "    Write: $(format_bytes ${wbytes:-0})"
            fi
        done < ${CGROUP_PATH}/io.stat

        # I/O pressure
        if [ -f "${CGROUP_PATH}/io.pressure" ]; then
            pressure=$(grep "some" ${CGROUP_PATH}/io.pressure | awk '{print $2}' | cut -d= -f2)
            echo "  Pressure: ${pressure}%"
        fi
    fi

    # PID statistics
    if [ -f "${CGROUP_PATH}/pids.current" ]; then
        echo -e "\n${GREEN}[PIDs]${NC}"

        current=$(cat ${CGROUP_PATH}/pids.current)
        echo "  Current: $current"

        if [ -f "${CGROUP_PATH}/pids.max" ]; then
            max=$(cat ${CGROUP_PATH}/pids.max)
            echo "  Maximum: $max"
            if [ "$max" != "max" ]; then
                pct=$(awk "BEGIN {printf \"%.1f\", ($current/$max)*100}")
                echo "  Utilization: ${pct}%"
            fi
        fi

        if [ -f "${CGROUP_PATH}/pids.events" ]; then
            max_events=$(grep "max" ${CGROUP_PATH}/pids.events | awk '{print $2}')
            if [ "${max_events:-0}" -gt 0 ]; then
                echo -e "  ${RED}Limit reached: $max_events times${NC}"
            fi
        fi
    fi

    echo -e "\n------------------------------------------"
    echo "Refreshing every ${INTERVAL}s..."

    sleep $INTERVAL
done
```

### Using systemd Tools for Monitoring

```bash
# Real-time cgroup resource usage
systemd-cgtop

# Show cgroup hierarchy as a tree
systemd-cgls

# Show hierarchy for specific slice
systemd-cgls /system.slice

# Detailed information about a service's cgroup
systemctl show myapp.service --property=ControlGroup
systemctl show myapp.service --property=MemoryCurrent
systemctl show myapp.service --property=CPUUsageNSec

# Resource usage statistics
systemctl status myapp.service

# Journal entries with resource-related messages
journalctl -u myapp.service | grep -E "(memory|cpu|oom)"
```

## Container Integration

Containers (Docker, Podman, LXC) use cgroups for resource isolation. Understanding cgroups helps you configure container resources effectively.

### Docker and cgroups v2

```bash
# Check if Docker is using cgroups v2
docker info | grep -i cgroup
# Output: Cgroup Driver: systemd
#         Cgroup Version: 2

# Run a container with resource limits
docker run -d \
    --name myapp \
    --cpus="1.5" \
    --memory="512m" \
    --memory-swap="768m" \
    --pids-limit=100 \
    --blkio-weight=500 \
    myimage:latest

# View container's cgroup location
docker inspect myapp --format '{{.HostConfig.CgroupParent}}'

# Check container resource usage
docker stats myapp

# View the cgroup files directly
CONTAINER_ID=$(docker inspect myapp --format '{{.Id}}')
ls /sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope/
```

### Docker Compose with Resource Limits

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    image: nginx:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
          pids: 50
        reservations:
          cpus: '0.25'
          memory: 128M
    # For non-swarm mode, use these instead:
    # cpus: '0.5'
    # mem_limit: 256m
    # mem_reservation: 128m
    # pids_limit: 50

  api:
    image: myapi:latest
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M

  worker:
    image: myworker:latest
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 2G
          pids: 200
        reservations:
          cpus: '2'
          memory: 1G
```

### Podman and cgroups v2

Podman has native cgroups v2 support and can run rootless containers:

```bash
# Run a rootless container with resource limits
podman run -d \
    --name myapp \
    --cpus=1 \
    --memory=512m \
    --pids-limit=100 \
    myimage:latest

# View cgroup information
podman inspect myapp --format '{{.HostConfig.CgroupParent}}'

# For rootless containers, cgroups are in user slice
ls /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/

# Monitor container resources
podman stats myapp
```

### Kubernetes Resource Management

Kubernetes uses cgroups for pod resource management:

```yaml
# pod-with-resources.yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-demo
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      # Requests: Guaranteed minimum resources
      requests:
        cpu: "500m"        # 0.5 CPU cores
        memory: "256Mi"    # 256 MiB
      # Limits: Maximum allowed resources
      limits:
        cpu: "1000m"       # 1 CPU core
        memory: "512Mi"    # 512 MiB
```

### Viewing Container cgroups

```bash
#!/bin/bash
# container_cgroup_info.sh - Display cgroup information for containers

# For Docker containers
docker_cgroup_info() {
    local container=$1

    echo "Container: $container"

    # Get container ID
    local cid=$(docker inspect $container --format '{{.Id}}' 2>/dev/null)
    if [ -z "$cid" ]; then
        echo "Container not found"
        return 1
    fi

    # Find cgroup path
    local cgroup_path="/sys/fs/cgroup/system.slice/docker-${cid}.scope"

    if [ ! -d "$cgroup_path" ]; then
        # Try alternative path
        cgroup_path="/sys/fs/cgroup/docker/${cid}"
    fi

    if [ -d "$cgroup_path" ]; then
        echo "Cgroup path: $cgroup_path"
        echo ""
        echo "Resource Limits:"
        echo "  CPU max: $(cat ${cgroup_path}/cpu.max 2>/dev/null || echo 'N/A')"
        echo "  Memory max: $(cat ${cgroup_path}/memory.max 2>/dev/null || echo 'N/A')"
        echo "  PIDs max: $(cat ${cgroup_path}/pids.max 2>/dev/null || echo 'N/A')"
        echo ""
        echo "Current Usage:"
        echo "  Memory: $(cat ${cgroup_path}/memory.current 2>/dev/null || echo 'N/A') bytes"
        echo "  PIDs: $(cat ${cgroup_path}/pids.current 2>/dev/null || echo 'N/A')"
    else
        echo "Cgroup path not found"
    fi
}

# Usage
if [ -n "$1" ]; then
    docker_cgroup_info "$1"
else
    echo "Usage: $0 <container_name_or_id>"
fi
```

## Best Practices and Recommendations

### Design Considerations

1. **Use systemd for production**: systemd provides a robust, well-tested interface for cgroup management
2. **Plan your hierarchy**: Design your cgroup tree to match your application architecture
3. **Set memory.high before memory.max**: This allows graceful degradation before hard limits
4. **Monitor PSI metrics**: Pressure Stall Information helps identify resource contention
5. **Test limits thoroughly**: Verify behavior under load before production deployment

### Common Pitfalls to Avoid

```bash
# DON'T: Set memory.max too low without memory.high
# This can cause immediate OOM kills
echo "268435456" | sudo tee /sys/fs/cgroup/myapp/memory.max  # 256 MB hard limit

# DO: Set memory.high to provide a buffer
echo "536870912" | sudo tee /sys/fs/cgroup/myapp/memory.max   # 512 MB hard limit
echo "402653184" | sudo tee /sys/fs/cgroup/myapp/memory.high  # 384 MB soft limit

# DON'T: Forget to enable controllers in subtree_control
sudo mkdir /sys/fs/cgroup/parent/child
# Files like cpu.max won't exist!

# DO: Enable controllers before creating children
echo "+cpu +memory" | sudo tee /sys/fs/cgroup/parent/cgroup.subtree_control
sudo mkdir /sys/fs/cgroup/parent/child
# Now cpu.max and memory.max are available

# DON'T: Try to remove a cgroup with processes
sudo rmdir /sys/fs/cgroup/myapp  # Will fail if processes exist

# DO: Move processes first, then remove
for pid in $(cat /sys/fs/cgroup/myapp/cgroup.procs); do
    echo $pid | sudo tee /sys/fs/cgroup/cgroup.procs
done
sudo rmdir /sys/fs/cgroup/myapp
```

### Security Considerations

```bash
# Limit container escape attempts with PID limits
echo "100" | sudo tee /sys/fs/cgroup/container/pids.max

# Prevent memory-based DoS
echo "1073741824" | sudo tee /sys/fs/cgroup/untrusted/memory.max  # 1 GB

# Limit I/O to prevent storage DoS
echo "8:0 rbps=104857600 wbps=52428800" | sudo tee /sys/fs/cgroup/untrusted/io.max

# Use delegation carefully - only delegate what is necessary
# In systemd service:
# Delegate=cpu memory  # Only delegate needed controllers
```

## Troubleshooting

### Common Issues and Solutions

```bash
# Issue: "No such file or directory" when setting cgroup values
# Solution: Enable the controller in parent's subtree_control
echo "+cpu" | sudo tee /sys/fs/cgroup/parent/cgroup.subtree_control

# Issue: "Device or resource busy" when removing cgroup
# Solution: Move all processes out first
cat /sys/fs/cgroup/myapp/cgroup.procs
# Move each process to another cgroup

# Issue: cgroups v2 not available
# Solution: Check kernel version and boot parameters
uname -r  # Should be 4.5+ for basic v2 support, 5.0+ recommended
cat /proc/cmdline | grep cgroup

# Issue: Permission denied when writing to cgroup files
# Solution: Use sudo or check delegation settings
sudo -s  # Or configure proper delegation

# Issue: Memory limit not enforced
# Solution: Check if swap is enabled and set memory.swap.max
cat /sys/fs/cgroup/myapp/memory.swap.max
echo "0" | sudo tee /sys/fs/cgroup/myapp/memory.swap.max  # Disable swap
```

### Debugging Commands

```bash
# View kernel cgroup configuration
cat /proc/cgroups

# Check mounted cgroup filesystems
mount | grep cgroup

# Verify controller availability
cat /sys/fs/cgroup/cgroup.controllers

# View current cgroup of a process
cat /proc/$(pgrep -f myprocess)/cgroup

# List all cgroups
find /sys/fs/cgroup -name cgroup.procs -exec dirname {} \;

# Check for frozen cgroups
find /sys/fs/cgroup -name cgroup.freeze -exec sh -c 'echo "{}:"; cat {}' \;
```

## Conclusion

cgroups v2 provides a powerful, unified interface for managing system resources on Ubuntu. With its single hierarchy and consistent API, it simplifies resource management while providing enhanced features like Pressure Stall Information for monitoring. Whether you are managing individual processes, system services via systemd, or containerized applications, cgroups v2 gives you fine-grained control over CPU, memory, I/O, and process limits.

Key takeaways:
- Enable cgroups v2 via GRUB boot parameters for a unified resource management experience
- Use systemd for production workloads with its robust slice and service-based management
- Monitor PSI metrics to identify resource contention before it impacts performance
- Combine memory.high and memory.max for graceful degradation under memory pressure
- Integrate with container runtimes like Docker and Podman for consistent resource isolation

For monitoring your cgroups-managed applications and ensuring optimal resource utilization, consider using [OneUptime](https://oneuptime.com). OneUptime provides comprehensive monitoring capabilities that can help you track resource usage, set up alerts for resource constraints, and ensure your applications are performing optimally within their allocated resources. With OneUptime's monitoring dashboards, you can visualize cgroup metrics, detect anomalies, and respond to resource issues before they impact your users.
