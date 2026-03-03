# How to Configure Power Saving for Servers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Power Management, Server, Performance, Energy Efficiency

Description: Configure power saving settings on Ubuntu servers to reduce energy consumption, covering CPU governors, disk spin-down, network power management, and monitoring tools.

---

Server power consumption adds up quickly in datacenter and home lab environments. Ubuntu provides several tools to tune power behavior - reducing idle consumption without impacting performance under load. The key is targeting components that use power when idle: CPU, disks, network interfaces, and PCIe devices.

## Understanding Server Power Management

Server power management differs from laptop power management in important ways:

- Servers prioritize availability over battery life
- Aggressive power saving can increase latency
- Some power saving features interfere with network performance
- IPMI and out-of-band management have their own power states

The goal is usually to reduce idle power while maintaining full performance when the system is under load.

## CPU Governor Configuration

The CPU frequency governor controls how the CPU scales frequency based on load:

```bash
# Check current governor on all CPUs
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Check available governors
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
# Typical output: conservative ondemand userspace powersave performance schedutil

# Set governor for all CPUs
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    echo "schedutil" | sudo tee $cpu
done

# Or use cpupower (install if needed)
sudo apt install linux-tools-common linux-tools-$(uname -r)
sudo cpupower frequency-set -g schedutil
```

Governor options:
- `performance` - Always runs at max frequency. Best for consistent latency-sensitive workloads.
- `powersave` - Always runs at minimum frequency. Best for idle servers.
- `schedutil` - Balances frequency based on scheduler utilization. Good default for servers.
- `ondemand` - Older dynamic governor, jumps to max quickly.
- `conservative` - Scales up gradually, better for power saving.

For servers that need good throughput but also save power at idle:

```bash
# schedutil with tuned parameters
echo "schedutil" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Optionally set rate limits
# More aggressive frequency reduction when idle
echo 500000 | sudo tee /sys/devices/system/cpu/cpufreq/schedutil/rate_limit_us
```

## Making Governor Changes Persistent

```bash
# Install cpufrequtils for persistent governor settings
sudo apt install cpufrequtils

# Set the default governor
echo 'GOVERNOR="schedutil"' | sudo tee /etc/default/cpufrequtils

# Or use the cpupower service
sudo systemctl enable cpupower
sudo nano /etc/default/cpupower
# Set: START_OPTS="--governor schedutil"
```

## Disk Power Management

Spin-down unused hard drives:

```bash
# Install hdparm
sudo apt install hdparm

# Check current disk APM (Advanced Power Management) setting
sudo hdparm -I /dev/sda | grep -i "advanced\|power"

# Set APM level (1=aggressive power save, 254=high performance, 255=disabled)
# For spinning disks that can spin down after idle
sudo hdparm -B 127 /dev/sda    # moderate power saving
sudo hdparm -B 1 /dev/sda      # most aggressive power saving

# Set spin-down timeout (units of 5 seconds, 120 = 600 seconds = 10 minutes)
sudo hdparm -S 120 /dev/sda

# Test: manually put disk in standby
sudo hdparm -y /dev/sda

# Check disk status (should show "drive state is:  standby")
sudo hdparm -C /dev/sda
```

Make hdparm settings persistent:

```bash
sudo nano /etc/hdparm.conf
```

```text
/dev/sda {
    apm = 127
    spindown_time = 120
}

/dev/sdb {
    apm = 127
    spindown_time = 120
}
```

For NVMe drives, spin-down isn't applicable, but ASPM (Active State Power Management) can help:

```bash
# Check ASPM status for NVMe
cat /sys/module/nvme/parameters/max_power_saving

# Enable ASPM
sudo bash -c 'echo 1 > /sys/module/nvme/parameters/max_power_saving'
```

## Network Interface Power Management

By default, server NICs don't use power management (it causes latency spikes). But for less latency-sensitive setups:

