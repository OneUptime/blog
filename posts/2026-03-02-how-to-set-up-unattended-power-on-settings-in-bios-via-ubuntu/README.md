# How to Set Up Unattended Power-On Settings in BIOS via Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, BIOS, Power Management, ACPI, Wake-on-LAN

Description: Configure automatic power-on after power loss and Wake-on-LAN settings on Ubuntu servers using ACPI, rtcwake, and network-based wake tools.

---

Servers need to recover automatically from power outages. When power returns after an outage, a server sitting in an off state needs human intervention unless it's configured to power on automatically. Ubuntu doesn't control this directly - the BIOS/UEFI firmware does - but Linux provides tools to configure ACPI-based wake timers and Wake-on-LAN, and you can interact with some BIOS settings through the OS.

## BIOS Setting: Restore on AC Power Loss

The most important setting for unattended power-on is "Restore on AC Power Loss" (or equivalent - naming varies by manufacturer):

- **Power On** - always power on when AC is restored (correct for servers)
- **Last State** - return to the state before power was lost
- **Power Off** - stay off until manually powered on (default on many systems)

This setting is in BIOS/UEFI and must be configured there. On servers with IPMI (Dell iDRAC, HP iLO, Supermicro IPMI), you can sometimes configure this remotely.

## Configuring Power Restore via IPMI

IPMI allows remote BIOS configuration on supported server hardware:

```bash
# Install ipmitool
sudo apt install -y ipmitool

# Connect to local IPMI (if supported)
sudo ipmitool chassis policy list

# Set policy to always-on after power loss
sudo ipmitool chassis policy always-on

# Set policy to last-state (returns to pre-power-loss state)
sudo ipmitool chassis policy previous

# Set policy to stay-off
sudo ipmitool chassis policy always-off
```

For remote IPMI management:

```bash
# Connect to a remote server's IPMI
ipmitool -I lanplus \
    -H 192.168.1.10 \
    -U admin \
    -P password \
    chassis policy always-on

# Power on a remote server
ipmitool -I lanplus -H 192.168.1.10 -U admin -P password chassis power on

# Get current power status
ipmitool -I lanplus -H 192.168.1.10 -U admin -P password chassis power status
```

## Using rtcwake for Scheduled Power-On

`rtcwake` programs the Real Time Clock (RTC) to wake the system at a specific time. The system can be put to sleep and will wake automatically:

```bash
# Install rtcwake (part of util-linux)
rtcwake --version

# Wake up in 3600 seconds (1 hour)
sudo rtcwake -m mem -s 3600    # suspend to RAM
sudo rtcwake -m disk -s 3600   # hibernate
sudo rtcwake -m off -s 3600    # power off (wake via RTC)

# Wake up at a specific time
sudo rtcwake -m off -t $(date +%s -d "tomorrow 06:00")

# Show current RTC alarm setting
sudo rtcwake -m show

# Wake up and run a command, then shut down again
# (useful for scheduled maintenance windows)
sudo rtcwake -m off -t $(date +%s -d "03:00 tomorrow")
```

After `rtcwake -m off`, the system powers off. The RTC alarm is set. When the RTC alarm fires, the system powers back on and boots normally.

## Checking RTC Alarm Directly

```bash
# Check if RTC wake is enabled
cat /proc/driver/rtc

# Check the alarm setting
cat /sys/class/rtc/rtc0/wakealarm

# Set wake alarm directly (Unix timestamp)
WAKE_TIME=$(date +%s -d "tomorrow 07:00")
echo 0 | sudo tee /sys/class/rtc/rtc0/wakealarm  # clear existing
echo $WAKE_TIME | sudo tee /sys/class/rtc/rtc0/wakealarm

# Verify the alarm is set
cat /sys/class/rtc/rtc0/wakealarm
date -d @$(cat /sys/class/rtc/rtc0/wakealarm)  # human-readable time
```

## Wake-on-LAN Configuration

Wake-on-LAN (WoL) lets you power on a machine remotely by sending a magic packet to its network interface. The machine must be in a powered-off-but-AC-connected state (S5 or S4/S3 sleep).

### Enabling WoL in BIOS

WoL must first be enabled in BIOS:
- Look for "Wake on LAN", "Boot from LAN", or "WoL" settings
- Enable it for the network interface you want to use

### Configuring WoL in Ubuntu

