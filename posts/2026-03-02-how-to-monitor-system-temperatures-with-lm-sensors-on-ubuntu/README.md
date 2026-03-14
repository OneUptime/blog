# How to Monitor System Temperatures with lm-sensors on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Lm-sensors, Hardware Monitoring, Temperature, Server

Description: A complete guide to installing and configuring lm-sensors on Ubuntu to monitor CPU, motherboard, and GPU temperatures along with fan speeds and voltages.

---

Keeping an eye on system temperatures is basic hardware health monitoring for any server or workstation. Overheating leads to thermal throttling that kills performance, and extreme cases cause hardware damage. `lm-sensors` is the standard Linux tool for reading sensor data - temperatures, fan speeds, and voltages from hardware monitoring chips.

## Installing lm-sensors

```bash
# Install lm-sensors
sudo apt update
sudo apt install -y lm-sensors

# Install additional tools
sudo apt install -y hddtemp psensor  # hddtemp for disk temps, psensor for GUI
```

## Detecting Available Sensors

Before you can read sensor data, you need to detect which sensor chips are present in your hardware:

```bash
# Run sensor detection (interactive - says yes to driver loading prompts)
sudo sensors-detect

# Non-interactive mode (auto-answers yes to all prompts)
sudo sensors-detect --auto
```

`sensors-detect` scans for sensor chips and kernel modules. After it completes, it modifies `/etc/modules` to load the appropriate modules on boot.

Manually load the modules it found without rebooting:

```bash
# Load the modules recommended by sensors-detect
sudo service kmod start

# Or load specific modules
sudo modprobe coretemp     # Intel CPU core temps
sudo modprobe k10temp      # AMD CPU temps
sudo modprobe nct6775      # Common motherboard sensor chip
sudo modprobe drivetemp    # NVMe drive temperatures
```

## Reading Sensor Data

After detection and module loading:

```bash
# Show all sensor readings
sensors

# Example output:
# coretemp-isa-0000
# Adapter: ISA adapter
# Package id 0:  +47.0°C  (high = +90.0°C, crit = +100.0°C)
# Core 0:        +44.0°C  (high = +90.0°C, crit = +100.0°C)
# Core 1:        +46.0°C  (high = +90.0°C, crit = +100.0°C)
# Core 2:        +45.0°C  (high = +90.0°C, crit = +100.0°C)
# Core 3:        +47.0°C  (high = +90.0°C, crit = +100.0°C)
#
# nct6779-isa-0290
# Adapter: ISA adapter
# fan1:         1200 RPM
# fan2:          900 RPM
# SYSTIN:        +38.0°C
# CPUTIN:        +45.0°C
# AUXTIN0:       +35.0°C
# in0:          +0.88 V
# in1:          +1.01 V

# Show temperatures in Fahrenheit
sensors -f

# Get JSON output for scripts
sensors -j

# Filter specific chip output
sensors coretemp-isa-0000

# Show all chip names
sensors -l
```

## Continuous Monitoring

Watch temperatures in real time:

```bash
# Update every 2 seconds
watch -n2 sensors

# Higher refresh rate
watch -n0.5 sensors

# Monitor with timestamp
while true; do
    echo "=== $(date) ==="
    sensors
    sleep 5
done | tee /var/log/temperatures.log
```

## Parsing Sensor Output in Scripts

The `-j` flag gives JSON output that's easier to parse:

```bash
# Get JSON output
sensors -j

# Extract CPU package temperature with jq
sensors -j | jq '."coretemp-isa-0000"."Package id 0".temp1_input'

# Script to alert if temperature exceeds threshold
#!/bin/bash
THRESHOLD=80

# Get package temperature
TEMP=$(sensors -j 2>/dev/null | \
    jq -r '."coretemp-isa-0000"."Package id 0".temp1_input // 0' 2>/dev/null)

if [ -z "$TEMP" ] || [ "$TEMP" = "null" ]; then
    echo "Could not read temperature"
    exit 1
fi

# Compare (bash doesn't do floats, use awk)
if awk "BEGIN {exit ($TEMP < $THRESHOLD)}"; then
    echo "WARNING: CPU temperature ${TEMP}°C exceeds threshold ${THRESHOLD}°C"
    # Add alerting here
fi
```

## Configuring sensors.conf

Customize sensor readings, aliases, and thresholds in `/etc/sensors3.conf` or a file in `/etc/sensors.d/`:

