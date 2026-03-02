# How to Set Up IPMI Remote Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, IPMI, Remote Management, Server, Hardware

Description: A comprehensive guide to configuring and using IPMI remote management on Ubuntu servers with ipmitool, covering sensors, power control, console access, and security hardening.

---

IPMI (Intelligent Platform Management Interface) gives you out-of-band management for servers - the ability to power on/off, access the console, check hardware health, and manage firmware even when the operating system has crashed or the server is powered off. Unlike SSH, IPMI works regardless of OS state because it runs on a separate management controller (BMC - Baseboard Management Controller). This makes it essential for remote server management.

## Understanding IPMI Architecture

IPMI's key components:
- **BMC (Baseboard Management Controller)** - a dedicated processor on the server motherboard with its own network interface, power supply, and firmware
- **IPMI LAN channel** - a dedicated or shared network port for out-of-band management
- **IPMI interface** - the communication protocol between the OS and BMC (KCS for local, LAN for remote)

Vendor implementations: Dell iDRAC, HP iLO, Supermicro IPMI, Lenovo XClarity.

## Installing ipmitool on Ubuntu

```bash
# Install ipmitool
sudo apt update
sudo apt install -y ipmitool

# Also install OpenIPMI kernel module for local access
sudo apt install -y openipmi

# Load the IPMI kernel module
sudo modprobe ipmi_devintf
sudo modprobe ipmi_si

# Make modules load at boot
echo "ipmi_devintf" | sudo tee -a /etc/modules
echo "ipmi_si" | sudo tee -a /etc/modules

# Verify local IPMI is accessible
ls -la /dev/ipmi0
```

## Configuring the IPMI Network Interface

### Checking Current Configuration

```bash
# Check current IPMI LAN settings
sudo ipmitool lan print 1

# Output shows:
# IP Address Source       : Static Address
# IP Address              : 192.168.1.200
# Subnet Mask             : 255.255.255.0
# Default Gateway IP      : 192.168.1.1
# ...
```

### Configuring a Static IP

```bash
# Set IP address assignment to static
sudo ipmitool lan set 1 ipsrc static

# Set IP address
sudo ipmitool lan set 1 ipaddr 192.168.1.200

# Set subnet mask
sudo ipmitool lan set 1 netmask 255.255.255.0

# Set default gateway
sudo ipmitool lan set 1 defgw ipaddr 192.168.1.1

# Verify changes
sudo ipmitool lan print 1
```

### Configuring DHCP

```bash
# Use DHCP for IPMI address
sudo ipmitool lan set 1 ipsrc dhcp
```

## Managing IPMI Users

```bash
# List existing users
sudo ipmitool user list 1

# Enable the admin user (User ID 2 is typically admin)
sudo ipmitool user enable 2

# Set admin password
sudo ipmitool user set password 2 "SecurePassword123!"

# Create a new user
sudo ipmitool user set name 3 "operator"
sudo ipmitool user set password 3 "OperatorPass123!"

# Set user privileges
# 4 = Administrator, 3 = Operator, 2 = User, 1 = Callback
sudo ipmitool channel setaccess 1 3 link=on ipmi=on callin=on privilege=3

# Enable the new user
sudo ipmitool user enable 3

# Verify user configuration
sudo ipmitool user list 1
```

## Remote IPMI Access

Once the BMC has a network address, connect from any machine with `ipmitool`:

```bash
# Basic remote connection syntax
ipmitool -I lanplus \
    -H 192.168.1.200 \
    -U admin \
    -P password \
    <command>

# Save credentials to avoid typing them repeatedly
export IPMI_HOST=192.168.1.200
export IPMI_USER=admin
export IPMI_PASS=password

alias ipmi="ipmitool -I lanplus -H $IPMI_HOST -U $IPMI_USER -P $IPMI_PASS"

# Test connectivity
ipmi chassis status
```

## Power Management

```bash
# Check power status
ipmi chassis power status

# Power on
ipmi chassis power on

# Power off (graceful via ACPI)
ipmi chassis power soft

# Power off (immediate, no OS shutdown)
ipmi chassis power off

# Reboot (graceful)
ipmi chassis power cycle

# Reset (immediate)
ipmi chassis power reset

# Schedule next boot from PXE (once)
ipmi chassis bootdev pxe

# Schedule next boot from DVD
ipmi chassis bootdev cdrom

# Schedule next boot from hard disk
ipmi chassis bootdev disk

# Set BIOS setup on next boot
ipmi chassis bootdev bios
```

## Hardware Sensor Monitoring