```bash
# Install ethtool
sudo apt install -y ethtool

# Check current WoL settings
sudo ethtool eth0 | grep Wake

# Enable Wake-on-LAN (g = magic packet)
sudo ethtool -s eth0 wol g

# Verify it's enabled
sudo ethtool eth0 | grep -A2 "Wake-on"
# Wake-on: g   <- means enabled
```

### Making WoL Persistent

WoL settings reset on reboot. Make them persistent:

**Method 1: systemd service**

```bash
sudo tee /etc/systemd/system/wol-enable.service << 'EOF'
[Unit]
Description=Enable Wake-on-LAN
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/ethtool -s eth0 wol g
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now wol-enable.service
```

**Method 2: Netplan configuration**

Ubuntu 20.04+ with Netplan:

```yaml
# /etc/netplan/01-config.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      wakeonlan: true  # Enable WoL in Netplan
```

```bash
sudo netplan apply
```

**Method 3: NetworkManager**

```bash
# If using NetworkManager
nmcli connection modify "Wired connection 1" 802-3-ethernet.wake-on-lan magic

# Restart NetworkManager
sudo systemctl restart NetworkManager
```

### Sending WoL Magic Packets

From another machine on the network:

```bash
# Install wol tool
sudo apt install -y wakeonlan

# Get the MAC address of the target machine
ip link show eth0 | grep "link/ether"
# or from the target machine's IPMI/remote console

# Send the magic packet
wakeonlan aa:bb:cc:dd:ee:ff

# If the machine is on a different subnet
wakeonlan -i 192.168.1.255 aa:bb:cc:dd:ee:ff

# Alternative using etherwake
sudo apt install -y etherwake
sudo etherwake aa:bb:cc:dd:ee:ff
```

From Python (useful for automation):

```python
#!/usr/bin/env python3
# send-wol.py - Send Wake-on-LAN magic packet

import socket
import struct

def wake_on_lan(mac_address):
    """Send Wake-on-LAN magic packet to MAC address."""
    # Parse MAC address
    mac_bytes = bytes.fromhex(mac_address.replace(':', '').replace('-', ''))

    # Build magic packet: 6x FF + 16x MAC address
    magic_packet = b'\xff' * 6 + mac_bytes * 16

    # Send via UDP broadcast
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.sendto(magic_packet, ('<broadcast>', 9))

    print(f"Magic packet sent to {mac_address}")

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} MAC_ADDRESS")
        sys.exit(1)
    wake_on_lan(sys.argv[1])
```

## Scheduling Automatic Shutdown and Wake

For servers that should only run during business hours:

```bash
# Create a script to schedule next wake time before shutdown
sudo tee /usr/local/bin/schedule-wake.sh << 'EOF'
#!/bin/bash
# Schedule wake at next business day 07:00 and shut down

# Calculate next wake time
NEXT_WAKE=$(date +%s -d "tomorrow 07:00")

# If today is Friday, wake on Monday
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
if [ "$DAY_OF_WEEK" -eq 5 ]; then
    NEXT_WAKE=$(date +%s -d "monday 07:00")
fi

# Set RTC alarm
echo 0 | sudo tee /sys/class/rtc/rtc0/wakealarm
echo $NEXT_WAKE | sudo tee /sys/class/rtc/rtc0/wakealarm

echo "Wake scheduled for: $(date -d @$NEXT_WAKE)"

# Shut down
sudo shutdown -h now
EOF

chmod +x /usr/local/bin/schedule-wake.sh

# Schedule shutdown at end of business hours
echo "0 20 * * 1-5 root /usr/local/bin/schedule-wake.sh" | \
    sudo tee /etc/cron.d/business-hours-shutdown
```

## Verifying the Setup

```bash
# Check power restore policy via IPMI
sudo ipmitool chassis policy list

# Check WoL status
sudo ethtool eth0 | grep -A2 "Wake-on"

# Check RTC alarm
cat /sys/class/rtc/rtc0/wakealarm
[ -s /sys/class/rtc/rtc0/wakealarm ] && \
    echo "Wake set for: $(date -d @$(cat /sys/class/rtc/rtc0/wakealarm))" || \
    echo "No wake alarm set"

# Test WoL from another machine before relying on it
# This ensures the packet gets through firewall/switch
```

For critical servers in production, combine multiple power-on methods: BIOS "restore on AC power loss" for power outage recovery, IPMI for remote management, and WoL as a backup for scheduled wake-ups. Testing each method before you need it in an emergency saves considerable stress.
