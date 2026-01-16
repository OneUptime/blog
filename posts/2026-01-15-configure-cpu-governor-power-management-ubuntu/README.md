# How to Configure CPU Governor and Power Management on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, CPU Governor, Power Management, Performance, Tutorial

Description: Complete guide to configuring CPU frequency scaling and power management on Ubuntu.

---

Managing CPU frequency and power consumption is essential for optimizing system performance, extending battery life on laptops, and reducing energy costs on servers. Ubuntu provides several tools and mechanisms to control how your CPU operates, from aggressive performance modes to power-saving configurations. This comprehensive guide covers everything you need to know about CPU governors and power management on Ubuntu.

## Understanding CPU Frequency Scaling

CPU frequency scaling, also known as CPU throttling or dynamic voltage and frequency scaling (DVFS), allows your processor to adjust its operating frequency based on current workload demands. Modern CPUs can run at various speeds, from a minimum frequency to a maximum turbo frequency.

### How It Works

When your system is idle or running light tasks, the CPU can reduce its frequency to save power and reduce heat generation. When demanding applications need more processing power, the CPU scales up to higher frequencies. This dynamic adjustment is controlled by CPU governors.

### Benefits of Frequency Scaling

- **Power Savings**: Lower frequencies consume less power
- **Heat Reduction**: Reduced frequency generates less heat
- **Extended Hardware Lifespan**: Lower temperatures can extend CPU life
- **Battery Conservation**: Critical for laptop users
- **Noise Reduction**: Less cooling required means quieter systems

## Available CPU Governors

Ubuntu supports several CPU governors, each with different scaling strategies. The available governors depend on your CPU and kernel configuration.

### Performance Governor

```bash
# The performance governor locks the CPU at maximum frequency
# Best for: Desktop systems, gaming, computational workloads
# Trade-off: Maximum power consumption and heat generation

# Characteristics:
# - No frequency scaling - always runs at max frequency
# - Lowest latency for CPU-bound tasks
# - Highest power consumption
# - Best for workstations requiring consistent performance
```

### Powersave Governor

```bash
# The powersave governor locks the CPU at minimum frequency
# Best for: Maximum battery life, idle systems
# Trade-off: Significantly reduced performance

# Characteristics:
# - No frequency scaling - always runs at min frequency
# - Maximum power savings
# - Not suitable for performance-critical tasks
# - Useful for servers during low-demand periods
```

### Ondemand Governor

```bash
# The ondemand governor dynamically scales frequency based on load
# Best for: General desktop use, balanced performance/power
# Trade-off: May have brief latency spikes during scaling

# Characteristics:
# - Quickly jumps to max frequency when load is detected
# - Gradually decreases frequency when load drops
# - Configurable sampling rate and thresholds
# - Good balance for most use cases
```

### Conservative Governor

```bash
# The conservative governor scales frequency gradually
# Best for: Laptops, thermal-sensitive environments
# Trade-off: Slower response to load changes

# Characteristics:
# - Incrementally increases/decreases frequency
# - Smoother power consumption curve
# - Less aggressive than ondemand
# - Better for battery longevity
```

### Schedutil Governor

```bash
# The schedutil governor uses scheduler utilization data
# Best for: Modern systems with recent kernels
# Trade-off: Requires kernel 4.7+ and scheduler support

# Characteristics:
# - Integrated with the CPU scheduler
# - More accurate load detection
# - Better for mixed workloads
# - Default on many modern Ubuntu installations
```

## Checking Current Governor and CPU Frequency

Before making changes, it's important to understand your current CPU configuration.

### View Current Governor

```bash
# Check the current governor for all CPU cores
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Check governor for a specific CPU core (e.g., cpu0)
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# List all available governors on your system
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
```

### View Current CPU Frequency

```bash
# Check current frequency for all cores (in KHz)
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq

# Check frequency range (minimum and maximum)
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq

# Get detailed CPU information
lscpu | grep -i "mhz\|freq"

# Real-time frequency monitoring
watch -n 1 "cat /proc/cpuinfo | grep 'MHz'"
```

