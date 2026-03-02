# How to Troubleshoot Network Drops and Intermittent Connectivity on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Troubleshooting, Network Configuration, System Administration

Description: Diagnose and fix intermittent network connectivity issues on Ubuntu, covering driver problems, power management settings, hardware issues, and network configuration bugs.

---

Intermittent network drops are among the most frustrating problems to diagnose because by definition the issue is not present when you're actively looking for it. The key is capturing diagnostic data when drops occur, then correlating that data with system events.

## Setting Up Continuous Monitoring Before Diagnosing

Before doing anything else, set up continuous monitoring to capture data when the next drop occurs:

```bash
#!/bin/bash
# /usr/local/bin/network-monitor.sh
# Runs in background, logs drops with timestamps and diagnostic info

GATEWAY=$(ip route | awk '/default/ {print $3}' | head -1)
EXTERNAL="8.8.8.8"
LOG="/var/log/network-drops.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

log "Starting network monitor. Gateway: $GATEWAY"

while true; do
    # Test gateway connectivity
    if ! ping -c 2 -W 2 "$GATEWAY" > /dev/null 2>&1; then
        log "GATEWAY UNREACHABLE: $GATEWAY"
        # Capture network state at time of failure
        ip addr show >> "$LOG"
        ip route show >> "$LOG"
        # Check for interface errors
        ip -s link show >> "$LOG"
        dmesg | tail -20 >> "$LOG"
    else
        # Test external connectivity
        if ! ping -c 2 -W 2 "$EXTERNAL" > /dev/null 2>&1; then
            log "EXTERNAL UNREACHABLE (gateway OK): $EXTERNAL"
        fi
    fi
    sleep 10
done
```

```bash
chmod +x /usr/local/bin/network-monitor.sh
# Run as background service
nohup /usr/local/bin/network-monitor.sh &
echo $! > /var/run/network-monitor.pid
```

## Checking Interface Error Counters

Network drops often correlate with interface errors:

```bash
# Show interface statistics including error counts
ip -s link show eth0

# Example output:
# RX:  bytes   packets errors dropped  missed   mcast
#    1234567    12345      5       0       0      89
# TX:  bytes   packets errors dropped carrier  collsns
#     567890     5678      0       0       0       0

# Increasing error counts are concerning - run this repeatedly to see if they grow
watch -n 5 "ip -s link show eth0"

# Also check with ethtool for driver-level statistics
sudo ethtool -S eth0 | grep -iE "error|drop|miss|fail"
```

### Interpreting Error Counters

- **RX errors**: Incoming packet errors - typically physical layer (cable, NIC hardware)
- **TX errors**: Outgoing packet errors - can indicate congestion or hardware issues
- **Dropped**: Packets dropped due to buffer overflows or firewall rules
- **Overruns**: Hardware buffer overflow - often indicates driver or hardware performance issue

## Checking Driver and Hardware Issues

Network drivers are a common cause of intermittent drops:

```bash
# Check network interface driver
sudo ethtool -i eth0
# driver: e1000e
# version: 3.2.6-k
# bus-info: 0000:00:19.0

# Check for driver-specific messages
sudo dmesg | grep -iE "eth0|eno1|e1000|r8169|iwlwifi|realtek" | grep -iE "error|reset|link|disconnect"

# Common driver issues show as:
# e1000e 0000:00:19.0 eth0: Detected Hardware Unit Hang
# r8169: eth0 link down
# iwlwifi: Microcode SW error detected

# Check if driver is being reset (indicates hardware problems)
sudo dmesg -T | grep -i "reset"
```

### Updating Network Drivers

```bash
# Check current driver version
modinfo e1000e | grep version

# Update via package manager
sudo apt-get install --reinstall linux-modules-$(uname -r)

# Or install updated driver via DKMS (vendor-specific)
# For Realtek r8168 (often has better driver than in-kernel r8169)
sudo apt-get install -y r8168-dkms

# Check if driver needs firmware
sudo dmesg | grep -i firmware
# If missing firmware, install linux-firmware
sudo apt-get install -y linux-firmware
```

## Power Management Issues (Very Common)

NetworkManager and the Linux power management subsystem can put NICs to sleep to save power, causing intermittent drops. This is one of the most common causes of intermittent connectivity on laptops and some desktop systems.

```bash
# Check if power management is enabled for the NIC
sudo ethtool -s eth0 | grep power
# Or
cat /sys/class/net/eth0/device/power/control
# "auto" = power management enabled (may sleep)
# "on" = always powered (better for servers)

# Disable power management for the NIC
echo on | sudo tee /sys/class/net/eth0/device/power/control

# For WiFi adapters, disable power save mode
sudo iwconfig wlan0 power off

# Make it permanent using udev rules
cat > /etc/udev/rules.d/81-netif-power.rules << 'EOF'
# Disable power management for network adapters
ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth*", RUN+="/bin/sh -c 'echo on > /sys/class/net/$kernel/device/power/control'"
ACTION=="add", SUBSYSTEM=="net", KERNEL=="wlan*", RUN+="/usr/sbin/iwconfig $kernel power off"
EOF

sudo udevadm control --reload-rules
```

