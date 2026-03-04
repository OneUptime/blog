# How to Install and Configure TLP for Battery Optimization on RHEL Laptops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TLP, Battery, Power Management, Laptop, Linux

Description: Install and configure TLP on RHEL laptops to automatically optimize power consumption and extend battery life without manual tuning.

---

TLP is an advanced power management tool for Linux that applies optimal settings automatically when your laptop switches between AC power and battery. It requires no configuration out of the box but offers extensive customization options.

## Install TLP

TLP is available from the EPEL repository on RHEL.

```bash
# Enable the EPEL repository
sudo dnf install -y epel-release

# Install TLP
sudo dnf install -y tlp tlp-rdw

# For ThinkPad laptops, install the additional battery management package
sudo dnf install -y kernel-devel akmod-tp_smapi
```

## Enable and Start TLP

```bash
# Enable TLP to start at boot
sudo systemctl enable tlp

# Start TLP immediately
sudo systemctl start tlp

# Disable the conflicting power-profiles-daemon if it is running
sudo systemctl stop power-profiles-daemon
sudo systemctl disable power-profiles-daemon
sudo systemctl mask power-profiles-daemon
```

## Check TLP Status

```bash
# View the current TLP status and active settings
sudo tlp-stat -s

# View battery information
sudo tlp-stat -b

# View all active settings
sudo tlp-stat -c

# View power consumption estimates
sudo tlp-stat -p
```

## Configure TLP

The main configuration file controls all power settings.

```bash
# Edit the TLP configuration
sudo vi /etc/tlp.conf

# Key settings to consider:
```

```bash
# /etc/tlp.conf - Common optimizations

# CPU governor on battery: powersave for maximum battery life
CPU_SCALING_GOVERNOR_ON_BAT=powersave

# CPU governor on AC: performance for full speed
CPU_SCALING_GOVERNOR_ON_AC=performance

# Limit CPU turbo boost on battery
CPU_BOOST_ON_BAT=0
CPU_BOOST_ON_AC=1

# WiFi power saving on battery
WIFI_PWR_ON_BAT=on
WIFI_PWR_ON_AC=off

# Disk APM level (1=max power saving, 254=max performance)
DISK_APM_LEVEL_ON_BAT="128"
DISK_APM_LEVEL_ON_AC="254"

# SATA link power management
SATA_LINKPWR_ON_BAT="med_power_with_dipm"
SATA_LINKPWR_ON_AC="max_performance"

# PCIe Active State Power Management
PCIE_ASPM_ON_BAT=powersupersave
PCIE_ASPM_ON_AC=default

# USB autosuspend
USB_AUTOSUSPEND=1
```

## Apply Changes

```bash
# Apply the new configuration without rebooting
sudo tlp start

# Verify the settings are active
sudo tlp-stat -c | grep -E "CPU_SCALING|CPU_BOOST|WIFI_PWR"
```

## Set Battery Charge Thresholds (ThinkPads)

```bash
# Set the battery to start charging at 40% and stop at 80%
# This extends long-term battery lifespan
echo 40 | sudo tee /sys/class/power_supply/BAT0/charge_start_threshold
echo 80 | sudo tee /sys/class/power_supply/BAT0/charge_stop_threshold

# Or configure in /etc/tlp.conf:
# START_CHARGE_THRESH_BAT0=40
# STOP_CHARGE_THRESH_BAT0=80
```

## Monitor Battery Life Impact

```bash
# Check current power draw
sudo tlp-stat -p

# Monitor battery discharge rate over time
upower -i /org/freedesktop/UPower/devices/battery_BAT0
```

TLP works well alongside RHEL's default power management and provides noticeable battery life improvements on most laptop hardware.
