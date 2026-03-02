# How to Use IPMI/BMC for Remote Server Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, IPMI, BMC, Server Management, Out-of-Band Management

Description: Learn how to use IPMI and BMC tools on Ubuntu for out-of-band server management, including ipmitool usage, sensor monitoring, power control, and SOL console access.

---

IPMI (Intelligent Platform Management Interface) is a standardized protocol for out-of-band server management. The BMC (Baseboard Management Controller) is the hardware that implements it - a dedicated microcontroller on the server motherboard with its own network port, power supply, and firmware. When your server is powered off, unresponsive, or in a kernel panic, the BMC is still running and you can still reach it.

This is hardware-level remote management: power on/off, sensor readings, BIOS-level console access, and hardware health monitoring, all without needing the operating system to be functional.

## Installing ipmitool on Ubuntu

`ipmitool` is the standard command-line interface for interacting with IPMI:

```bash
# Install ipmitool
sudo apt update
sudo apt install -y ipmitool

# For in-band access (managing the local server's BMC)
# Load the IPMI kernel modules
sudo modprobe ipmi_msghandler
sudo modprobe ipmi_devintf
sudo modprobe ipmi_si

# Make modules load at boot
echo "ipmi_msghandler" | sudo tee -a /etc/modules
echo "ipmi_devintf" | sudo tee -a /etc/modules
echo "ipmi_si" | sudo tee -a /etc/modules

# Verify the device exists
ls /dev/ipmi0
```

## Local vs Remote Access

IPMI can be accessed in two ways:

**In-band**: Running `ipmitool` on the server itself to talk to the local BMC via the kernel driver.

```bash
# In-band (no -H flag)
sudo ipmitool chassis status
```

**Out-of-band**: Running `ipmitool` from a remote machine, connecting to the BMC's dedicated network port.

```bash
# Out-of-band requires BMC IP, username, and password
ipmitool -H 192.168.100.50 -U admin -P password chassis status
```

## Configuring the BMC Network Interface

Before you can use out-of-band access, the BMC needs a network address:

```bash
# View current network configuration
sudo ipmitool lan print 1

# Configure static IP on the BMC
sudo ipmitool lan set 1 ipsrc static
sudo ipmitool lan set 1 ipaddr 192.168.100.50
sudo ipmitool lan set 1 netmask 255.255.255.0
sudo ipmitool lan set 1 defgw ipaddr 192.168.100.1

# Enable IPMI over LAN
sudo ipmitool lan set 1 access on

# Verify the settings
sudo ipmitool lan print 1
```

## Managing BMC User Accounts

```bash
# List existing users
sudo ipmitool user list 1

# Create a new user (slot 3 in this example)
sudo ipmitool user set name 3 ipmiuser
sudo ipmitool user set password 3 StrongPassword123

# Set administrator privilege
sudo ipmitool user priv 3 4 1
# Privilege levels: 2=User, 3=Operator, 4=Administrator

# Enable the user
sudo ipmitool user enable 3

# Verify
sudo ipmitool user list 1

# Enable IPMI messaging for the user on LAN channel
sudo ipmitool channel setaccess 1 3 callin=on ipmi=on link=on privilege=4
```

## Power Management

Power control is one of the most useful IPMI features - restart a hung server without needing physical access:

```bash
# Out-of-band power operations (run from your workstation)
IPMI_HOST="192.168.100.50"
IPMI_USER="admin"
IPMI_PASS="password"

# Check current power status
ipmitool -H $IPMI_HOST -U $IPMI_USER -P $IPMI_PASS chassis power status

# Power on the server
ipmitool -H $IPMI_HOST -U $IPMI_USER -P $IPMI_PASS chassis power on

# Graceful shutdown (OS-level)
ipmitool -H $IPMI_HOST -U $IPMI_USER -P $IPMI_PASS chassis power soft

# Hard power off (like pulling the plug)
ipmitool -H $IPMI_HOST -U $IPMI_USER -P $IPMI_PASS chassis power off

# Hard power cycle (power off then on)
ipmitool -H $IPMI_HOST -U $IPMI_USER -P $IPMI_PASS chassis power cycle

# Reset (like pressing reset button)
ipmitool -H $IPMI_HOST -U $IPMI_USER -P $IPMI_PASS chassis power reset
```