### Using cpufreq-info

```bash
# Install cpufrequtils first (covered in next section)
# Then get comprehensive CPU frequency information
cpufreq-info

# Get information for a specific CPU
cpufreq-info -c 0

# Show current frequency only
cpufreq-info -f

# Show current policy
cpufreq-info -p
```

## Installing CPU Frequency Management Tools

Ubuntu provides two main packages for managing CPU frequency: `cpufrequtils` and `linux-tools` (which includes `cpupower`).

### Installing cpufrequtils

```bash
# Update package list
sudo apt update

# Install cpufrequtils package
# This provides cpufreq-info and cpufreq-set commands
sudo apt install cpufrequtils

# Verify installation
cpufreq-info --version
```

### Installing cpupower

```bash
# cpupower is part of linux-tools package
# Install the version matching your kernel
sudo apt install linux-tools-common linux-tools-$(uname -r)

# If the specific kernel version package isn't available
sudo apt install linux-tools-generic

# Verify installation
cpupower --version

# Get frequency information using cpupower
cpupower frequency-info
```

## Changing CPU Governor Temporarily

Temporary changes are useful for testing or short-term adjustments. These settings will reset after a reboot.

### Using cpufreq-set

```bash
# Set governor for a specific CPU core
# Replace 'performance' with your desired governor
sudo cpufreq-set -c 0 -g performance

# Set governor for all CPU cores using a loop
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    echo "performance" | sudo tee $cpu
done

# Alternative: Set governor for all cores at once
sudo cpufreq-set -r -g performance
# Note: -r flag applies to all CPUs (if supported)
```

### Using cpupower

```bash
# Set governor using cpupower
# This affects all CPU cores by default
sudo cpupower frequency-set -g performance

# Set specific frequency (if supported)
# Frequency should be in MHz or with unit suffix
sudo cpupower frequency-set -f 2.4GHz

# Set frequency range
sudo cpupower frequency-set -d 800MHz -u 3.6GHz
# -d: minimum frequency
# -u: maximum frequency
```

### Direct sysfs Manipulation

```bash
# Write directly to sysfs (requires root)
# Set governor for cpu0
echo "performance" | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Set governor for all CPUs
echo "performance" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Set minimum frequency (in KHz)
echo 2000000 | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq

# Set maximum frequency (in KHz)
echo 3600000 | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq
```

## Making Governor Changes Permanent

For persistent configuration across reboots, you have several options.

### Using /etc/default/cpufrequtils

```bash
# Create or edit the cpufrequtils configuration file
sudo nano /etc/default/cpufrequtils

# Add the following configuration:
```

```bash
# /etc/default/cpufrequtils
# Configuration file for cpufrequtils

# Set the default governor
# Options: performance, powersave, ondemand, conservative, schedutil
GOVERNOR="performance"

# Set minimum frequency (optional, in KHz)
# MIN_SPEED="800000"

# Set maximum frequency (optional, in KHz)
# MAX_SPEED="3600000"
```

```bash
# After editing, restart the cpufrequtils service
sudo systemctl restart cpufrequtils

# Enable the service to start at boot
sudo systemctl enable cpufrequtils
```

### Using systemd Service

```bash
# Create a custom systemd service for setting the governor
sudo nano /etc/systemd/system/cpu-governor.service
```

```ini
# /etc/systemd/system/cpu-governor.service
# Custom service to set CPU governor at boot

[Unit]
Description=Set CPU Governor to Performance
After=multi-user.target

[Service]
Type=oneshot
# Set performance governor for all CPU cores
ExecStart=/bin/bash -c 'echo performance | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable cpu-governor.service
sudo systemctl start cpu-governor.service

# Verify the service status
sudo systemctl status cpu-governor.service
```

### Using rc.local (Legacy Method)

```bash
# Edit rc.local file (create if it doesn't exist)
sudo nano /etc/rc.local
```

```bash
#!/bin/bash
# /etc/rc.local
# This script runs at the end of multi-user runlevel

# Set CPU governor to performance for all cores
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    echo "performance" > $cpu
done

exit 0
```