```bash
# List all sensors
ipmi sdr

# List sensors with detailed data
ipmi sdr elist

# Filter by type
ipmi sdr type Temperature
ipmi sdr type Fan
ipmi sdr type "Power Supply"
ipmi sdr type "Processor"

# Show sensors in compact format
ipmi sensor list

# Show only sensors in alarm state
ipmi sensor get "CPU Temp" 2>/dev/null

# Show temperature sensors
ipmi sdr type Temperature | grep -i "temp\|thermal"
```

## System Event Log (SEL)

The SEL records hardware events like temperature thresholds exceeded, power supply failures, and correctable ECC errors:

```bash
# List all events
ipmi sel list

# Show last N events
ipmi sel list last 20

# Show events with timestamps
ipmi sel elist

# Check SEL info (size, used entries)
ipmi sel info

# Clear the SEL (careful - this deletes history)
ipmi sel clear

# Save SEL to file
ipmi sel list > /var/log/ipmi-sel-$(date +%Y%m%d).log
```

## Remote Console Access

IPMI provides access to the server's serial console even when the OS is down:

```bash
# Activate serial-over-LAN (SOL) console
ipmitool -I lanplus \
    -H 192.168.1.200 \
    -U admin \
    -P password \
    sol activate

# Deactivate SOL (in another terminal)
ipmitool -I lanplus -H 192.168.1.200 -U admin -P password sol deactivate

# Configure SOL parameters
ipmitool -I lanplus -H 192.168.1.200 -U admin -P password \
    sol set enabled true 1
```

To use SOL effectively, configure Ubuntu's kernel and grub to use serial console:

```bash
# Configure GRUB for serial console output
sudo nano /etc/default/grub

# Add serial console to kernel parameters
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS0,115200n8"
GRUB_TERMINAL="console serial"
GRUB_SERIAL_COMMAND="serial --unit=0 --speed=115200"

sudo update-grub
sudo reboot
```

## Firmware Update via IPMI

```bash
# Check current firmware version
ipmi bmc info

# For Dell: check iDRAC firmware version
ipmi raw 0x30 0x01

# Update BMC firmware (varies by vendor)
# For generic IPMI:
ipmitool -H 192.168.1.200 -U admin -P password \
    hpm upgrade firmware.bin activate
```

## Security Hardening

### Disable Default/Unused Users

```bash
# Disable user ID 1 (anonymous)
sudo ipmitool user disable 1

# Verify no default passwords remain
# Change all default admin credentials
sudo ipmitool user set password 2 "$(openssl rand -base64 24)"
```

### Use IPMI v2.0 (lanplus) Only

```bash
# Disable IPMI v1.5 access (less secure)
sudo ipmitool lan set 1 auth CALLBACK,USER,OPERATOR,ADMIN MD5
```

### Restrict IPMI to Management VLAN

Configure your network switch to put IPMI traffic on a dedicated management VLAN, isolated from production traffic. This prevents production systems from reaching IPMI interfaces.

### Generate Strong Random Credentials

```bash
# Generate a secure password for the BMC
IPMI_PASS=$(openssl rand -base64 20 | tr -d '=/+' | head -c 20)
echo "Generated IPMI password: $IPMI_PASS"

# Set it
sudo ipmitool user set password 2 "$IPMI_PASS"

# Store it in your password manager or secrets vault
```

## Automating IPMI Monitoring

Create a script to check all servers' hardware health:

```bash
#!/bin/bash
# check-ipmi-health.sh - Check hardware health across multiple servers

SERVERS=(
    "192.168.1.200"
    "192.168.1.201"
    "192.168.1.202"
)

IPMI_USER="admin"
IPMI_PASS="password"

for server in "${SERVERS[@]}"; do
    echo "=== Server: $server ==="

    # Check power status
    POWER=$(ipmitool -I lanplus -H "$server" \
        -U "$IPMI_USER" -P "$IPMI_PASS" \
        chassis power status 2>/dev/null)
    echo "Power: $POWER"

    # Count SEL errors
    SEL_ERRORS=$(ipmitool -I lanplus -H "$server" \
        -U "$IPMI_USER" -P "$IPMI_PASS" \
        sel elist 2>/dev/null | \
        grep -ci "critical\|non-recoverable" || true)
    echo "Critical SEL entries: $SEL_ERRORS"

    echo ""
done
```

## Troubleshooting IPMI

```bash
# Test if BMC responds
ping 192.168.1.200

# Test IPMI UDP port (623)
nmap -sU -p 623 192.168.1.200

# Check if IPMI kernel module is loaded
lsmod | grep ipmi

# Check IPMI device files
ls -la /dev/ipmi*

# Test local IPMI access
sudo ipmitool chassis status

# Debug connection issues
ipmitool -I lanplus -H 192.168.1.200 -U admin -P password \
    -v chassis status 2>&1
```

IPMI is one of those tools that seems optional until you desperately need it - when a server is down at 2am and you need to see what the console is showing. Setting it up properly during initial server provisioning saves significant time during incidents.
