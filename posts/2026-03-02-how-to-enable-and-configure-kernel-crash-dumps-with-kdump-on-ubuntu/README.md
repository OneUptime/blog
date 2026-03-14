# How to Enable and Configure Kernel Crash Dumps with kdump on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Kdump, System Administration, Debugging

Description: Configure kdump on Ubuntu to capture kernel crash dumps when a system panics, enabling post-mortem analysis of kernel failures and system crashes.

---

When a production server experiences a kernel panic, you need as much information as possible to understand what went wrong. kdump is the Linux kernel crash dumping mechanism that captures a memory image of the crashed kernel so you can analyze it after the fact. This guide walks through setting up and configuring kdump on Ubuntu.

## How kdump Works

kdump uses a two-kernel approach. The primary kernel runs your workload normally. When a kernel panic occurs, kexec boots a small secondary "capture kernel" that was pre-loaded into a reserved memory region. This capture kernel is completely isolated from the crashed system's memory space, which allows it to reliably save the crash dump to disk before rebooting.

The capture kernel writes a dump file (typically `/var/crash/`) that you can then analyze with tools like `crash` to inspect the kernel state at the time of the panic.

## Prerequisites

- Ubuntu 20.04 or later
- Sufficient RAM (the capture kernel needs reserved memory - typically 128MB to 512MB)
- Disk space for crash dumps (can be large - equal to RAM in worst case)

## Installing kdump

```bash
# Install the kdump-tools package
sudo apt update
sudo apt install kdump-tools

# On some Ubuntu versions you may also want crash analysis tools
sudo apt install crash linux-crashdump

# Verify kdump service status
systemctl status kdump-tools
```

During installation, the package may prompt you about enabling kdump. Select "Yes" to enable it.

## Configuring Kernel Reserved Memory

kdump requires a reserved memory region for the capture kernel. This is configured via the `crashkernel` kernel parameter in GRUB.

```bash
# Edit GRUB configuration
sudo nano /etc/default/grub
```

Add or modify the `GRUB_CMDLINE_LINUX_DEFAULT` line:

```bash
# Reserve 512MB for the crash kernel (adjust based on your RAM)
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash crashkernel=512M"

# For systems with more than 4GB RAM, use auto sizing
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash crashkernel=auto"

# For memory-constrained systems, 256MB may be sufficient
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash crashkernel=256M"
```

Apply the GRUB change:

```bash
sudo update-grub
```

Reboot for the memory reservation to take effect:

```bash
sudo reboot
```

After rebooting, verify the reserved memory:

```bash
# Check if crash kernel memory is reserved
cat /proc/cmdline | grep crashkernel

# Verify reserved memory region
dmesg | grep -i crash
# Look for: "Reserving 512MB of memory at ..."

# Check kdump service is active
systemctl status kdump-tools
```

## Configuring kdump-tools

The main configuration file is `/etc/kdump-tools/kdump.conf` (or `/etc/default/kdump-tools` depending on Ubuntu version):

```bash
sudo nano /etc/kdump-tools/kdump.conf
```

Key configuration options:

```bash
# Where to save crash dumps
KDUMP_COREDIR="/var/crash"

# Compression (makedumpfile options)
# -c = zlib compression, -l = lzo, -s = snappy
MAKEDUMP_ARGS="-c -d 31"

# Dump level - what to include in dump
# 0 = everything, 31 = exclude zero pages and cache (recommended)
# Higher numbers = smaller dump but less information
DUMP_LEVEL=31

# Keep only this many dumps (older ones are deleted)
KDUMP_NUM_DUMPS=5

# What to do after saving the dump
# reboot, halt, poweroff, shell
KDUMP_FAIL_CMD="reboot -f"

# SSH options for remote dump (optional)
# KDUMP_SSH_USER="root"
# KDUMP_SSH_HOST="backup-server.example.com"
# KDUMP_SSH_PORT="22"
```

The `MAKEDUMP_ARGS="-c -d 31"` setting is important. Level 31 excludes zero pages and cache pages from the dump, significantly reducing dump size while preserving the information needed for crash analysis.

## Setting Up the Capture Kernel

Ubuntu's `linux-crashdump` package handles capture kernel setup automatically. Verify it's configured:

```bash
# Check that a crash kernel is configured
kdump-config show

# Expected output should include:
# DUMP_MODE:        kdump
# USE_KDUMP:        1
# KDUMP_COREDIR:    /var/crash

# Test kdump configuration without crashing
kdump-config test
```

## Testing kdump Without a Real Crash

You can trigger a controlled kernel panic to verify kdump works. Warning: this will crash and reboot your system. Only do this in a test environment or during a maintenance window.