### NetworkManager Power Management

```bash
# Check NetworkManager connection settings for power management
nmcli connection show "Wired connection 1" | grep power

# Disable WiFi power saving via NetworkManager config
sudo nano /etc/NetworkManager/conf.d/default-wifi-powersave-off.conf
```

```ini
[connection]
# Disable WiFi power saving (wifi.powersave = 2 means disabled)
wifi.powersave = 2
```

```bash
sudo systemctl restart NetworkManager
```

## Checking DNS Resolution Issues

Some "network drops" are actually DNS resolution failures:

```bash
# Test DNS resolution speed and reliability
time dig google.com @8.8.8.8
time dig google.com @1.1.1.1

# Test with your configured DNS servers
cat /etc/resolv.conf
dig google.com

# If DNS is slow, check DNS server response times
for dns in 8.8.8.8 1.1.1.1 9.9.9.9; do
    echo -n "DNS $dns: "
    time dig +short google.com @$dns 2>&1 | tail -1
done

# Check for DNS timeout messages
sudo journalctl -f | grep -i "dns\|resolv\|NXDOMAIN"
```

## Checking for DHCP Lease Renewal Issues

DHCP lease renewals can cause brief connectivity interruptions:

```bash
# Check DHCP lease information
cat /var/lib/dhcp/dhclient.leases

# Check DHCP-related log messages
sudo journalctl | grep -iE "dhcp|lease|renew" | tail -20

# Check NetworkManager DHCP events
sudo journalctl -u NetworkManager | grep -i dhcp

# If DHCP renewals are causing drops, consider a static IP
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 1.1.1.1
          - 8.8.8.8
```

## MTU and TCP Offloading Issues

MTU mismatches and problematic TCP offloading settings can cause intermittent failures, particularly for larger transfers:

```bash
# Check current MTU
ip link show eth0 | grep mtu

# Test if MTU is causing issues (fragment path MTU discovery)
ping -M do -s 1400 8.8.8.8    # Should work if MTU >= 1428
ping -M do -s 1472 8.8.8.8    # Standard Ethernet frame test
# If the larger ping fails with "Message too long", MTU is too small

# Set MTU to standard value
sudo ip link set eth0 mtu 1500

# For VPN or tunnel interfaces where MTU needs to be smaller
sudo ip link set tun0 mtu 1400

# Disable problematic TCP offloading (can cause issues with some drivers)
sudo ethtool -K eth0 tx off rx off gso off gro off tso off

# Make permanent via udev
cat > /etc/udev/rules.d/82-netif-offload.rules << 'EOF'
ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth*", RUN+="/usr/sbin/ethtool -K $kernel tx off rx off gso off gro off tso off"
EOF
```

## Checking for Spanning Tree Protocol Issues

If connected to a managed switch, STP port state changes can cause 30+ second outages:

```bash
# Check for STP-related messages
sudo dmesg | grep -iE "STP|spanning|BPDU|topology"

# On managed switches: enable "PortFast" on access ports
# This bypasses STP listening/learning states when a device connects

# If you control the switch, check for topology changes
# Frequent STP topology changes cause network instability
```

## Correlating Drops with System Events

After capturing logs, look for patterns:

```bash
# Check what was happening in the system when drops occurred
# Find drops from monitor log
grep "UNREACHABLE" /var/log/network-drops.log | head -5
# 2026-03-02 10:15:30 GATEWAY UNREACHABLE

# Check system events at that time
sudo journalctl --since "2026-03-02 10:14:00" --until "2026-03-02 10:17:00"

# Check for high CPU/memory at drop times (could indicate driver interrupt issues)
sar -n DEV 1 60  # Network statistics per second

# Check for interface flaps (link up/down events)
sudo journalctl | grep -iE "link up|link down|NIC Link|Carrier" | tail -20
```

## Physical Layer Checks

```bash
# Check link speed and duplex negotiation (duplex mismatch causes packet loss)
sudo ethtool eth0 | grep -E "Speed|Duplex|Link"
# Should show:
# Speed: 1000Mb/s
# Duplex: Full
# Link detected: yes

# Force full duplex and specific speed if auto-negotiation is causing problems
sudo ethtool -s eth0 speed 1000 duplex full autoneg off

# For a physical NIC, also check cable integrity
# Replace cables if experiencing drops on wired connections
# Even new cables can be defective
```

## Summary

Intermittent network drops require capturing diagnostic data at the time of failure rather than after the fact. The most common causes in order of frequency:

1. **Power management** on the NIC or WiFi adapter - disable it
2. **Driver issues** - update firmware and drivers, or switch to alternative drivers
3. **DHCP lease renewals** - switch to static IP if renewals cause drops
4. **Physical layer** - duplex mismatch, faulty cable, or marginal switch port
5. **DNS failures** masquerading as connectivity drops

Set up the monitoring script before investigating further, collect logs over 24-48 hours, then correlate the drop times with system events. Most intermittent issues reveal patterns that point clearly to the root cause.
