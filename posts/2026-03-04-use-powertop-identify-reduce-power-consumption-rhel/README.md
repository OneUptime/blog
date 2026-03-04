# How to Use powertop to Identify and Reduce Power Consumption on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PowerTOP, Power Management, Energy Efficiency, Linux

Description: Use powertop on RHEL to analyze power consumption, identify power-hungry processes and devices, and apply tuning recommendations to reduce energy usage.

---

powertop is an Intel-developed tool that analyzes power consumption on Linux systems. It identifies which processes, devices, and kernel settings are consuming the most power and provides recommendations to reduce energy usage. It works on both laptops and servers.

## Install powertop

```bash
# Install powertop from the RHEL repositories
sudo dnf install -y powertop
```

## Run powertop in Interactive Mode

```bash
# Launch powertop (requires root for full access)
sudo powertop
```

The interactive interface has several tabs:

- **Overview** - Shows processes sorted by wakeups per second
- **Idle Stats** - Displays CPU C-state residency
- **Frequency Stats** - Shows CPU frequency distribution
- **Device Stats** - Lists device power usage
- **Tunables** - Lists power-saving settings you can toggle

Navigate between tabs using the Tab key.

## Calibrate powertop for Accurate Readings

```bash
# Run calibration to improve power estimates
# This takes several minutes and cycles through brightness levels
sudo powertop --calibrate
```

## Generate an HTML Power Report

```bash
# Generate a detailed HTML report
sudo powertop --html=/tmp/powertop-report.html

# Open the report in a browser
firefox /tmp/powertop-report.html
```

The HTML report provides a clear breakdown of power consumers with actionable recommendations.

## Apply All Recommended Tunings

```bash
# Apply all suggested power-saving tunables automatically
sudo powertop --auto-tune

# This sets various devices and kernel parameters to their most
# power-efficient settings, including:
# - USB autosuspend
# - SATA link power management
# - Audio codec power management
# - WiFi power saving
# - PCI runtime power management
```

## Make Tunings Persistent with a systemd Service

The `--auto-tune` changes are lost after reboot. Create a service to apply them at boot.

```bash
# Create a systemd service for powertop auto-tune
sudo tee /etc/systemd/system/powertop-auto-tune.service > /dev/null << 'EOF'
[Unit]
Description=Apply powertop auto-tune settings
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/powertop --auto-tune
RemainAfterExit=true

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl daemon-reload
sudo systemctl enable powertop-auto-tune.service

# Start it now
sudo systemctl start powertop-auto-tune.service
```

## Identify Specific Power Issues

```bash
# Check which processes cause the most wakeups
sudo powertop --csv=/tmp/powertop.csv --time=60

# Common power-hungry culprits:
# - Polling applications (check every N seconds instead of using event-driven I/O)
# - Unused services running in the background
# - Devices not entering low-power states
```

## Selectively Apply Tunings

Instead of `--auto-tune`, you can apply individual settings:

```bash
# Enable USB autosuspend for a specific device
echo auto | sudo tee /sys/bus/usb/devices/2-1/power/control

# Enable SATA link power management
echo med_power_with_dipm | sudo tee /sys/class/scsi_host/host0/link_power_management_policy

# Enable audio codec power saving
echo 1 | sudo tee /sys/module/snd_hda_intel/parameters/power_save
```

powertop is a valuable diagnostic tool for understanding where power is being consumed on your RHEL systems, whether on laptops for battery life or servers for energy cost reduction.
