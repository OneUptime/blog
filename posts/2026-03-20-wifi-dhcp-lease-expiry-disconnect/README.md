# How to Troubleshoot WiFi Disconnections Caused by DHCP Lease Expiry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WiFi, DHCP, Lease Expiry, Disconnection, Troubleshooting

Description: Learn how to identify and fix WiFi disconnections that occur at regular intervals due to DHCP lease expiry, including extending lease times and fixing renewal failures.

## How DHCP Lease Expiry Causes Disconnections

DHCP leases expire after a configured time. Clients attempt to renew at 50% and 87.5% of the lease time. If renewal fails:
1. The client loses its IP address
2. The client gets an APIPA address (169.254.x.x) or no IP
3. All network connections drop

This appears as periodic, predictable disconnections - often every 1-2 hours (if the DHCP server uses short lease times).

## Step 1: Identify DHCP-Related Disconnections

Look for the pattern: disconnections at regular intervals:

**Linux:**
```bash
# Check NetworkManager logs for DHCP events

journalctl -u NetworkManager --since "24 hours ago" | grep -i "dhcp\|lease\|renew\|expire"

# Check DHCP lease files
cat /var/lib/dhcp/dhclient.leases
# Look for "expire" timestamps that match disconnection times

# Check current lease expiry (renew/rebind/expire timestamps)
grep -E "expire|renew|rebind" /var/lib/dhcp/dhclient.leases
```

**Windows:**
```cmd
REM Check DHCP events in Event Viewer
eventvwr.msc
REM Applications and Services Logs → Microsoft → Windows → DHCP-Client

REM View current lease time
ipconfig /all
REM Shows "Lease Obtained" and "Lease Expires" timestamps
```

## Step 2: Check DHCP Lease Duration

```bash
# On the DHCP server (or router), check configured lease time
# ISC DHCPD:
grep -E "default-lease-time|max-lease-time" /etc/dhcp/dhcpd.conf

# dnsmasq:
grep "leasetime\|dhcp-range" /etc/dnsmasq.conf

# Check active leases and their expiry times
cat /var/lib/misc/dnsmasq.leases
# Format: expiry-timestamp MAC IP hostname client-id
```

## Step 3: Extend DHCP Lease Time

If lease times are too short, clients disconnect before successful renewal:

```bash
# ISC DHCPD - increase lease times
# /etc/dhcp/dhcpd.conf
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
    option domain-name-servers 8.8.8.8;

    # Extended lease times (8 hours default, 24 hours max)
    default-lease-time 28800;    # 8 hours (was 1 hour)
    max-lease-time 86400;        # 24 hours
}

# Apply changes
systemctl reload isc-dhcp-server
```

## Step 4: Fix DHCP Renewal Failures

If the client tries to renew but the server doesn't respond:

```bash
# Check if DHCP server is reachable during renewal attempt
# Renewal is unicast to the DHCP server's IP
# (unlike initial DISCOVER which is broadcast)

# Test if the DHCP server responds to unicast
ping 192.168.1.1    # Gateway/DHCP server IP

# Check for firewall rules blocking DHCP renewal
sudo iptables -L INPUT -n | grep -E "67|68"

# Allow DHCP traffic
sudo iptables -I INPUT -p udp --dport 67 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 68 -j ACCEPT
```

## Step 5: Configure Static DHCP Lease (Reservation)

The most reliable solution for important clients is a DHCP reservation:

```bash
# ISC DHCPD - reserve an IP for a specific MAC address
# /etc/dhcp/dhcpd.conf

host laptop_wifi {
    hardware ethernet AA:BB:CC:DD:EE:FF;  # WiFi MAC of the laptop
    fixed-address 192.168.1.50;
    # Reserved addresses can have longer lease times
    default-lease-time 2592000;    # 30 days
}

# dnsmasq reservation
echo "dhcp-host=AA:BB:CC:DD:EE:FF,192.168.1.50,30d" >> /etc/dnsmasq.conf
```

## Step 6: Monitor Lease Renewals

```bash
# Monitor DHCP renewals in real time
sudo tcpdump -i eth0 port 67 or port 68 -n

# DHCP renewal sequence:
# Client → Server: DHCPREQUEST (unicast to server IP)
# Server → Client: DHCPACK (with new expiry)

# If you see DHCPREQUEST but no DHCPACK, server is rejecting the renewal

# Log all DHCP traffic
sudo tcpdump -i eth0 -w /tmp/dhcp-monitor.pcap port 67 or port 68 &
# Run for a few hours, then analyze
tcpdump -r /tmp/dhcp-monitor.pcap -n | grep -E "DHCPREQUEST|DHCPACK|DHCPNAK"
```

## Conclusion

WiFi disconnections from DHCP lease expiry are characterized by regular, interval-based disconnections. Identify them via `journalctl -u NetworkManager | grep dhcp` and by checking the "Lease Expires" timestamp with `ipconfig /all`. Fix by extending lease times in the DHCP server configuration (use 8-24 hour defaults), ensuring the DHCP server is reachable for unicast renewals, and setting up DHCP reservations for critical clients. Long lease times (24+ hours) prevent transient renewal failures from causing disconnections.