```bash
# Make rc.local executable
sudo chmod +x /etc/rc.local

# Enable rc-local service (if not already enabled)
sudo systemctl enable rc-local.service
```

## Intel P-State Driver Configuration

Modern Intel CPUs use the `intel_pstate` driver, which provides its own frequency scaling mechanism with different configuration options.

### Checking if Intel P-State is Active

```bash
# Check the current scaling driver
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver

# If output is "intel_pstate", the driver is active
# If output is "acpi-cpufreq", the legacy driver is in use
```

### Intel P-State Specific Configuration

```bash
# Intel P-State directory location
ls /sys/devices/system/cpu/intel_pstate/

# Available parameters:
# - max_perf_pct: Maximum performance percentage (0-100)
# - min_perf_pct: Minimum performance percentage (0-100)
# - no_turbo: Disable turbo boost (0=enabled, 1=disabled)
# - status: Driver status (active/passive/off)
```

### Configuring Intel P-State

```bash
# Set maximum performance percentage (e.g., 80%)
# Useful for limiting heat/power on laptops
echo 80 | sudo tee /sys/devices/system/cpu/intel_pstate/max_perf_pct

# Set minimum performance percentage (e.g., 20%)
echo 20 | sudo tee /sys/devices/system/cpu/intel_pstate/min_perf_pct

# Disable turbo boost
# Reduces power consumption and heat
echo 1 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo

# Enable turbo boost
echo 0 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo

# Check current turbo status
cat /sys/devices/system/cpu/intel_pstate/no_turbo
```

### Intel P-State Governor Options

```bash
# Intel P-State supports two governors:
# - performance: Bias toward maximum frequency
# - powersave: Bias toward energy efficiency (default)

# Set to performance mode
echo "performance" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Check energy performance preference (EPP)
cat /sys/devices/system/cpu/cpu0/cpufreq/energy_performance_preference

# Available EPP options (system dependent):
# default, performance, balance_performance, balance_power, power

# Set EPP to balance_performance
echo "balance_performance" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference
```

### Disabling Intel P-State (Using Legacy Driver)

```bash
# To use traditional governors (ondemand, conservative), disable intel_pstate
# Edit GRUB configuration
sudo nano /etc/default/grub

# Add intel_pstate=disable to GRUB_CMDLINE_LINUX_DEFAULT
# GRUB_CMDLINE_LINUX_DEFAULT="quiet splash intel_pstate=disable"

# Update GRUB
sudo update-grub

# Reboot to apply changes
sudo reboot

# After reboot, verify the driver changed
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver
# Should now show "acpi-cpufreq"
```

## AMD Pstate Driver Configuration

AMD processors in recent kernels support the `amd-pstate` driver, offering similar functionality to Intel's P-State.

### Enabling AMD Pstate Driver

```bash
# Check if AMD Pstate is available
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver

# AMD Pstate requires kernel 5.17+ for older Zen CPUs
# Kernel 6.1+ for full EPP support

# Enable AMD Pstate via kernel parameter
sudo nano /etc/default/grub

# Add to GRUB_CMDLINE_LINUX_DEFAULT:
# For active mode (recommended for newer systems):
# GRUB_CMDLINE_LINUX_DEFAULT="quiet splash amd_pstate=active"

# For passive mode:
# GRUB_CMDLINE_LINUX_DEFAULT="quiet splash amd_pstate=passive"

# For guided mode (kernel 6.3+):
# GRUB_CMDLINE_LINUX_DEFAULT="quiet splash amd_pstate=guided"

# Update GRUB and reboot
sudo update-grub
sudo reboot
```

### AMD Pstate Configuration Options

```bash
# AMD Pstate sysfs location
ls /sys/devices/system/cpu/amd_pstate/

# Check current status
cat /sys/devices/system/cpu/amd_pstate/status

# Set energy performance preference (EPP)
# Available values: default, performance, balance_performance, balance_power, power
cat /sys/devices/system/cpu/cpu0/cpufreq/energy_performance_available_preferences
echo "balance_performance" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference

# AMD Pstate supports these governors:
# - performance: Maximum frequency
# - powersave: Energy-efficient scaling

# Set governor
echo "performance" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

### AMD Pstate EPP Configuration Script

```bash
#!/bin/bash
# /usr/local/bin/amd-pstate-config.sh
# Script to configure AMD Pstate driver

