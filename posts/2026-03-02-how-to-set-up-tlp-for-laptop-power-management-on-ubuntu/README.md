# How to Set Up TLP for Laptop Power Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, TLP, Power Management, Laptop, Battery

Description: Install and configure TLP on Ubuntu for automatic laptop power management, covering battery optimization, CPU tuning, disk power settings, and radio device management.

---

TLP is a comprehensive power management solution for Linux laptops. Unlike manual sysfs tuning, TLP applies a coordinated set of optimizations automatically whenever the power source changes - AC or battery. It handles CPU governors, disk APM, PCIe ASPM, USB autosuspend, radio devices, and more through a single configuration file.

## Why TLP

Ubuntu has basic power management through upower and systemd, but TLP adds:
- Automatic per-device power management
- Different settings for AC vs battery
- Battery charge thresholds (for compatible hardware)
- Coordinated application of many settings at once
- Per-device exceptions

## Installation

```bash
# TLP is in the Ubuntu repositories
sudo apt update
sudo apt install tlp tlp-rdw

# For ThinkPad users: additional kernel module for battery thresholds
sudo apt install tp-smapi-dkms acpi-call-dkms

# For ASUS, Samsung, HP with ACPI battery tools
# Check if acpi-call works for your laptop
sudo apt install acpi-call-dkms

# Enable and start TLP
sudo systemctl enable tlp
sudo systemctl start tlp

# Check status
sudo tlp-stat -s
```

`tlp-rdw` is the Radio Device Wizard - it manages WiFi, Bluetooth, and WWAN radios based on network events (disable Bluetooth when disconnected from specific networks, etc.).

## Configuration File

TLP's configuration lives in `/etc/tlp.conf`. The file is well-commented and uses a `SETTING=value` format with separate AC and battery values for most settings.

```bash
# Edit the configuration
sudo nano /etc/tlp.conf
```

The key concept: most settings come in pairs with `_AC` and `_BAT` suffixes:

```text
# CPU governor: performance on AC, powersave on battery
CPU_SCALING_GOVERNOR_ON_AC=performance
CPU_SCALING_GOVERNOR_ON_BAT=powersave
```

## CPU Settings

```bash
# CPU frequency governors
CPU_SCALING_GOVERNOR_ON_AC=performance
CPU_SCALING_GOVERNOR_ON_BAT=powersave

# HWP (Hardware-controlled P-States) energy preference
CPU_ENERGY_PERF_POLICY_ON_AC=balance_performance
CPU_ENERGY_PERF_POLICY_ON_BAT=power

# Min/max performance percentage
CPU_MIN_PERF_ON_AC=0
CPU_MAX_PERF_ON_AC=100
CPU_MIN_PERF_ON_BAT=0
CPU_MAX_PERF_ON_BAT=30

# Turbo boost
CPU_BOOST_ON_AC=1
CPU_BOOST_ON_BAT=0

# Intel P-State min/max
CPU_SCALING_MIN_FREQ_ON_AC=0
CPU_SCALING_MAX_FREQ_ON_AC=0   # 0 = use hardware max
CPU_SCALING_MIN_FREQ_ON_BAT=0
CPU_SCALING_MAX_FREQ_ON_BAT=0
```

## Disk Settings

```bash
# Disk APM level (1=max saving, 254=max performance, 255=off)
DISK_APM_LEVEL_ON_AC="254 254"
DISK_APM_LEVEL_ON_BAT="128 128"

# Disk spin-down timeout (0=disabled, units of 5s)
DISK_SPINDOWN_TIMEOUT_ON_AC="0 0"
DISK_SPINDOWN_TIMEOUT_ON_BAT="60 60"   # 5 minutes

# SATA ALPM (Aggressive Link Power Management)
SATA_LINKPWR_ON_AC="med_power_with_dipm"
SATA_LINKPWR_ON_BAT="med_power_with_dipm"

# NVMe power saving
PCIE_ASPM_ON_AC=performance
PCIE_ASPM_ON_BAT=powersupersave
```

Multiple values in quotes apply to multiple disks (first disk, second disk, etc.).

## USB Autosuspend

