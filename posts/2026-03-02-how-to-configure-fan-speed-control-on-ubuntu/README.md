# How to Configure Fan Speed Control on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Fan Control, lm-sensors, Hardware, Server

Description: Learn how to configure fan speed control on Ubuntu using fancontrol and pwmconfig, set up temperature-based fan curves, and manage cooling for servers and workstations.

---

Fan control on Ubuntu sits at the intersection of hardware, kernel drivers, and userspace tools. Getting it working properly requires understanding which hardware supports software fan control, which kernel modules expose the necessary interfaces, and how to configure temperature-based fan curves. When it works well, you get quieter operation at idle and automatic throttling under load. When misconfigured, you can end up with fans stuck at low speed during high temperatures - a risk worth understanding before making changes.

## Prerequisites and Safety Warning

Before adjusting fan speeds, understand the risks. Setting fan speeds too low can cause overheating and hardware damage. Always:
- Monitor temperatures while making changes
- Test changes under load before relying on them
- Keep minimum fan speeds high enough to provide adequate cooling
- Verify changes survive reboots correctly

Hardware support varies by manufacturer and motherboard. Not all hardware exposes fan control interfaces to the OS.

## Installing Required Tools

```bash
# Install fan control tools
sudo apt update
sudo apt install -y fancontrol lm-sensors

# Run sensor detection
sudo sensors-detect --auto

# Load detected modules
sudo service kmod start

# Verify sensors are detected
sensors
```

## Understanding PWM Fan Control

Software fan control works through PWM (Pulse Width Modulation) interfaces exposed by hardware monitoring chips. PWM controls fan speed by varying the duty cycle of a signal.

```bash
# Find available PWM interfaces
ls /sys/class/hwmon/

# Check which hwmon devices exist
for hwmon in /sys/class/hwmon/hwmon*; do
    echo "--- $hwmon ---"
    cat "$hwmon/name" 2>/dev/null
    ls "$hwmon/"
done

# Check if PWM control is available
ls /sys/class/hwmon/hwmon*/pwm*

# Check current PWM value (0=off, 255=full speed)
cat /sys/class/hwmon/hwmon2/pwm1

# Check PWM enable status
# 0 = no control, 1 = manual, 2 = automatic (firmware)
cat /sys/class/hwmon/hwmon2/pwm1_enable
```

## Running pwmconfig

The `pwmconfig` utility helps map fans to PWM outputs and tests control:

```bash
# Run pwmconfig interactively
sudo pwmconfig
```

`pwmconfig` will:
1. Stop each fan briefly to identify which fans can be controlled
2. Ask you to match fans to PWM outputs
3. Generate a configuration file

**WARNING:** During this process, fans will stop temporarily. Run this when the system is idle and cool.

After `pwmconfig` completes, it creates or updates `/etc/fancontrol`.

## Manually Writing fancontrol Configuration

You can write the fancontrol configuration manually if you know your hardware:

```bash
# View the generated config
cat /etc/fancontrol

# Example fancontrol configuration:
sudo tee /etc/fancontrol << 'EOF'
# fancontrol configuration
# Generated manually

# Interval between temperature reads (seconds)
INTERVAL=10

# Hardware monitor paths for fans
FCFANS=/sys/class/hwmon/hwmon2/fan1_input /sys/class/hwmon/hwmon2/fan2_input

# PWM outputs to control
FCPWMS=/sys/class/hwmon/hwmon2/pwm1 /sys/class/hwmon/hwmon2/pwm2

# Temperature sensors to read from
FCSENSORS=/sys/class/hwmon/hwmon0/temp1_input /sys/class/hwmon/hwmon0/temp1_input

# Minimum temperature to start increasing fan speed
MINTEMP=/sys/class/hwmon/hwmon2/pwm1=50 /sys/class/hwmon/hwmon2/pwm2=50

# Temperature at which fan should be at maximum speed
MAXTEMP=/sys/class/hwmon/hwmon2/pwm1=80 /sys/class/hwmon/hwmon2/pwm2=75

# Minimum PWM value (fan still spinning but slow)
MINPWM=/sys/class/hwmon/hwmon2/pwm1=80 /sys/class/hwmon/hwmon2/pwm2=80

# Maximum PWM value (full speed)
MAXPWM=/sys/class/hwmon/hwmon2/pwm1=255 /sys/class/hwmon/hwmon2/pwm2=255

# Minimum start PWM value (to start fans from stopped)
MINSTOP=/sys/class/hwmon/hwmon2/pwm1=60 /sys/class/hwmon/hwmon2/pwm2=60
EOF
```

The configuration maps each PWM output to a temperature sensor and defines:
- **MINTEMP**: Temperature below which fans run at minimum speed
- **MAXTEMP**: Temperature at which fans run at maximum speed
- **MINPWM**: PWM value for minimum fan speed (0-255)
- **MAXPWM**: PWM value for maximum fan speed (0-255)

## Enabling and Starting fancontrol