# Check if AMD Pstate is active
DRIVER=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver)

if [ "$DRIVER" != "amd-pstate" ] && [ "$DRIVER" != "amd-pstate-epp" ]; then
    echo "AMD Pstate driver not active. Current driver: $DRIVER"
    exit 1
fi

# Configuration variables
GOVERNOR="performance"          # or "powersave"
EPP="balance_performance"       # Energy performance preference

# Apply governor to all CPUs
echo "Setting governor to: $GOVERNOR"
echo "$GOVERNOR" | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Apply EPP if supported
if [ -f /sys/devices/system/cpu/cpu0/cpufreq/energy_performance_preference ]; then
    echo "Setting EPP to: $EPP"
    echo "$EPP" | tee /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference
fi

echo "AMD Pstate configuration complete."
```

## TLP for Laptop Power Management

TLP is an advanced power management tool designed for laptops. It provides automatic background optimization without requiring manual configuration.

### Installing TLP

```bash
# Install TLP
sudo apt install tlp tlp-rdw

# For ThinkPads, install additional packages
sudo apt install tp-smapi-dkms acpi-call-dkms

# Start TLP service
sudo systemctl enable tlp.service
sudo systemctl start tlp.service

# Disable conflicting services
sudo systemctl mask systemd-rfkill.service
sudo systemctl mask systemd-rfkill.socket
```

### TLP Configuration

```bash
# TLP configuration file location
sudo nano /etc/tlp.conf
```

```bash
# /etc/tlp.conf
# TLP Power Management Configuration

# Operation mode when on AC power
# Choices: performance, balanced (default)
TLP_DEFAULT_MODE=AC

# Operation mode when on battery
TLP_PERSISTENT_DEFAULT=0

# CPU scaling governor on AC
# Options: performance, powersave, ondemand, conservative, schedutil
CPU_SCALING_GOVERNOR_ON_AC=performance

# CPU scaling governor on battery
CPU_SCALING_GOVERNOR_ON_BAT=powersave

# CPU energy/performance policy on AC
# Options: default, performance, balance_performance, balance_power, power
CPU_ENERGY_PERF_POLICY_ON_AC=balance_performance

# CPU energy/performance policy on battery
CPU_ENERGY_PERF_POLICY_ON_BAT=power

# CPU turbo boost on AC (0=disable, 1=allow)
CPU_BOOST_ON_AC=1

# CPU turbo boost on battery
CPU_BOOST_ON_BAT=0

# CPU performance limits on AC (percentage)
CPU_MIN_PERF_ON_AC=0
CPU_MAX_PERF_ON_AC=100

# CPU performance limits on battery
CPU_MIN_PERF_ON_BAT=0
CPU_MAX_PERF_ON_BAT=50

# Platform performance profile on AC
# Options: performance, balanced, low-power
PLATFORM_PROFILE_ON_AC=performance

# Platform performance profile on battery
PLATFORM_PROFILE_ON_BAT=low-power

# WiFi power saving mode
# 0=off, 1=on
WIFI_PWR_ON_AC=off
WIFI_PWR_ON_BAT=on

# Audio power saving
SOUND_POWER_SAVE_ON_AC=0
SOUND_POWER_SAVE_ON_BAT=1

# Runtime PM for PCI(e) devices
RUNTIME_PM_ON_AC=on
RUNTIME_PM_ON_BAT=auto

# USB autosuspend
USB_AUTOSUSPEND=1
```

### TLP Commands

```bash
# Check TLP status
sudo tlp-stat

# Show CPU-specific information
sudo tlp-stat -p

# Show battery information
sudo tlp-stat -b

# Show temperature and fan information
sudo tlp-stat -t

