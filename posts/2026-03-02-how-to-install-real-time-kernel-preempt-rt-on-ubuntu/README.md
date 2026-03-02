# How to Install Real-Time Kernel (PREEMPT_RT) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Real-Time, PREEMPT_RT, Kernel, Linux

Description: Install the PREEMPT_RT real-time kernel on Ubuntu for deterministic, low-latency workloads including industrial control, audio production, and robotics.

---

The standard Linux kernel is designed for high throughput, not deterministic latency. For applications that require guaranteed response times - CNC machines, robotics, audio processing, telecommunications, and financial trading systems - the PREEMPT_RT patch set transforms Linux into a hard real-time operating system by making nearly all kernel code preemptible.

Starting with kernel 6.x, PREEMPT_RT was merged into the mainline Linux kernel, which means Ubuntu's kernel packages now include RT support. This guide covers multiple installation methods.

## Prerequisites

- Ubuntu 22.04 LTS or 24.04 LTS
- Basic understanding of kernel and boot concepts
- Root or sudo access
- A backup or snapshot of your system before making kernel changes

## Understanding PREEMPT_RT

The standard kernel has sections of code that cannot be interrupted (non-preemptible). This causes occasional high-latency spikes even under low load. PREEMPT_RT addresses this by:

- Converting spinlocks to mutexes that can be preempted
- Making interrupt handlers run in kernel threads (allowing them to be scheduled)
- Making the high-resolution timer subsystem the primary timer source
- Reducing and eliminating raw spinlock sections

The result is worst-case latencies in the microseconds rather than milliseconds.

## Method 1: Ubuntu Low-Latency Kernel (Easiest)

Ubuntu ships a low-latency kernel that provides improved responsiveness though it is not a full PREEMPT_RT kernel:

```bash
# Install the Ubuntu low-latency kernel
sudo apt update
sudo apt install -y linux-lowlatency

# For Ubuntu 22.04, this installs the lowlatency variant
# Check what is available
apt search linux-lowlatency

# Reboot into the new kernel
sudo reboot

# After reboot, verify
uname -r
# Output should contain "lowlatency"
```

## Method 2: Ubuntu Real-Time Kernel (Recommended for Production)

Ubuntu Pro provides a PREEMPT_RT kernel via the real-time enablement stack:

```bash
# Attach to Ubuntu Pro (free for personal use on up to 5 machines)
sudo pro attach <YOUR_UBUNTU_PRO_TOKEN>

# Enable the real-time kernel
sudo pro enable realtime-kernel

# Or for Ubuntu 24.04, enable explicitly
sudo pro enable realtime-kernel --variant generic

# Reboot to apply
sudo reboot

# Verify after reboot
uname -r
# Output: 6.8.0-1003-realtime or similar
# Look for PREEMPT_RT in /proc/version
cat /proc/version | grep PREEMPT_RT
```

## Method 3: Building PREEMPT_RT Kernel from Source

For systems without Ubuntu Pro access or when you need full customization:

```bash
# Install build dependencies
sudo apt update
sudo apt install -y build-essential libncurses-dev bison flex libssl-dev \
  libelf-dev bc dwarves zstd pahole

# Get the current kernel version
KERNEL_VERSION=$(uname -r | cut -d'-' -f1)
echo "Current kernel: $KERNEL_VERSION"

# Download kernel source from kernel.org
# Check https://www.kernel.org/pub/linux/kernel/v6.x/ for RT patches
KERNEL_MAJOR=6.8
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-${KERNEL_MAJOR}.tar.xz
tar -xf linux-${KERNEL_MAJOR}.tar.xz
cd linux-${KERNEL_MAJOR}

# Download the corresponding RT patch
# Check https://mirrors.edge.kernel.org/pub/linux/kernel/projects/rt/
RT_PATCH=patch-6.8-rt8.patch.xz
wget https://mirrors.edge.kernel.org/pub/linux/kernel/projects/rt/6.8/${RT_PATCH}

# Apply the RT patch
xzcat ../${RT_PATCH} | patch -p1

# Start with current kernel config
cp /boot/config-$(uname -r) .config
make olddefconfig
```

