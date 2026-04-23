# How to Resolve IPv4 Address Conflicts on a Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Address Conflicts, ARP, DHCP, Troubleshooting

Description: Learn how to detect, identify, and resolve IPv4 address conflicts on a network where two devices share the same IP address, causing connectivity issues.

## How IP Conflicts Occur

An IP conflict happens when two devices are assigned the same IPv4 address:
- DHCP assigns an IP that was previously given to a statically-configured device
- Manual configuration duplicates an existing address
- DHCP lease file corruption causes a duplicate lease
- VPN client assigns an IP matching the local network

## Step 1: Detect an IP Conflict

**Windows (automatic detection):**
```cmd
REM Windows displays a notification and logs Event ID 4199
eventvwr.msc
REM In Event Viewer: Windows Logs > System > filter for source "Tcpip" or Event ID 4199

REM Check current IP assignment
ipconfig /all
REM Note the IP and MAC address shown
```

**Linux detection:**
```bash
# Use arping to find multiple hosts with the same IP

sudo arping -b -c 5 -I eth0 192.168.1.50

# If two different MAC addresses respond, there's a conflict:
# Unicast reply from 192.168.1.50 [AA:BB:CC:DD:EE:FF]  <- MAC 1
# Unicast reply from 192.168.1.50 [11:22:33:44:55:66]  <- MAC 2 (CONFLICT)
```

## Step 2: Identify Both Conflicting Devices

```bash
# Capture the MAC addresses that reply for the target IP
sudo arping -b -c 5 -I eth0 192.168.1.50 | awk -F'[][]' '/reply from/ {print $2}' | sort -u

# Check the current ARP cache entry for the IP
arp -n | grep "192.168.1.50"

# Look up manufacturer from MAC OUI prefix
# AA:BB:CC = OUI -> look up at https://macvendors.com/
# This helps identify the vendor, but not the exact device

# Scan network to find live hosts
nmap -sn 192.168.1.0/24
```

## Step 3: Resolve the Conflict

**Option A: Release and Renew DHCP**
```bash
# Linux systems using dhclient
sudo dhclient -r eth0
sudo dhclient eth0

# Windows
ipconfig /release
ipconfig /renew
```

**Option B: Configure DHCP to Avoid the Conflict**
```bash
# ISC DHCPD: Use a DHCP reservation for devices that should always use DHCP
# and keep manually configured static IPs outside the dynamic range

host reserved_device {
    hardware ethernet AA:BB:CC:DD:EE:FF;
    fixed-address 192.168.1.50;
}

# Keep manually configured static IPs out of the DHCP pool
# Change: range 192.168.1.100 192.168.1.200;
# The static IP 192.168.1.50 is below the range, so safe
```

**Option C: Change the Static IP Device**
```bash
# Log into the device with the static IP and change it
# to an IP outside the DHCP pool range
```

## Step 4: Prevent Future Conflicts

```bash
# ISC DHCPD: Enable ping-check to detect conflicts before assigning
# /etc/dhcp/dhcpd.conf
ping-check true;
ping-timeout 2;    # Wait 2 seconds for ping reply

# If the IP responds to ping, DHCPD abandons that lease and does not offer it
# This is a best-effort safeguard, because devices that block ICMP may still be missed
```

## Step 5: Monitor for Conflicts

```bash
# Cron job to detect conflicts on known static or reserved IPs
sudo tee /usr/local/bin/check-conflicts.sh > /dev/null << 'EOF'
#!/bin/bash
INTERFACE="eth0"
TARGETS=("192.168.1.50")

for ip in "${TARGETS[@]}"; do
    mac_count=$(arping -b -c 5 -I "$INTERFACE" "$ip" 2>/dev/null \
        | awk -F'[][]' '/reply from/ {print $2}' \
        | sort -u \
        | wc -l)

    if [ "$mac_count" -gt 1 ]; then
        echo "$(date): Potential conflict: $ip returned $mac_count MAC addresses" >> /var/log/arp-conflicts.log
    fi
done
EOF
sudo chmod +x /usr/local/bin/check-conflicts.sh

# Run every 5 minutes from root's crontab
( sudo crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-conflicts.sh" ) | sudo crontab -
```

## Conclusion

IP conflicts are detected via Windows Event ID 4199 or `arping` on Linux (two different MACs responding to one IP). Resolve by releasing/renewing DHCP on conflicting devices, adding DHCP reservations for devices that should always use DHCP, or changing one device's IP. Reduce future conflicts with DHCPD's `ping-check true` option and by keeping manually configured static IPs outside the DHCP pool range.