# Force AC mode
sudo tlp ac

# Force battery mode
sudo tlp bat

# Apply settings from configuration
sudo tlp start

# Show detailed processor information
sudo tlp-stat -p
```

## Thermald for Thermal Management

Thermald (thermal daemon) is Intel's solution for preventing systems from overheating by monitoring temperature sensors and adjusting cooling as needed.

### Installing Thermald

```bash
# Install thermald
sudo apt install thermald

# Enable and start the service
sudo systemctl enable thermald.service
sudo systemctl start thermald.service

# Check service status
sudo systemctl status thermald.service
```

### Thermald Configuration

```bash
# Main configuration file
sudo nano /etc/thermald/thermal-conf.xml
```

```xml
<?xml version="1.0"?>
<!-- /etc/thermald/thermal-conf.xml -->
<!-- Thermald configuration file -->

<ThermalConfiguration>
    <Platform>
        <Name>Custom Thermal Configuration</Name>
        <ProductName>*</ProductName>
        <Preference>QUIET</Preference>
        <!-- Options: PERFORMANCE, QUIET, DISABLED -->

        <ThermalZones>
            <ThermalZone>
                <Type>cpu</Type>
                <TripPoints>
                    <TripPoint>
                        <!-- Passive cooling starts at 80°C -->
                        <SensorType>x86_pkg_temp</SensorType>
                        <Temperature>80000</Temperature>
                        <!-- Temperature in millidegrees Celsius -->
                        <Type>passive</Type>
                        <CoolingDevice>
                            <Type>rapl_controller</Type>
                            <Influence>100</Influence>
                        </CoolingDevice>
                    </TripPoint>
                    <TripPoint>
                        <!-- Critical shutdown at 100°C -->
                        <SensorType>x86_pkg_temp</SensorType>
                        <Temperature>100000</Temperature>
                        <Type>critical</Type>
                    </TripPoint>
                </TripPoints>
            </ThermalZone>
        </ThermalZones>

        <CoolingDevices>
            <CoolingDevice>
                <Type>rapl_controller</Type>
                <Path>/sys/class/powercap/intel-rapl</Path>
                <MinState>0</MinState>
                <MaxState>100</MaxState>
            </CoolingDevice>
            <CoolingDevice>
                <Type>intel_pstate</Type>
                <Path>/sys/devices/system/cpu/intel_pstate</Path>
                <MinState>0</MinState>
                <MaxState>100</MaxState>
            </CoolingDevice>
        </CoolingDevices>
    </Platform>
</ThermalConfiguration>
```

```bash
# Restart thermald to apply changes
sudo systemctl restart thermald.service

# Monitor thermald logs
journalctl -u thermald.service -f

# Check thermal zones
cat /sys/class/thermal/thermal_zone*/type
cat /sys/class/thermal/thermal_zone*/temp
```

### Thermald with TLP

```bash
# Thermald and TLP can work together
# TLP handles power management
# Thermald handles thermal throttling

# Both services can run simultaneously
sudo systemctl status thermald tlp

# For best results, let TLP handle CPU governor
# Let thermald handle temperature-based throttling
```

## Monitoring CPU Frequency

Effective monitoring helps you understand how your power management configuration affects system behavior.

### Using Command Line Tools

```bash
# Real-time frequency monitoring with watch
watch -n 0.5 "grep 'MHz' /proc/cpuinfo"

# Monitor frequency using cpupower
watch -n 1 "cpupower frequency-info -f"

# Monitor all cores with turbostat (Intel)
sudo apt install linux-tools-common linux-tools-$(uname -r)
sudo turbostat --interval 1

# Monitor specific metrics with turbostat
sudo turbostat --show Core,CPU,Avg_MHz,Busy%,Bzy_MHz,TSC_MHz,PkgTmp
```

### Using i7z (Intel CPUs)

```bash
# Install i7z for detailed Intel CPU monitoring
sudo apt install i7z

# Run i7z (requires root)
sudo i7z

# i7z shows real-time:
# - Core frequencies
# - C-state residency
# - Turbo boost status
# - Package temperature
```

### Using s-tui

```bash
# Install s-tui for visual monitoring
sudo apt install s-tui