```bash
# CAUTION: This will immediately crash the system
# Make sure you have a maintenance window and data is saved

# Method 1: Via sysrq
echo 1 > /proc/sys/kernel/sysrq
echo c > /proc/sysrq-trigger

# Method 2: Via /proc (requires root)
echo 1 > /proc/sys/kernel/panic_on_oops
# Then trigger an oops condition
```

After the system reboots, check for the dump:

```bash
# List crash dumps
ls -lh /var/crash/

# You should see a directory with timestamp
ls /var/crash/202603021045/

# Typical contents:
# dmesg.txt    - kernel messages from crash
# dump.202603021045  - the actual crash dump
```

## Analyzing a Crash Dump

Once you have a dump, use the `crash` utility to analyze it:

```bash
# Install crash if not already installed
sudo apt install crash

# Open the dump with the matching kernel's debug symbols
# The vmlinux file needs to match the crashed kernel version
sudo crash /usr/lib/debug/boot/vmlinux-$(uname -r) /var/crash/202603021045/dump.202603021045
```

Inside the crash tool:

```bash
# Show the backtrace of the crashing process
crash> bt

# Show all kernel threads and their backtraces
crash> bt -a

# Show kernel log buffer (equivalent to dmesg)
crash> log

# Show the panic message
crash> log | grep -A 20 "Kernel panic"

# Show loaded kernel modules at crash time
crash> mod

# Examine a specific memory address
crash> rd 0xffffffff81000000

# Show virtual memory info
crash> vm

# Exit crash
crash> quit
```

## Configuring Remote Crash Dumps

For critical servers, you may want crash dumps sent to a remote server over SSH:

```bash
sudo nano /etc/kdump-tools/kdump.conf
```

```bash
# Remote SSH dump configuration
KDUMP_SSH_USER="kdump"
KDUMP_SSH_HOST="192.168.1.100"
KDUMP_SSH_PORT="22"
KDUMP_COREDIR="/mnt/dumps"

# Set up SSH key for passwordless auth
# The key must be generated and deployed before this works
```

Set up the SSH key:

```bash
# Generate a key for kdump (no passphrase - required for unattended operation)
sudo ssh-keygen -t ed25519 -f /root/.ssh/kdump_key -N ""

# Copy the public key to the remote server
sudo ssh-copy-id -i /root/.ssh/kdump_key.pub kdump@192.168.1.100

# Test the connection
sudo ssh -i /root/.ssh/kdump_key kdump@192.168.1.100 echo "Connection OK"
```

## Configuring NFS for Crash Dumps

Alternatively, save dumps to an NFS share:

```bash
# In kdump.conf
NFS="nfs-server.example.com:/exports/crash-dumps"
```

The capture kernel will mount this NFS share to save the dump.

## Adjusting Dump Size

Crash dumps can be very large. Several strategies to manage this:

```bash
# More aggressive filtering (smaller dumps, less info)
MAKEDUMP_ARGS="-c -d 31"
# Level 31 = exclude zero pages, cache, user data, free pages

# Even smaller - only kernel data
MAKEDUMP_ARGS="-c -d 63"

# Check dump size after creation
du -sh /var/crash/*/dump.*

# Set automatic cleanup
KDUMP_NUM_DUMPS=3   # Keep only last 3 dumps
```

## Enabling Automatic Reboots After Panic

Configure how the system behaves after a kernel panic:

```bash
# Set via sysctl for immediate reboots
sudo nano /etc/sysctl.d/99-panic.conf
```

```bash
# Reboot 10 seconds after a kernel panic
kernel.panic = 10

# Also panic on oops (bad kernel behavior that's not a full panic)
kernel.panic_on_oops = 1
```

Apply:

```bash
sudo sysctl -p /etc/sysctl.d/99-panic.conf
```

## Troubleshooting kdump

**kdump service fails to start:**
```bash
# Check service logs
journalctl -u kdump-tools -b

# Verify crashkernel parameter is set
grep crashkernel /proc/cmdline

# Check reserved memory
dmesg | grep "Reserving"
```

**Dump not created after crash:**
```bash
# Check if capture kernel loaded correctly
kdump-config show

# Verify disk space
df -h /var/crash

# Check permissions
ls -la /var/crash
```

**System boots too slowly after enabling kdump:**
The memory reservation happens at boot and may add a few seconds. This is normal behavior.

Keeping kdump properly configured on production systems gives you the forensic capability to understand kernel failures after they happen - invaluable for diagnosing intermittent hardware issues, driver bugs, and memory corruption problems.