```bash
# Enable USB autosuspend on battery
USB_AUTOSUSPEND=1

# Autosuspend delay in seconds
USB_AUTOSUSPEND_DISABLE_ON_SHUTDOWN=0

# Exclude specific USB devices from autosuspend
# Use lsusb to find vendor:product IDs
# USB_DENYLIST="046d:c31c 1d50:6089"

# Enable input devices (mouse, keyboard) autosuspend
USB_AUTOSUSPEND=1
```

To find device IDs to exclude (for USB devices that break with autosuspend):

```bash
# List USB devices with vendor:product IDs
lsusb | awk '{print $6, substr($0, index($0,$7))}'

# Example output:
# 046d:c31c Logitech, Inc. Keyboard K120

# Add to USB_DENYLIST if it causes issues:
# USB_DENYLIST="046d:c31c"
```

## Radio Device Management

```bash
# WiFi power saving
WIFI_PWR_ON_AC=off
WIFI_PWR_ON_BAT=on

# Bluetooth - disable on battery if you don't need it
# These require tlp-rdw for event-based management
RESTORE_DEVICE_STATE_ON_STARTUP=0
```

For event-based radio management, edit `/etc/tlp/tlp.conf` (or the original file) to configure what happens when network connections change.

## Battery Charge Thresholds

This is TLP's most popular feature for ThinkPads and compatible hardware. Limiting max charge extends battery longevity:

```bash
# ThinkPad battery thresholds
# Start charging when below 75%
# Stop charging when above 80%
START_CHARGE_THRESH_BAT0=75
STOP_CHARGE_THRESH_BAT0=80

# For laptops with two batteries
START_CHARGE_THRESH_BAT1=75
STOP_CHARGE_THRESH_BAT1=80
```

Common threshold strategies:
- **Long life (mostly plugged in)**: start=20, stop=80
- **Balanced**: start=75, stop=90
- **Maximum capacity for travel**: start=95, stop=100 (or disable thresholds)

Not all laptops support this. Check with:

```bash
sudo tlp-stat -b
# Shows battery info including whether thresholds are supported
```

## Applying Configuration Changes

After editing the configuration file:

```bash
# Apply new configuration
sudo tlp start

# Or restart the service
sudo systemctl restart tlp

# Verify settings were applied
sudo tlp-stat
```

## Useful tlp-stat Outputs

```bash
# Full status
sudo tlp-stat

# Just system information
sudo tlp-stat -s

# Battery information
sudo tlp-stat -b

# Processor information
sudo tlp-stat -p

# Disk information
sudo tlp-stat -d

# PCI devices
sudo tlp-stat -e

# USB devices
sudo tlp-stat -u

# RadioManagement (with tlp-rdw)
sudo tlp-stat -r
```

## Troubleshooting

```bash
# Check TLP is running
sudo systemctl status tlp

# Check if any other power tools are conflicting
# power-profiles-daemon can conflict with TLP
systemctl status power-profiles-daemon

# Disable power-profiles-daemon if using TLP
sudo systemctl disable --now power-profiles-daemon
sudo systemctl mask power-profiles-daemon

# Check for conflicts with laptop-mode-tools
systemctl status laptop-mode

# View TLP logs
sudo journalctl -u tlp -n 50

# Test configuration without rebooting
sudo tlp start
```

TLP and GNOME's power-profiles-daemon conflict because they both try to set CPU governors. On Ubuntu 22.04+, power-profiles-daemon is installed by default. You need to disable it if you want TLP to manage CPU behavior:

```bash
# Check if power-profiles-daemon is active
systemctl is-active power-profiles-daemon

# If active and you want TLP to control CPU
sudo systemctl disable --now power-profiles-daemon
sudo systemctl mask power-profiles-daemon
sudo systemctl restart tlp
```

## Monitoring Battery Health

```bash
# Check battery health and charge cycles
sudo tlp-stat -b | grep -A 20 "Battery"

# Use upower for cross-tool view
upower -i /org/freedesktop/UPower/devices/battery_BAT0

# acpi command
sudo apt install acpi
acpi -V

# Check wear level
cat /sys/class/power_supply/BAT0/capacity
cat /sys/class/power_supply/BAT0/charge_full
cat /sys/class/power_supply/BAT0/charge_full_design
```

TLP is generally set-and-forget after initial configuration. The defaults are already good for most laptops, and customizing the charge thresholds is usually the most impactful change for long-term battery health.