# Run s-tui
s-tui

# s-tui provides:
# - CPU frequency graphs
# - Temperature monitoring
# - Power consumption (on supported hardware)
# - Stress testing capabilities
```

### Custom Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/cpu-monitor.sh
# Custom CPU monitoring script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get number of CPU cores
NUM_CORES=$(nproc)

echo "========================================"
echo "       CPU Frequency Monitor"
echo "========================================"
echo ""

# Display current governor
GOVERNOR=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor)
echo -e "Current Governor: ${GREEN}$GOVERNOR${NC}"
echo ""

# Display scaling driver
DRIVER=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver)
echo -e "Scaling Driver: ${YELLOW}$DRIVER${NC}"
echo ""

# Display frequency information
echo "CPU Core Frequencies:"
echo "----------------------------------------"
for ((i=0; i<NUM_CORES; i++)); do
    FREQ=$(cat /sys/devices/system/cpu/cpu$i/cpufreq/scaling_cur_freq)
    FREQ_MHZ=$((FREQ / 1000))

    # Get min and max frequencies
    MIN_FREQ=$(cat /sys/devices/system/cpu/cpu$i/cpufreq/scaling_min_freq)
    MAX_FREQ=$(cat /sys/devices/system/cpu/cpu$i/cpufreq/scaling_max_freq)
    MIN_MHZ=$((MIN_FREQ / 1000))
    MAX_MHZ=$((MAX_FREQ / 1000))

    printf "CPU%d: ${GREEN}%4d MHz${NC} (min: %d, max: %d)\n" $i $FREQ_MHZ $MIN_MHZ $MAX_MHZ
done

echo ""
echo "----------------------------------------"

# Display temperature if available
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$((TEMP / 1000))
    echo -e "CPU Temperature: ${RED}${TEMP_C}°C${NC}"
fi

# Display turbo boost status (Intel)
if [ -f /sys/devices/system/cpu/intel_pstate/no_turbo ]; then
    TURBO=$(cat /sys/devices/system/cpu/intel_pstate/no_turbo)
    if [ "$TURBO" -eq 0 ]; then
        echo -e "Turbo Boost: ${GREEN}Enabled${NC}"
    else
        echo -e "Turbo Boost: ${RED}Disabled${NC}"
    fi
fi

echo "========================================"
```

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/cpu-monitor.sh

# Run the monitor
cpu-monitor.sh

# Run with continuous updates
watch -n 1 /usr/local/bin/cpu-monitor.sh
```

## Power Profiles Daemon

Power Profiles Daemon is a modern solution integrated with GNOME for managing system-wide power profiles.

### Installing and Configuring

```bash
# Install power-profiles-daemon
sudo apt install power-profiles-daemon

# Enable and start the service
sudo systemctl enable power-profiles-daemon.service
sudo systemctl start power-profiles-daemon.service

# Check service status
sudo systemctl status power-profiles-daemon.service
```

### Using Power Profiles

```bash
# List available power profiles
powerprofilesctl list

# Output example:
#   performance:
#     Driver: platform_profile
#
# * balanced:
#     Driver: platform_profile
#
#   power-saver:
#     Driver: platform_profile

# Get current profile
powerprofilesctl get

# Set power profile to performance
powerprofilesctl set performance

# Set to balanced (default)
powerprofilesctl set balanced

# Set to power-saver
powerprofilesctl set power-saver
```

### Integration with GNOME Settings

```bash
# Power profiles are accessible through GNOME Settings
# Settings > Power > Power Mode

# Or using gsettings
gsettings get org.gnome.settings-daemon.plugins.power power-saver-profile-on-low-battery

# Enable power saver on low battery
gsettings set org.gnome.settings-daemon.plugins.power power-saver-profile-on-low-battery true
```

### D-Bus Interface

```bash
# Query power profiles via D-Bus
gdbus call --system \
    --dest net.hadess.PowerProfiles \
    --object-path /net/hadess/PowerProfiles \
    --method org.freedesktop.DBus.Properties.Get \
    net.hadess.PowerProfiles ActiveProfile

