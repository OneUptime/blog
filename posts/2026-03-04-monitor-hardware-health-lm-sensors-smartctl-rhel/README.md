# How to Monitor Hardware Health with lm_sensors and smartctl on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Lm_sensors, Smartctl, Hardware Monitoring, SMART, Linux

Description: Use lm_sensors and smartctl on RHEL to monitor CPU temperatures, fan speeds, voltages, and disk health to detect hardware problems before they cause failures.

---

Monitoring hardware health is essential for preventing unexpected failures. lm_sensors reads temperature, voltage, and fan speed data from motherboard sensors, while smartctl reads Self-Monitoring, Analysis and Reporting Technology (SMART) data from storage drives.

## Install Monitoring Tools

```bash
# Install lm_sensors for temperature and voltage monitoring
sudo dnf install -y lm_sensors

# Install smartmontools for disk health monitoring
sudo dnf install -y smartmontools
```

## Configure lm_sensors

```bash
# Run the sensor detection wizard
# Answer YES to scan for sensors on your hardware
sudo sensors-detect

# The wizard probes for supported sensor chips and offers to
# load the required kernel modules
# Accept the defaults for most prompts

# After detection, read the sensor data
sensors
```

Example output:

```bash
coretemp-isa-0000
Adapter: ISA adapter
Package id 0:  +45.0 C  (high = +80.0 C, crit = +100.0 C)
Core 0:         +43.0 C  (high = +80.0 C, crit = +100.0 C)
Core 1:         +44.0 C  (high = +80.0 C, crit = +100.0 C)
```

## Monitor Temperatures Continuously

```bash
# Watch sensor readings in real-time (updates every 2 seconds)
watch -n 2 sensors

# Output sensors data in a format suitable for scripting
sensors -u

# Get JSON output for integration with monitoring tools
sensors -j
```

## Set Up SMART Monitoring for Disks

```bash
# Enable and start the SMART monitoring daemon
sudo systemctl enable --now smartd

# Check if SMART is supported and enabled on a disk
sudo smartctl -i /dev/sda

# Enable SMART on a disk if it is disabled
sudo smartctl -s on /dev/sda
```

## Check Disk Health

```bash
# View the overall health status
sudo smartctl -H /dev/sda
# Output: PASSED or FAILED

# View all SMART attributes
sudo smartctl -A /dev/sda

# Key attributes to watch:
# 5   - Reallocated Sector Count (bad sectors remapped)
# 187 - Reported Uncorrectable Errors
# 188 - Command Timeout
# 197 - Current Pending Sector Count
# 198 - Offline Uncorrectable
```

## Run SMART Self-Tests

```bash
# Run a short self-test (takes about 2 minutes)
sudo smartctl -t short /dev/sda

# Run a long self-test (can take hours depending on disk size)
sudo smartctl -t long /dev/sda

# Check the results of the last test
sudo smartctl -l selftest /dev/sda
```

## For NVMe Drives

```bash
# NVMe drives use a different command set
sudo smartctl -a /dev/nvme0

# Check NVMe specific health information
sudo smartctl -H /dev/nvme0

# Key NVMe attributes:
# Critical Warning
# Temperature
# Available Spare
# Percentage Used
# Media and Data Integrity Errors
```

## Configure SMART Alerts

```bash
# Edit the smartd configuration
sudo vi /etc/smartd.conf

# Monitor all disks and send email alerts on errors
# Add this line:
DEVICESCAN -H -l error -l selftest -f -m admin@example.com -M exec /usr/libexec/smartmontools/smartdnotify

# Restart smartd to apply
sudo systemctl restart smartd
```

## Create a Simple Health Check Script

```bash
sudo tee /usr/local/bin/hw-health-check.sh > /dev/null << 'SCRIPT'
#!/bin/bash
# Quick hardware health check

echo "=== CPU Temperatures ==="
sensors | grep -E "Core|Package"

echo ""
echo "=== Disk Health ==="
for disk in /dev/sd? /dev/nvme?; do
    if [ -e "$disk" ]; then
        echo -n "$disk: "
        sudo smartctl -H "$disk" 2>/dev/null | grep "result"
    fi
done
SCRIPT

sudo chmod +x /usr/local/bin/hw-health-check.sh
```

Regular hardware health monitoring helps catch failing components early, reducing the risk of data loss and unexpected downtime on your RHEL systems.