```bash
# Start fancontrol
sudo systemctl start fancontrol

# Enable on boot
sudo systemctl enable fancontrol

# Check status
systemctl status fancontrol

# View fancontrol logs
journalctl -u fancontrol -f
```

## Manual Fan Speed Control for Testing

Before setting up automatic control, test manual control:

```bash
# Enable manual PWM control (disables automatic firmware control)
echo 1 | sudo tee /sys/class/hwmon/hwmon2/pwm1_enable

# Set fan speed (0=off, 128=50%, 255=100%)
echo 128 | sudo tee /sys/class/hwmon/hwmon2/pwm1

# Verify the fan speed changed
cat /sys/class/hwmon/hwmon2/fan1_input

# Return to automatic firmware control
echo 2 | sudo tee /sys/class/hwmon/hwmon2/pwm1_enable

# Or let fancontrol manage it
sudo systemctl restart fancontrol
```

Never leave fans in manual mode without a daemon managing them. If the system crashes or the daemon stops, fans stay at whatever speed they were last set to.

## Dell iDRAC Fan Control

Dell servers use iDRAC for fan management and often override OS-level fan control. To enable manual fan control on Dell servers:

```bash
# Install ipmitool
sudo apt install -y ipmitool

# Enable manual fan control via IPMI
sudo ipmitool raw 0x30 0x30 0x01 0x00

# Set fan speed (percentage) - 0x14 = 20%
sudo ipmitool raw 0x30 0x30 0x02 0xff 0x14

# Set to 30%
sudo ipmitool raw 0x30 0x30 0x02 0xff 0x1e

# Re-enable automatic fan control
sudo ipmitool raw 0x30 0x30 0x01 0x01
```

Create a script for temperature-based Dell fan control:

```bash
#!/bin/bash
# dell-fan-control.sh - Temperature-based fan control for Dell servers

set -euo pipefail

# Get current CPU temperature
CPU_TEMP=$(sensors -j 2>/dev/null | \
    jq -r '."coretemp-isa-0000"."Package id 0".temp1_input // 0')

CPU_TEMP_INT=$(echo "$CPU_TEMP" | awk '{printf "%d", $1}')

# Define fan speed based on temperature
if [ "$CPU_TEMP_INT" -lt 45 ]; then
    FAN_SPEED=20   # 20% at cool temps
elif [ "$CPU_TEMP_INT" -lt 60 ]; then
    FAN_SPEED=35   # 35% at moderate temps
elif [ "$CPU_TEMP_INT" -lt 70 ]; then
    FAN_SPEED=55   # 55% at warm temps
elif [ "$CPU_TEMP_INT" -lt 80 ]; then
    FAN_SPEED=75   # 75% at hot temps
else
    FAN_SPEED=100  # Full speed when very hot
    logger "WARNING: High CPU temperature: ${CPU_TEMP_INT}°C"
fi

# Convert percentage to hex
FAN_HEX=$(printf "0x%02x" $FAN_SPEED)

# Enable manual control and set speed
ipmitool raw 0x30 0x30 0x01 0x00
ipmitool raw 0x30 0x30 0x02 0xff "$FAN_HEX"
```

Run via cron:

```bash
# Check and adjust every minute
echo "* * * * * root /usr/local/bin/dell-fan-control.sh" | \
    sudo tee /etc/cron.d/dell-fan-control
```

## HP iLO Fan Control

On HP ProLiant servers:

```bash
# HP servers also respond to IPMI commands
# Check server documentation for specific OEM extensions

# Standard IPMI fan monitoring
sudo ipmitool sdr type Fan

# HP-specific: disable dynamic fan control (varies by model)
# Consult HP iLO documentation for your server model
```

## Verifying Fan Control Works

```bash
# Monitor temperatures and fan speeds simultaneously
watch -n2 '
    echo "=== Temperatures ==="
    sensors | grep -E "temp|Core|Package"
    echo ""
    echo "=== Fan Speeds ==="
    sensors | grep -i fan
    echo ""
    echo "=== PWM Values ==="
    for pwm in /sys/class/hwmon/hwmon*/pwm[0-9]; do
        [ -f "$pwm" ] && echo "$pwm: $(cat $pwm)"
    done
'
```

## Troubleshooting Fan Control

```bash
# Check if the required modules are loaded
lsmod | grep -E "nct6775|it87|w83"

# Check kernel messages for hardware monitoring
dmesg | grep -i "hwmon\|fan\|pwm\|nct\|it87"

# Verify hwmon devices exist
ls /sys/class/hwmon/

# Check if the chip supports PWM
ls /sys/class/hwmon/hwmon2/ | grep pwm

# fancontrol logs
journalctl -u fancontrol --no-pager

# Test fancontrol configuration without starting
sudo fancontrol /etc/fancontrol
```

If `pwmconfig` doesn't find any controllable fans, your hardware likely doesn't expose software fan control. In that case, rely on BIOS/UEFI settings or server-specific management tools (iDRAC, iLO) for fan configuration.

Proper fan control balances noise reduction against thermal safety. For production servers, slightly louder fans running on automatic control are safer than optimized manual curves that might not account for unusual workloads or ambient temperature changes.
