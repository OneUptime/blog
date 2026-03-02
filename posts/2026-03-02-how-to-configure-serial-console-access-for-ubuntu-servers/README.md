# How to Configure Serial Console Access for Ubuntu Servers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Serial Console, Remote Access, Server Administration, Troubleshooting

Description: Learn how to configure serial console access on Ubuntu servers for out-of-band management, covering GRUB configuration, getty setup, and serial-over-LAN with IPMI.

---

A serial console gives you access to your server even when the network is completely down, the OS is hanging at boot, or you need to interact with GRUB. Combined with a serial console server or IPMI Serial Over LAN (SOL), it becomes a reliable out-of-band management channel that does not depend on the network stack being functional.

This is one of those things you want to set up before you need it.

## Understanding Serial Consoles on Linux

Linux can output kernel messages and provide a login shell over a serial port. This requires two pieces of configuration:

1. **Kernel / GRUB** - Output boot messages and the GRUB menu to the serial port
2. **systemd getty** - Run a login shell on the serial port after boot

The serial port on server hardware is typically `ttyS0` (COM1) or `ttyS1` (COM2). Check your server documentation. For IPMI SOL, it is often `ttyS1` at 115200 baud.

## Step 1: Configure GRUB for Serial Console

```bash
# Edit GRUB configuration
sudo nano /etc/default/grub
```

Add or modify these lines:

```bash
# /etc/default/grub

# Send console output to both video and serial
GRUB_TERMINAL="console serial"

# Serial port settings - adjust port and baud rate for your hardware
# ttyS0 = COM1, ttyS1 = COM2
GRUB_SERIAL_COMMAND="serial --speed=115200 --unit=0 --word=8 --parity=no --stop=1"

# Kernel command line - add console=ttyS0,115200n8 for serial output
# Keep console=tty0 for video output as well
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS0,115200n8"

# Optional: show GRUB menu (default is to boot immediately)
GRUB_TIMEOUT=10
GRUB_RECORDFAIL_TIMEOUT=30
```

Apply the changes:

```bash
sudo update-grub
```

Verify the generated GRUB config:

```bash
grep -E "serial|console" /boot/grub/grub.cfg | head -20
```

## Step 2: Configure systemd getty on the Serial Port

Getty provides the login prompt on the serial port after the OS boots:

```bash
# Enable getty on ttyS0 (adjust to your port)
sudo systemctl enable serial-getty@ttyS0.service
sudo systemctl start serial-getty@ttyS0.service

# Check status
sudo systemctl status serial-getty@ttyS0.service
```

For custom baud rate settings:

```bash
# Override the default getty configuration
sudo mkdir -p /etc/systemd/system/serial-getty@ttyS0.service.d/

sudo tee /etc/systemd/system/serial-getty@ttyS0.service.d/override.conf <<'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --keep-baud 115200,57600,38400,9600 %I $TERM
EOF

sudo systemctl daemon-reload
sudo systemctl restart serial-getty@ttyS0.service
```

## Step 3: Verify Serial Console is Working

```bash
# Check if the port exists and what parameters it's running at
stty -F /dev/ttyS0

# Check kernel is outputting to the port
dmesg | grep -i "console\|ttyS0"

# Check that getty is listening
systemctl status serial-getty@ttyS0.service
ps aux | grep getty
```

## Connecting to the Serial Console

### Physical RS-232 Connection

For physical serial ports, connect with a null modem cable and use a terminal program:

```bash
# From a connected Linux machine
sudo apt install -y minicom screen

# Using screen
sudo screen /dev/ttyS0 115200

# Using minicom
sudo minicom -s  # Configure port settings
# Or directly:
sudo minicom -D /dev/ttyS0 -b 115200

# Exit screen: Ctrl+A then \
# Exit minicom: Ctrl+A then X
```

### USB-to-Serial Adapter

