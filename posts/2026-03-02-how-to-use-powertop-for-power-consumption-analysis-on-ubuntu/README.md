# How to Use PowerTOP for Power Consumption Analysis on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Power Management, PowerTOP, Performance Analysis

Description: Use PowerTOP to analyze power consumption on Ubuntu, identify power-hungry processes and devices, tune idle power, and generate optimization reports.

---

PowerTOP is Intel's open-source tool for diagnosing power consumption on Linux. It measures energy use per process, identifies devices that block low-power states, and suggests tuning parameters. It works on both laptops (where battery life matters) and servers (where electricity costs add up). Even on non-Intel hardware, most functionality works fine.

## Installation

```bash
sudo apt update
sudo apt install powertop

# Verify installation
powertop --version
```

## Running the Interactive Interface

Run PowerTOP without arguments for the interactive dashboard:

```bash
sudo powertop
```

This opens a TUI (terminal user interface) with several tabs. Navigate between tabs using the Tab key and arrow keys.

### Tab 1: Overview

Shows real-time power consumption estimate, top power consumers, and current discharge rate (on laptops):

```
The battery reports a discharge rate of 8.32 W
The estimated remaining time is 2 hours, 3 minutes

Summary: 487.1 wakeups/second,  0.0 GPU ops/seconds, 0.0 VFS ops/sec and 9.7% CPU use

                Usage       Events/s    Category       Description
              1.5 ms/s      7.8        Process         [firefox]
              0.9 ms/s      4.2        Process         [python3]
              0.3 ms/s      23.1       Timer           tick_sched_timer
```

The "Events/s" column is important - high event rates prevent CPUs from reaching deep sleep states.

### Tab 2: Idle Stats

Shows what percentage of time CPUs spend in various C-states (idle power states). Deeper states (C6, C8, C10) use less power:

```
C0 active      14.8%
C1             6.2%
C1E            8.4%
C3             12.1%
C6             58.5%
```

If the CPU rarely reaches C6/C7/C8, something is preventing deep sleep. The "Overview" tab shows what's generating wakeups.

### Tab 3: Frequency Stats

Shows the CPU frequency distribution - how much time the CPU spent at each frequency level. You want to see most time at low frequencies when idle.

### Tab 4: Device Stats

Shows per-device power usage and whether devices are using power management:

```
Device          Runtime PM      Power Usage
PCI Device      Active           3.2 W
USB Device      Suspended        0.0 W
SATA Disk       Active           1.8 W
```

Devices showing "Active" that should be idle are targets for power management configuration.

### Tab 5: Tunables

This is the most actionable tab. It shows tuning suggestions with their current state:

```
Bad       Enable Audio codec power management
Bad       VM writeback timeout
Bad       SATA link power management
Good      Enable SATA ALPM link power management
Bad       PCI Device [Intel I219-V] ASPM
```

"Bad" means the optimization isn't enabled. You can select an item and press Enter/Space to toggle it, or press 'e' to enable all "Bad" tunables automatically.

## Enabling All Suggestions Automatically

PowerTOP can enable all recommended optimizations at once:

```bash
# Auto-tune: enable all recommendations
sudo powertop --auto-tune

# Run calibration first for better accuracy
sudo powertop --calibrate
```

The `--calibrate` option takes a few minutes and makes PowerTOP's power estimates more accurate for your specific hardware.

## Generating Reports

```bash
# Generate an HTML report
sudo powertop --html=/tmp/power-report.html

# View it
xdg-open /tmp/power-report.html
# Or copy to a web server

# Generate a CSV for data analysis
sudo powertop --csv=/tmp/power-stats.csv

# Specify measurement duration
sudo powertop --time=60 --html=/tmp/power-report.html
```

The HTML report is particularly useful for documentation and before/after comparisons.

## Making Optimizations Persistent

PowerTOP's auto-tune changes don't survive reboots. To make them persistent:

### Using a systemd Service

```bash
# Create a service that runs powertop --auto-tune at boot
sudo nano /etc/systemd/system/powertop.service
```

```ini
[Unit]
Description=PowerTOP Auto-tune
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/powertop --auto-tune
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable powertop
sudo systemctl start powertop
```

### Manual Tuning with Specific Settings

Rather than running `--auto-tune` blindly, you can apply specific tunables via scripts:

```bash
# View what auto-tune would change
sudo powertop --auto-tune 2>&1 | grep -i "setting\|enable"

# Common manual tunings based on PowerTOP recommendations

# Enable USB autosuspend
echo 'auto' | sudo tee /sys/bus/usb/devices/*/power/control

# Enable SATA ALPM (Aggressive Link Power Management)
for host in /sys/class/scsi_host/*/link_power_management_policy; do
    echo "med_power_with_dipm" | sudo tee "$host"
done

# Enable Audio codec power management
echo 1 | sudo tee /sys/module/snd_hda_intel/parameters/power_save

# Set VM writeback timeout (default 15 seconds, increase to 60)
echo 60 | sudo tee /proc/sys/vm/dirty_writeback_centisecs

# Enable PCIe ASPM
echo powersave | sudo tee /sys/module/pcie_aspm/parameters/policy
```

Put these in a script and run it at boot via systemd.

## Understanding Wakeups

High wakeup counts prevent the CPU from sleeping deeply. PowerTOP shows which processes or timers cause wakeups:

```bash
# Run PowerTOP and note the high-wakeup culprits in Overview tab
# Common high-wakeup sources:
# - Polling applications (bad network code, buggy drivers)
# - System timers (often kernel internals, hard to change)
# - Bluetooth scanning
# - NTP daemons with short intervals

# Reduce NTP poll frequency
sudo nano /etc/chrony/chrony.conf
# Add or modify: makestep 1.0 3
# And increase minpoll/maxpoll values:
# server ntp.ubuntu.com iburst minpoll 6 maxpoll 10

# Disable Bluetooth if not needed
sudo systemctl disable bluetooth
sudo rfkill block bluetooth
```

## Measuring Idle Power Baseline

```bash
# Measure idle power without any auto-tuning
sudo powertop --time=30 --csv=/tmp/before-tuning.csv

# Apply auto-tune
sudo powertop --auto-tune

# Measure again
sudo powertop --time=30 --csv=/tmp/after-tuning.csv

# Compare power consumption in the CSV files
grep "System baseline power" /tmp/before-tuning.csv /tmp/after-tuning.csv
```

## Per-Process Power Analysis

From the interactive interface, you can identify specific processes that use disproportionate power:

```bash
# Run in background while normal workload runs
sudo powertop --time=120 --csv=/tmp/workload-power.csv

# Check which processes are in the top power consumers
head -50 /tmp/workload-power.csv | grep Process
```

If a specific process generates excessive wakeups, investigate:

```bash
# Check what a process is doing (replace PID with actual process ID)
sudo strace -p PID -e trace=timer,select,poll,epoll_wait

# Check timer resolution
cat /proc/timer_list | grep -A5 "process_name"
```

## PowerTOP on Servers

On servers without a battery, PowerTOP estimates power based on CPU and device counters:

```bash
# Run calibration (improves accuracy on batteryless systems)
sudo powertop --calibrate

# The calibration runs various workloads to build energy models
# Takes about 1-2 minutes

# After calibration, run analysis
sudo powertop --html=/var/www/html/server-power-report.html
```

For servers, the main value of PowerTOP is identifying excessive wakeups from poorly written services, identifying devices that aren't using power management, and providing a starting point for tuning.

Regular PowerTOP analysis - especially after major software updates - catches regressions where new software versions increase idle power consumption.