Enable PREEMPT_RT in the kernel configuration:

```bash
# Open menuconfig
make menuconfig

# Navigate to:
# General Setup -> Preemption Model
# Select: Fully Preemptible Kernel (Real-Time)
# Save and exit
```

Or set it via command line:

```bash
# Enable full preemption via scripts
scripts/config --enable PREEMPT_RT
scripts/config --enable HZ_1000
scripts/config --set-val HZ 1000
make olddefconfig
```

Build and install:

```bash
# Build the kernel (use -j to parallelize, match your core count)
make -j$(nproc) deb-pkg LOCALVERSION=-rt

# Install the generated .deb packages
sudo dpkg -i ../linux-image-*.deb ../linux-headers-*.deb

# Update GRUB
sudo update-grub

# Reboot into the new kernel
sudo reboot
```

## Verifying the RT Kernel

After rebooting:

```bash
# Check the kernel version
uname -r
# Should contain "rt" or show PREEMPT_RT in the build info

# Verify PREEMPT_RT is active
grep PREEMPT /boot/config-$(uname -r)
# Expected: CONFIG_PREEMPT_RT=y

# Check current preemption model
cat /sys/kernel/debug/sched/features 2>/dev/null | head -5

# Alternatively
zcat /proc/config.gz 2>/dev/null | grep PREEMPT || \
  cat /boot/config-$(uname -r) | grep PREEMPT
```

## Basic Latency Testing

Use `cyclictest` to measure real-time latency:

```bash
# Install rt-tests package
sudo apt install -y rt-tests

# Run a basic latency test for 60 seconds
# -t: number of threads, -p: priority, -i: interval in microseconds
sudo cyclictest -t1 -p80 -i1000 -n -l 60000

# Example output:
# T: 0 ( 1234) P:80 I:1000 C:  60000 Min:      3 Act:   5 Avg:    4 Max:     28

# The "Max" value is the worst-case latency in microseconds
# On a well-configured RT system, this should be < 100 microseconds
```

## Keeping the RT Kernel Updated

```bash
# For the Ubuntu Pro RT kernel, updates come through the standard channels
sudo apt update && sudo apt upgrade

# Monitor for RT kernel updates
apt list --upgradable 2>/dev/null | grep realtime

# After updating, check the new kernel version
uname -r
```

## Boot Configuration

If you have multiple kernels and want to ensure the RT kernel is used:

```bash
# Check available kernels in GRUB
sudo grep -E "submenu|^menuentry" /boot/grub/grub.cfg | grep -v recovery

# Set GRUB default to the RT kernel
# Edit /etc/default/grub
sudo nano /etc/default/grub

# Set the default entry (0-indexed, or use the full menu entry name)
GRUB_DEFAULT="Advanced options for Ubuntu>Ubuntu, with Linux 6.8.0-1003-realtime"

# Update GRUB
sudo update-grub
```

## Common Issues

### High Latency Spikes Despite RT Kernel

CPU frequency scaling can cause latency spikes. Disable it:

```bash
# Check current governor
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Set to performance mode
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Make it permanent via cpufrequtils
sudo apt install -y cpufrequtils
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils
sudo systemctl restart cpufrequtils
```

### Module Compatibility Issues

Some proprietary kernel modules (Nvidia drivers, VirtualBox) may not compile against the RT kernel:

```bash
# Check if a module is available for the RT kernel
apt search nvidia | grep realtime

# Or build the module for the RT kernel
sudo apt install -y linux-headers-$(uname -r)
# Then reinstall the driver
```

The PREEMPT_RT kernel is the foundation of a real-time Linux system. After installation, additional tuning steps - CPU isolation, IRQ affinity, and disabling background services - further reduce latency. These are covered in separate guides on CPU isolation and IRQ threading.