```bash
# Check current power management state
sudo ethtool -s eth0

# Enable power management via iwconfig (wireless, if present)
sudo iwconfig wlan0 power on

# Disable network interface when not needed
sudo ip link set dev eth1 down

# For wired interfaces, disable Wake-on-LAN if not needed
sudo ethtool -s eth0 wol d

# Check current Wake-on-LAN settings
sudo ethtool eth0 | grep Wake
```

Note: Enabling NIC power management on servers generally isn't recommended. The latency penalty is usually not worth the small power savings.

## PCIe ASPM

PCIe Active State Power Management reduces power when PCIe links are idle:

```bash
# Check current ASPM policy
cat /sys/module/pcie_aspm/parameters/policy
# Options: default performance powersave powersupersave

# Enable ASPM powersave
echo powersave | sudo tee /sys/module/pcie_aspm/parameters/policy

# Or set in GRUB for boot-time enabling
sudo nano /etc/default/grub
# Add to GRUB_CMDLINE_LINUX_DEFAULT:
# pcie_aspm=force

sudo update-grub
```

ASPM is most effective for PCIe devices like SSDs, network cards, and GPUs.

## Using tuned for Automated Power Profiles

`tuned` is a daemon that applies system-wide profiles:

```bash
# Install tuned
sudo apt install tuned tuned-utils

# Enable and start
sudo systemctl enable tuned
sudo systemctl start tuned

# List available profiles
tuned-adm list

# Apply a power saving profile
sudo tuned-adm profile powersave

# Apply balanced profile (good default for servers)
sudo tuned-adm profile balanced

# Apply performance profile (disables all power saving)
sudo tuned-adm profile throughput-performance

# Check active profile
tuned-adm active
```

Profiles available:
- `powersave` - Aggressive power saving
- `balanced` - Balance between power and performance
- `throughput-performance` - Maximize throughput
- `latency-performance` - Minimize latency
- `virtual-host` - Optimized for virtualization hosts

## Monitoring Power Consumption

```bash
# Install powertop
sudo apt install powertop

# Run powertop analysis
sudo powertop

# Generate HTML report
sudo powertop --html=power-report.html

# Check CPU idle states
sudo powertop --time=30 --csv=stats.csv
```

For IPMI-capable servers:

```bash
# Install ipmitool
sudo apt install ipmitool

# Read power consumption sensor
sudo ipmitool sdr type Power

# Some systems show it as
sudo ipmitool dcmi power reading
```

## Scheduling Power States Based on Time

For servers with predictable idle periods:

```bash
# Schedule CPU governor changes
# Low power at night
echo '0 22 * * * root echo powersave > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor' | sudo tee -a /etc/crontab

# High performance during business hours
echo '0 8 * * 1-5 root echo schedutil > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor' | sudo tee -a /etc/crontab
```

Or use `at` for one-time scheduling.

## BIOS/UEFI Power Settings

Software power management is most effective when combined with BIOS settings:
- Enable C-states in BIOS (allows deeper CPU sleep states)
- Enable ASPM in BIOS
- Set power profile to "Energy Efficient" or "Custom" rather than "Performance"
- Enable fan speed control based on temperature
- Configure DRAM power management

These settings vary by hardware and BIOS vendor but can reduce server idle power by 20-40%.

## Quick Baseline: What to Enable on Most Servers

```bash
# 1. Set CPU governor to schedutil
sudo cpupower frequency-set -g schedutil

# 2. Enable disk APM (for spinning disks)
sudo hdparm -B 128 /dev/sda

# 3. Apply tuned balanced profile
sudo tuned-adm profile balanced

# 4. Disable Wake-on-LAN if not needed
sudo ethtool -s eth0 wol d

# 5. Enable ASPM
echo powersave | sudo tee /sys/module/pcie_aspm/parameters/policy
```

These changes typically reduce idle server power by 10-25% without meaningfully impacting performance under load.
