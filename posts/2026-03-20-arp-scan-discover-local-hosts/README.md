# How to Use arp-scan to Discover Hosts on a Local Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Arp-scan, ARP, Linux, Network Discovery, LAN, Security

Description: Use arp-scan to discover all devices on a local IPv4 network segment by sending ARP requests and collecting responses, revealing hosts that don't respond to ping.

arp-scan discovers hosts at Layer 2 using ARP, making it more reliable than ping-based discovery. Hosts with ICMP blocked by firewalls still respond to ARP requests, so arp-scan finds devices that appear invisible to ping sweeps.

## Install arp-scan

```bash
# Debian/Ubuntu
sudo apt install arp-scan -y

# RHEL/CentOS Stream (with EPEL)
sudo dnf install arp-scan -y
```

## Basic Network Discovery

```bash
# Scan the local network on the default interface
sudo arp-scan --localnet

# Scan a specific subnet
sudo arp-scan 192.168.1.0/24

# Scan on a specific interface
sudo arp-scan -I eth0 --localnet

# Output:
# Interface: eth0, datalink type: EN10MB (Ethernet)
# Starting arp-scan with 256 hosts
# 192.168.1.1    aa:bb:cc:dd:ee:ff    (Cisco Systems, Inc)
# 192.168.1.50   11:22:33:44:55:66    (Dell Inc.)
# 192.168.1.100  77:88:99:aa:bb:cc    (Apple, Inc.)
#
# 3 packets received by filter, 0 packets dropped
```

## Understanding the Output

```bash
sudo arp-scan -I eth0 192.168.1.0/24

# Columns:
# 1. IP address      → IPv4 address of discovered host
# 2. MAC address     → Ethernet hardware address
# 3. Vendor          → Manufacturer from OUI database (helps identify device type)

# Vendor lookup helps identify:
# "Raspberry Pi Foundation" → IoT devices
# "Apple"                   → MacBooks, iPhones
# "Cisco Systems"           → Network equipment
# "Unknown"                 → Custom hardware or spoofed MAC
```

## Identify Duplicate IPs

```bash
# Show IPs claimed by more than one unique MAC address
sudo arp-scan --localnet --plain --format='${ip}\t${mac}' | awk '
!seen[$1, $2]++ {
    macs[$1] = macs[$1] ? macs[$1] ", " $2 : $2
    count[$1]++
}
END {
    for (ip in count)
        if (count[ip] > 1)
            print "DUPLICATE IP:", ip, "->", macs[ip]
}'
```

## Show Only New/Unexpected Devices

```bash
# Save a known-good scan as baseline
sudo arp-scan --plain --format='${ip}\t${mac}' 192.168.1.0/24 | sort -u > /tmp/baseline-hosts.txt

# Run new scan and compare
sudo arp-scan --plain --format='${ip}\t${mac}' 192.168.1.0/24 | sort -u > /tmp/current-hosts.txt
diff /tmp/baseline-hosts.txt /tmp/current-hosts.txt

# New lines (starting with >) = new devices on network
# Removed lines (starting with <) = devices that left
```

## Verbose and Debug Scan

```bash
# Verbose: show more detail about each response
sudo arp-scan -v 192.168.1.0/24

# Double verbose: show sent and received packets
sudo arp-scan -vv 192.168.1.0/24

# Scan with custom retry count (helps find flaky hosts)
sudo arp-scan --retry 5 192.168.1.0/24

# Increase bandwidth/scan speed
sudo arp-scan --bandwidth 1000000 192.168.1.0/24
```

## Custom ARP Requests

```bash
# Scan with a specific source IP in the ARP packet
sudo arp-scan --arpspa 192.168.1.200 192.168.1.0/24

# Set destination MAC to broadcast explicitly
sudo arp-scan --destaddr ff:ff:ff:ff:ff:ff 192.168.1.0/24

# Slow scan with delay between packets (IDS-friendly)
sudo arp-scan --interval 100 192.168.1.0/24
# --interval = milliseconds between packets
```

## Schedule Periodic Discovery

```bash
#!/bin/bash
# network-audit.sh - Find new devices and alert

KNOWN="/var/lib/network-audit/known-hosts.txt"
CURRENT="/tmp/current-scan.txt"

mkdir -p "$(dirname "$KNOWN")"

sudo arp-scan -I eth0 --plain --format='${ip} ${mac}' 192.168.1.0/24 2>/dev/null \
  | sort -u > "$CURRENT"

if [ -f "$KNOWN" ]; then
    NEW=$(comm -23 "$CURRENT" "$KNOWN")
    if [ -n "$NEW" ]; then
        echo "NEW DEVICES DETECTED:"
        echo "$NEW"
    fi
fi

cp "$CURRENT" "$KNOWN"
```

arp-scan often finds devices that refuse ICMP ping - printers, IoT devices, and hosts with strict firewalls can still appear in arp-scan results, making it a reliable local network discovery tool on an IPv4 LAN.