# Set profile via D-Bus
gdbus call --system \
    --dest net.hadess.PowerProfiles \
    --object-path /net/hadess/PowerProfiles \
    --method org.freedesktop.DBus.Properties.Set \
    net.hadess.PowerProfiles ActiveProfile "<'performance'>"
```

### Conflict Resolution

```bash
# Note: Power Profiles Daemon may conflict with TLP
# Choose one or the other, not both

# If using TLP, disable power-profiles-daemon
sudo systemctl stop power-profiles-daemon.service
sudo systemctl disable power-profiles-daemon.service
sudo systemctl mask power-profiles-daemon.service

# If using power-profiles-daemon, remove TLP
sudo apt remove tlp tlp-rdw
```

## Complete Configuration Examples

### High-Performance Desktop Configuration

```bash
#!/bin/bash
# /usr/local/bin/setup-performance-mode.sh
# Configure system for maximum performance

echo "Configuring system for maximum performance..."

# Set CPU governor to performance
echo "Setting CPU governor to performance..."
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Enable turbo boost (Intel)
if [ -f /sys/devices/system/cpu/intel_pstate/no_turbo ]; then
    echo "Enabling Intel Turbo Boost..."
    echo 0 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo
fi

# Set Intel P-State to maximum performance
if [ -f /sys/devices/system/cpu/intel_pstate/max_perf_pct ]; then
    echo "Setting Intel P-State to 100%..."
    echo 100 | sudo tee /sys/devices/system/cpu/intel_pstate/max_perf_pct
    echo 50 | sudo tee /sys/devices/system/cpu/intel_pstate/min_perf_pct
fi

# Set energy performance preference
if [ -f /sys/devices/system/cpu/cpu0/cpufreq/energy_performance_preference ]; then
    echo "Setting energy performance preference..."
    echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference
fi

# Disable CPU idle states for lowest latency (optional)
# WARNING: This increases power consumption significantly
# for state in /sys/devices/system/cpu/cpu*/cpuidle/state*/disable; do
#     echo 1 > $state
# done

echo "Performance mode configuration complete!"
```

### Laptop Battery Saver Configuration

```bash
#!/bin/bash
# /usr/local/bin/setup-powersave-mode.sh
# Configure system for maximum battery life

echo "Configuring system for power saving..."

# Set CPU governor to powersave
echo "Setting CPU governor to powersave..."
echo powersave | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Disable turbo boost (Intel)
if [ -f /sys/devices/system/cpu/intel_pstate/no_turbo ]; then
    echo "Disabling Intel Turbo Boost..."
    echo 1 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo
fi

# Limit Intel P-State performance
if [ -f /sys/devices/system/cpu/intel_pstate/max_perf_pct ]; then
    echo "Limiting Intel P-State to 50%..."
    echo 50 | sudo tee /sys/devices/system/cpu/intel_pstate/max_perf_pct
fi

# Set energy performance preference
if [ -f /sys/devices/system/cpu/cpu0/cpufreq/energy_performance_preference ]; then
    echo "Setting energy performance preference to power..."
    echo power | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/energy_performance_preference
fi

# Enable laptop mode
if [ -f /proc/sys/vm/laptop_mode ]; then
    echo "Enabling laptop mode..."
    echo 5 | sudo tee /proc/sys/vm/laptop_mode
fi

# Reduce disk write frequency
echo "Adjusting disk settings..."
echo 6000 | sudo tee /proc/sys/vm/dirty_writeback_centisecs

echo "Power saving mode configuration complete!"
```

### Automatic Switching Script

```bash
#!/bin/bash
# /usr/local/bin/auto-power-profile.sh
# Automatically switch profiles based on power source

# Check if running on AC or battery
if [ -f /sys/class/power_supply/AC/online ]; then
    AC_STATUS=$(cat /sys/class/power_supply/AC/online)
elif [ -f /sys/class/power_supply/ACAD/online ]; then
    AC_STATUS=$(cat /sys/class/power_supply/ACAD/online)