```bash
# Create a custom configuration
sudo tee /etc/sensors.d/my-system.conf << 'EOF'
# Custom sensor configuration

chip "coretemp-isa-*"
    label temp1 "CPU Package"
    label temp2 "Core 0"
    label temp3 "Core 1"
    label temp4 "Core 2"
    label temp5 "Core 3"
    # Set custom high/crit limits
    set temp1_max 85
    set temp1_crit 100

chip "nct6779-isa-*"
    label temp1 "Motherboard"
    label temp2 "CPU"
    label fan1 "CPU Fan"
    label fan2 "System Fan 1"
    label fan3 "System Fan 2"
    # Ignore a problematic sensor
    ignore temp6
EOF

# Test the configuration
sensors
```

## Disk Temperature Monitoring

HDDs and NVMe drives report temperatures through different interfaces:

```bash
# For traditional HDDs - install hddtemp
sudo apt install -y hddtemp

# Check disk temperature
sudo hddtemp /dev/sda

# Check multiple disks
sudo hddtemp /dev/sd[abcd]

# For NVMe drives - use nvme-cli or smartctl
sudo apt install -y nvme-cli smartmontools

# NVMe temperature via nvme-cli
sudo nvme smart-log /dev/nvme0 | grep Temperature

# NVMe temperature via smartctl
sudo smartctl -A /dev/nvme0 | grep Temperature

# HDD via smartctl
sudo smartctl -A /dev/sda | grep Temperature_Celsius

# Combine all temps into one view
echo "=== CPU Temps ==="
sensors

echo "=== Disk Temps ==="
for disk in /dev/sd? /dev/nvme?; do
    if [ -b "$disk" ]; then
        echo -n "$disk: "
        sudo smartctl -A "$disk" 2>/dev/null | \
            grep -E "Temperature|Celsius" | \
            awk '{print $NF "°C"}'
    fi
done
```

## GPU Temperature Monitoring

For NVIDIA GPUs:

```bash
# Install NVIDIA management library tools
sudo apt install -y nvidia-utils-535  # or your driver version

# Query GPU temperature
nvidia-smi --query-gpu=name,temperature.gpu \
    --format=csv,noheader

# Continuous monitoring
nvidia-smi dmon -s p    # power readings including temp

# Detailed query
nvidia-smi --query-gpu=name,temperature.gpu,fan.speed,power.draw \
    --format=csv,noheader,nounits
```

For AMD GPUs:

```bash
# AMD GPUs report through hwmon
cat /sys/class/drm/card0/device/hwmon/hwmon*/temp1_input
# Divide by 1000 for Celsius

# Or use radeontop for AMD
sudo apt install -y radeontop
sudo radeontop
```

## Setting Up Prometheus Monitoring

For production servers, export sensor data to Prometheus:

```bash
# Install node_exporter (includes sensor data)
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xf node_exporter-1.7.0.linux-amd64.tar.gz
sudo install -m 755 node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
Type=simple
User=nobody
ExecStart=/usr/local/bin/node_exporter \
    --collector.hwmon \
    --collector.thermal_zone \
    --collector.drbd
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now node_exporter

# Check metrics
curl -s localhost:9100/metrics | grep "node_hwmon_temp"
```

## Temperature Alert Script

A practical script for alerting when temperatures get too high:

```bash
#!/bin/bash
# /usr/local/bin/check-temperatures.sh
# Run via cron or monitoring system

ALERT_THRESHOLD=85     # degrees Celsius
CRITICAL_THRESHOLD=95  # degrees Celsius
LOG_FILE="/var/log/temp-alerts.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Get all temperatures from lm-sensors
while IFS= read -r line; do
    # Parse lines like "Core 0:        +72.0°C"
    if [[ "$line" =~ ^\s*[A-Za-z].*\+([0-9]+)\.[0-9]+°C ]]; then
        sensor_name=$(echo "$line" | cut -d: -f1 | tr -s ' ')
        temp="${BASH_REMATCH[1]}"

        if [ "$temp" -ge "$CRITICAL_THRESHOLD" ]; then
            log "CRITICAL: $sensor_name at ${temp}°C"
            # Add alerting: webhook, email, etc.
        elif [ "$temp" -ge "$ALERT_THRESHOLD" ]; then
            log "WARNING: $sensor_name at ${temp}°C"
        fi
    fi
done < <(sensors)
```

Add to cron:

```bash
# Check every 5 minutes
echo "*/5 * * * * root /usr/local/bin/check-temperatures.sh" | \
    sudo tee /etc/cron.d/temp-check
```

Regular temperature monitoring catches cooling problems before they affect system stability or lifespan. On servers without redundant cooling, an early alert on elevated temperatures can prevent unplanned downtime.