## Hardware Sensor Monitoring

BMC sensors give you hardware-level readings regardless of OS state:

```bash
# List all sensor readings
sudo ipmitool sensor list

# Filter to just temperature sensors
sudo ipmitool sensor list | grep -i "temp\|fan\|volt"

# Get specific sensor reading
sudo ipmitool sensor get "CPU Temp"

# Check system event log for hardware errors
sudo ipmitool sel list

# Get detailed system event log
sudo ipmitool sel elist

# Clear the event log (after reviewing it)
sudo ipmitool sel clear
```

Example sensor output:
```
CPU Temp         | 45.000     | degrees C  | ok    | 0.000     | 0.000     | 0.000     | 85.000    | 90.000    | 95.000
Fan1A RPM        | 3300.000   | RPM        | ok    | 300.000   | 500.000   | 600.000   | na        | na        | na
```

## Serial Over LAN (SOL) Console

SOL gives you a serial console through the IPMI connection. This is invaluable for accessing BIOS, watching boot messages, or getting a shell when SSH is unavailable:

```bash
# Activate SOL console (out-of-band)
ipmitool -H $IPMI_HOST -U $IPMI_USER -P $IPMI_PASS sol activate

# Press Enter to get a prompt if the OS is running
# Use ~ + . to terminate the SOL session (like SSH escape sequence)
# Or: ipmitool sol deactivate

# Check SOL configuration
sudo ipmitool sol info
```

For SOL to work with Ubuntu, the kernel needs to output to serial and a serial console must be configured:

```bash
# On the Ubuntu server, configure serial console
# Add to /etc/default/grub:
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS1,115200n8"

sudo update-grub

# Enable getty on the serial port
sudo systemctl enable serial-getty@ttyS1.service
sudo systemctl start serial-getty@ttyS1.service
```

## Monitoring with IPMI and OpenIPMI

For ongoing hardware health monitoring, integrate IPMI data into your monitoring stack:

```bash
# Install OpenIPMI daemon for sensor data
sudo apt install -y openipmi

# Enable and start
sudo systemctl enable --now openipmi

# Use ipmitool with OpenIPMI driver
sudo ipmitool -I open sensor list

# Export sensor data to Prometheus with prometheus-ipmi-exporter
# (Available at https://github.com/prometheus-community/ipmi_exporter)
wget https://github.com/prometheus-community/ipmi_exporter/releases/download/v1.8.0/ipmi_exporter-1.8.0.linux-amd64.tar.gz
tar xzf ipmi_exporter-*.tar.gz
sudo mv ipmi_exporter-*/ipmi_exporter /usr/local/bin/
sudo systemctl enable --now ipmi_exporter
```

## Scripting IPMI Checks

```bash
#!/bin/bash
# ipmi_health_check.sh - Quick hardware health check

IPMI_HOST="${1:-localhost}"
OPTS=""

if [ "$IPMI_HOST" != "localhost" ]; then
    OPTS="-H $IPMI_HOST -U admin -P password"
fi

echo "=== Power Status ==="
ipmitool $OPTS chassis power status

echo ""
echo "=== Critical Sensors ==="
ipmitool $OPTS sensor list | awk '$NF != "ok" && NF > 2 {print}'

echo ""
echo "=== Recent Events ==="
ipmitool $OPTS sel elist | tail -10

echo ""
echo "=== Chassis Status ==="
ipmitool $OPTS chassis status
```

## Security Considerations

IPMI has a troubled history with security vulnerabilities (IPMI 2.0 has a cipher-0 authentication bypass, among others). Take these precautions:

```bash
# Disable cipher 0 (unauthenticated access)
sudo ipmitool lan set 1 cipher_suite_priv_max XcXXXXXXXXXXXXXX

# Use IPMI 2.0 with cipher suite 17 (AES-128 encryption)
ipmitool -H $IPMI_HOST -U admin -P password -I lanplus -C 17 chassis status

# Always put IPMI interfaces on a separate management VLAN
# Never expose IPMI ports directly to the internet
# Change default credentials immediately
# Keep BMC firmware updated
```

IPMI/BMC access should be treated as highly privileged - it is equivalent to physical access to the machine. Restrict network access to it aggressively.