else
    echo "Cannot detect power source"
    exit 1
fi

if [ "$AC_STATUS" -eq 1 ]; then
    echo "AC power detected - switching to performance mode"

    # Performance settings
    echo performance | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

    if [ -f /sys/devices/system/cpu/intel_pstate/no_turbo ]; then
        echo 0 > /sys/devices/system/cpu/intel_pstate/no_turbo
    fi

    if [ -f /sys/devices/system/cpu/intel_pstate/max_perf_pct ]; then
        echo 100 > /sys/devices/system/cpu/intel_pstate/max_perf_pct
    fi
else
    echo "Battery power detected - switching to powersave mode"

    # Power saving settings
    echo powersave | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

    if [ -f /sys/devices/system/cpu/intel_pstate/no_turbo ]; then
        echo 1 > /sys/devices/system/cpu/intel_pstate/no_turbo
    fi

    if [ -f /sys/devices/system/cpu/intel_pstate/max_perf_pct ]; then
        echo 60 > /sys/devices/system/cpu/intel_pstate/max_perf_pct
    fi
fi
```

### udev Rule for Automatic Switching

```bash
# Create udev rule for automatic profile switching
sudo nano /etc/udev/rules.d/99-power-profile.rules
```

```bash
# /etc/udev/rules.d/99-power-profile.rules
# Automatically switch power profiles when AC adapter changes

# When AC adapter is connected
ACTION=="change", SUBSYSTEM=="power_supply", ATTR{type}=="Mains", ATTR{online}=="1", RUN+="/usr/local/bin/auto-power-profile.sh"

# When AC adapter is disconnected
ACTION=="change", SUBSYSTEM=="power_supply", ATTR{type}=="Mains", ATTR{online}=="0", RUN+="/usr/local/bin/auto-power-profile.sh"
```

```bash
# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Troubleshooting

### Common Issues and Solutions

```bash
# Issue: Governor changes don't persist after reboot
# Solution: Use systemd service or /etc/default/cpufrequtils

# Issue: Cannot change governor (permission denied)
# Solution: Ensure you're using sudo or running as root

# Issue: Only performance and powersave governors available
# Solution: This is normal with intel_pstate driver
# Disable intel_pstate for traditional governors

# Issue: Turbo boost won't enable
# Check thermal throttling
cat /sys/devices/system/cpu/intel_pstate/status
dmesg | grep -i thermal

# Issue: CPU stuck at low frequency
# Check if thermal throttling is active
cat /sys/class/thermal/thermal_zone*/temp
# Check for frequency limits
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq
```

### Debugging Commands

```bash
# View kernel messages related to CPU frequency
dmesg | grep -i "cpu\|freq\|pstate"

# Check for scaling driver errors
journalctl -k | grep -i cpu

# Verify CPU capabilities
cat /proc/cpuinfo | grep -E "model name|cpu MHz|flags"

# Check BIOS/UEFI power settings reflected in Linux
cat /sys/firmware/acpi/platform_profile_choices
cat /sys/firmware/acpi/platform_profile
```

## Monitoring Your System with OneUptime

While the tools and techniques covered in this guide help you configure and monitor CPU frequency locally, maintaining optimal performance across multiple systems or production environments requires a comprehensive monitoring solution.

**OneUptime** provides enterprise-grade infrastructure monitoring that helps you track CPU performance, system metrics, and power consumption across all your servers. With OneUptime, you can:

- Set up alerts when CPU frequency drops unexpectedly due to thermal throttling
- Monitor power consumption trends across your server fleet
- Track the effectiveness of your power management policies
- Receive notifications when systems deviate from expected performance baselines
- Create dashboards to visualize CPU utilization and frequency patterns
- Correlate application performance issues with underlying CPU behavior

Whether you're managing a single server or a complex distributed infrastructure, OneUptime gives you the visibility needed to ensure your power management configuration is working effectively. Visit [OneUptime](https://oneuptime.com) to learn more about how comprehensive monitoring can help optimize your systems.
