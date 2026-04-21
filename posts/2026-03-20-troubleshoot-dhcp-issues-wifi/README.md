# How to Troubleshoot DHCP Issues on WiFi Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, WiFi, Troubleshooting, Network, IP Address

Description: Learn how to systematically troubleshoot DHCP failures on WiFi networks, from client-side failures to DHCP server configuration issues.

## DHCP Process Overview

DHCP follows a four-step DORA process:

```mermaid
sequenceDiagram
    participant C as WiFi Client
    participant S as DHCP Server

    C->>S: DHCPDISCOVER (broadcast)
    S->>C: DHCPOFFER (IP offer)
    C->>S: DHCPREQUEST (accept offer)
    S->>C: DHCPACK (confirmed lease)
```

A failure at any step can leave the client with no DHCP lease or, on clients that use IPv4 link-local fallback, a 169.254.x.x address.

## Step 1: Identify the Failure Point

```bash
# Linux: Watch DHCP negotiation

sudo dhclient -v wlan0 2>&1 | head -30

# Or with journald
journalctl -u NetworkManager -f | grep -i dhcp

# Windows: View DHCP events
# Event Viewer → Applications and Services Logs → Microsoft → Windows → DHCP-Client → Operational/Admin

# macOS:
sudo wdutil log +dhcp
sudo ipconfig set en0 BOOTP
sudo ipconfig set en0 DHCP
sudo wdutil dump
```

## Step 2: Check DHCP Lease on the Router/Server

On the DHCP server or router:

```bash
# Legacy Linux DHCP server (ISC DHCPD) - inspect raw lease entries
grep -A8 "lease 192.168" /var/lib/dhcp/dhcpd.leases

# dnsmasq - view leases
cat /var/lib/misc/dnsmasq.leases

# Check if pool is exhausted
grep "no free leases" /var/log/syslog

# Router CLI (Cisco IOS)
show ip dhcp pool
show ip dhcp binding
show ip dhcp server statistics
```

## Step 3: Verify DHCP Server Configuration

```bash
# Check legacy ISC DHCPD configuration
cat /etc/dhcp/dhcpd.conf

# Verify the subnet definition matches the interface
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
    option domain-name-servers 8.8.8.8;
    default-lease-time 3600;
    max-lease-time 7200;
}

# Check if DHCPD is running on the correct interface
grep -E "INTERFACES|INTERFACESv4" /etc/default/isc-dhcp-server
# Should list your server's interface: INTERFACESv4="eth0"
```

## Step 4: Test DHCP with a Manual DHCP Request

```bash
# Linux: Manual DHCP request (kills existing connection)
sudo dhclient -r wlan0   # Release
sudo dhclient -v wlan0   # Request new lease

# One-shot DHCP attempt (exits with failure if no lease is received)
sudo dhclient -1 wlan0

# Windows:
ipconfig /release
ipconfig /renew

# macOS:
sudo ipconfig set en0 DHCP
```

## Step 5: Capture DHCP Traffic

```bash
# Capture DHCP traffic (UDP ports 67 and 68)
sudo tcpdump -i wlan0 -n -vv 'udp and (port 67 or port 68)'

# Output should show DISCOVER → OFFER → REQUEST → ACK sequence
# If no OFFER is seen, the server is not responding or replies are not reaching the client
# If REQUEST is seen but no ACK/NAK returns, the server may be rejecting the request or replies may be blocked

# Save for Wireshark analysis
sudo tcpdump -i wlan0 -w /tmp/dhcp-capture.pcap 'udp and (port 67 or port 68)'
```

## Step 6: Common DHCP Issues and Fixes

**Pool Exhausted:**
```bash
# Expand the DHCP pool
# In dhcpd.conf:
range 192.168.1.50 192.168.1.250;    # Was .100-.150

# Only rebuild the ISC lease database during a maintenance window; it forgets active leases
sudo systemctl stop isc-dhcp-server
sudo cp /var/lib/dhcp/dhcpd.leases /var/lib/dhcp/dhcpd.leases.bak
sudo sh -c ': > /var/lib/dhcp/dhcpd.leases'
sudo systemctl start isc-dhcp-server
```

**DHCP Server Not Receiving Broadcasts:**
```bash
# Check if firewall is blocking UDP 67/68
sudo iptables -L INPUT -n | grep -E "67|68"
sudo iptables -L OUTPUT -n | grep -E "67|68"

# Allow DHCP server requests and replies
sudo iptables -I INPUT -p udp --dport 67 -j ACCEPT
sudo iptables -I OUTPUT -p udp --sport 67 --dport 68 -j ACCEPT
```

**DHCP on Wrong Interface:**
```bash
# Ensure DHCP server listens on the right interface
# /etc/default/isc-dhcp-server
INTERFACESv4="eth0"    # Not wlan0 if this is the server's wired interface
```

## Conclusion

DHCP issues on WiFi are diagnosed by tracing the DORA sequence: use `sudo dhclient -v wlan0` to watch the negotiation, `tcpdump 'udp and (port 67 or port 68)'` to capture packets, and check the DHCP server logs for pool exhaustion or rejection messages. The most common causes are exhausted DHCP pools, firewall blocking UDP 67/68, and the DHCP server not listening on the correct interface.
