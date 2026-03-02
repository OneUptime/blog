# How to Configure CPU Frequency Scaling on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CPU, Performance, Power Management, Server

Description: A guide to understanding and configuring CPU frequency scaling governors on Ubuntu Server to optimize for performance, power savings, or balanced operation.

---

CPU frequency scaling lets the kernel dynamically adjust processor clock speed based on workload. On servers, this is often configured incorrectly - either throttling performance when you need it or wasting power when the server is idle. Understanding the available governors and how to configure them makes a meaningful difference for both performance-sensitive and power-conscious workloads.

## How CPU Frequency Scaling Works

Modern CPUs can operate at different frequencies. The Linux kernel's `cpufreq` subsystem manages this through:

- **Governor** - the policy that decides when to increase or decrease frequency
- **Scaling driver** - the hardware interface for setting frequency (intel_pstate, acpi-cpufreq, etc.)
- **Frequency range** - minimum and maximum frequencies the CPU can operate at

The governor is the key decision-maker. Different governors optimize for different goals.

## Checking Current CPU Frequency Configuration

```bash
# Install cpufrequtils for easy management
sudo apt install -y cpufrequtils linux-tools-common linux-tools-$(uname -r)

# Show current frequency information for all CPUs
cpufreq-info

# Show CPU frequency in real time
watch -n1 grep MHz /proc/cpuinfo

# Show minimum and maximum frequencies
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq

# Show available governors
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors

# Show active governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Show scaling driver in use
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver
```

## Available CPU Governors

### performance

Runs the CPU at maximum frequency at all times. Use this for latency-sensitive applications where you want consistent, maximum performance.

```bash
# Set performance governor on all CPUs
sudo cpupower frequency-set -g performance

# Verify
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

### powersave

Runs the CPU at minimum frequency. Saves power but hurts performance. Rarely appropriate for servers unless running cool idle workloads.

```bash
sudo cpupower frequency-set -g powersave
```

### ondemand

Dynamically scales frequency based on CPU usage. Ramps up quickly when load increases, scales down during idle periods. A reasonable default for general server workloads.

```bash
sudo cpupower frequency-set -g ondemand
```

### conservative

Similar to ondemand but scales frequency more gradually. Better for workloads with gradual load increases.

```bash
sudo cpupower frequency-set -g conservative
```

### schedutil

Uses the Linux scheduler's CPU utilization data to make scaling decisions. More accurate and responsive than ondemand for modern kernels (5.x+). Recommended default for general workloads.

```bash
sudo cpupower frequency-set -g schedutil
```

## Intel-Specific: intel_pstate Driver

Intel CPUs often use the `intel_pstate` driver instead of the generic `acpi-cpufreq` driver. Check which is active:

```bash
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver
# intel_pstate  or  acpi-cpufreq  or  intel_cpufreq
```

With `intel_pstate`, available governors are limited to `performance` and `powersave`. The driver handles internal frequency optimization within these policies.

```bash
# Check intel_pstate status
cat /sys/devices/system/cpu/intel_pstate/status
# active, passive, or off

# Check if Turbo Boost is enabled
cat /sys/devices/system/cpu/intel_pstate/no_turbo
# 0 = Turbo enabled, 1 = Turbo disabled

# Disable Turbo Boost for consistent performance
echo 1 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo

# Enable Turbo Boost
echo 0 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo
```

## Setting the Governor Persistently

Changes made with `cpupower` don't survive a reboot. Make them persistent:

### Method 1: cpufrequtils Configuration

```bash
# Edit the cpufrequtils config file
sudo tee /etc/default/cpufrequtils << 'EOF'
# CPU frequency scaling settings
GOVERNOR="performance"
MIN_SPEED=0
MAX_SPEED=0
EOF

# Enable and restart the service
sudo systemctl enable cpufrequtils
sudo systemctl restart cpufrequtils

# Verify
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

### Method 2: systemd Service

Create a one-shot systemd service that sets the governor on every boot:

```bash
sudo tee /etc/systemd/system/cpufreq-governor.service << 'EOF'
[Unit]
Description=Set CPU frequency governor
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/bin/cpupower frequency-set -g performance
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now cpufreq-governor.service
```

### Method 3: Kernel Boot Parameter

Set the default governor via kernel parameter in GRUB:

```bash
sudo nano /etc/default/grub

# Add governor to GRUB_CMDLINE_LINUX
GRUB_CMDLINE_LINUX="cpufreq.default_governor=performance"

# Or for intel systems
GRUB_CMDLINE_LINUX="intel_pstate=passive cpufreq.default_governor=performance"

sudo update-grub
sudo reboot
```

## Setting Frequency Limits

Restrict the range of frequencies the CPU can use:

```bash
# Set minimum and maximum frequency (values in kHz)
# First check available frequencies
cpufreq-info -l

# Set a specific frequency range
sudo cpupower frequency-set \
    --min 2000000 \   # 2 GHz minimum
    --max 3000000     # 3 GHz maximum

# Lock to a specific frequency (min = max)
sudo cpupower frequency-set \
    --min 2800000 \
    --max 2800000

# Reset to full range
sudo cpupower frequency-set \
    --min $(cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_min_freq) \
    --max $(cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq)
```

## Monitoring CPU Frequency in Production

```bash
# Install turbostat for detailed Intel CPU monitoring
sudo apt install -y linux-tools-$(uname -r) linux-tools-common

# Real-time frequency and power data per core
sudo turbostat --interval 1

# Monitor frequency changes with cpupower
watch -n0.5 cpupower monitor

# Use perf for frequency statistics
sudo perf stat -a sleep 5 2>&1 | grep MHz

# Log frequency over time
for i in $(seq 1 60); do
    echo "$(date) $(cat /proc/cpuinfo | grep 'MHz' | awk '{sum+=$4;count++} END {print sum/count " MHz avg"}')"
    sleep 1
done
```

## Recommendations by Workload Type

For most Ubuntu servers, the right governor depends on the workload:

**Database servers (PostgreSQL, MySQL):** Use `performance` governor. Query latency is critical and you don't want the CPU to throttle mid-query.

```bash
sudo cpupower frequency-set -g performance
```

**Web application servers:** `schedutil` provides a good balance - it scales up quickly for request bursts and scales down during lulls.

```bash
sudo cpupower frequency-set -g schedutil
```

**Batch processing or build servers:** `ondemand` works well - jobs are not latency-sensitive and you save power between builds.

```bash
sudo cpupower frequency-set -g ondemand
```

**Containers or virtualization hosts (KVM):** Use `performance` to avoid scheduling jitter in guests.

```bash
sudo cpupower frequency-set -g performance
```

## BIOS/UEFI Settings

Software governor configuration can be overridden or constrained by BIOS settings. Check for:

- **Intel SpeedStep / AMD Cool'n'Quiet** - must be enabled in BIOS for software frequency scaling to work
- **C-States** - CPU sleep states. Disable C6/C7 on latency-sensitive servers to prevent wakeup delays
- **Turbo Boost / Turbo Core** - can be enabled or disabled in BIOS

```bash
# Check available C-states
cat /sys/devices/system/cpu/cpu0/cpuidle/*/name

# Disable deep C-states for low latency (temporary)
sudo cpupower idle-set -D 2   # disable states deeper than C2
```

For the most reliable performance on production servers, set the governor to `performance` and verify BIOS power management settings match your performance requirements. The `schedutil` governor is an excellent alternative that balances performance and power with good accuracy on modern kernels.