```bash
# Plug in USB-to-serial adapter
dmesg | tail -20  # Look for ttyUSB0 or similar

# Connect
sudo screen /dev/ttyUSB0 115200
```

### IPMI Serial Over LAN (SOL)

This is the most common modern use case - access the serial console over the network via IPMI:

```bash
# Install ipmitool
sudo apt install -y ipmitool

# Enable SOL on the BMC
sudo ipmitool sol set enabled true 1
sudo ipmitool sol set baud-rate 115200 1

# From a remote machine, activate SOL
ipmitool -H <bmc-ip> -U admin -P password sol activate

# Press Enter to get a prompt
# Terminate with ~ and . (tilde then period, same as SSH escape)
```

For SOL to work, the GRUB and getty configuration above must match the serial port the BMC uses (typically `ttyS1` for IPMI SOL on many Dell/HPE servers).

### Checking Which Port Your BMC Uses

```bash
# For Dell iDRAC - check iDRAC serial port assignment
sudo racadm get iDRAC.SerialCapture

# For IPMI in general
sudo ipmitool sol info

# Common combinations:
# Dell servers: ttyS1 at 115200
# HP servers: ttyS1 at 115200
# Supermicro: ttyS1 at 57600 or 115200
```

## Dual Console Configuration

Running both video and serial consoles simultaneously is the recommended setup for production servers:

```bash
# In /etc/default/grub
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS1,115200n8"
# Note: the LAST console= entry is the one used for /dev/console
# Order matters: tty0 first means TTY1 is primary, ttyS1 gets same output
```

When multiple `console=` arguments are given, Linux sends kernel messages to all of them. The last one in the list becomes `/dev/console` and is used for system messages that reference the console directly.

```bash
# Enable getty on both
sudo systemctl enable serial-getty@tty1.service    # Video terminal
sudo systemctl enable serial-getty@ttyS1.service   # Serial console
```

## Serial Console in Cloud and VM Environments

For VM-based Ubuntu (not physical hardware), serial console works slightly differently:

### AWS EC2

```bash
# AWS EC2 serial console access is available in the EC2 console
# Instance must be configured for it

# Verify EC2 serial console support
aws ec2 describe-instance-attribute \
    --instance-id i-xxxxx \
    --attribute enaSrdSpecification

# Enable serial console access (EC2 Instance Connect Endpoint required)
# Configuration is the same as physical - GRUB + getty
```

### KVM/QEMU Virtual Machines

```bash
# Connect to serial console of a KVM VM
sudo virsh console vm-name

# The VM must be configured with:
# <serial type='pty'>
#   <target port='0'/>
# </serial>
# <console type='pty'>
#   <target type='serial' port='0'/>
# </console>
```

## Automating Console Logging

Log everything written to the serial console for later review:

```bash
# Use conserver or serialconsole daemon for logging
sudo apt install -y conserver-server

# /etc/conserver.cf
sudo tee /etc/conserver.cf <<'EOF'
default * {
    logfile /var/log/conserver/%&.log;
    logfilemax 100m;
    timestamp "";
}

console server1 {
    type host;
    host 192.168.100.50;  # BMC IP for SOL
    port 623;
    protocol ipmi;
}
EOF

sudo systemctl enable --now conserver
# Access: console server1
```

## Troubleshooting

```bash
# GRUB menu not appearing on serial?
# Verify GRUB_TERMINAL includes "serial"
grep GRUB_TERMINAL /etc/default/grub

# No login prompt after boot?
systemctl status serial-getty@ttyS0.service
# Check if the unit failed or if port is wrong

# Garbled output?
# Baud rate mismatch - verify both sides use same rate
# 115200 is standard for modern servers

# Console output stopping mid-boot?
# Check if something grabbed the tty
fuser /dev/ttyS0
```

Serial console access is a foundational piece of server infrastructure that most teams only think about after a crisis. Setting it up takes 15 minutes. Not having it when your SSH daemon crashes and the server is in a datacenter 500 miles away is a very expensive problem.
