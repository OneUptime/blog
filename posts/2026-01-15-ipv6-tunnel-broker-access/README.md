# How to Configure IPv6 Tunnel Broker for IPv6 Access Over IPv4

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Tunneling, Networking, Linux, Infrastructure, DevOps

Description: Learn how to set up and configure an IPv6 tunnel broker to enable IPv6 connectivity over existing IPv4 infrastructure, including step-by-step configuration, security best practices, and troubleshooting tips.

---

## Introduction

As the internet continues its transition from IPv4 to IPv6, many organizations find themselves in a challenging position: they need IPv6 connectivity, but their infrastructure or ISP only supports IPv4. This is where IPv6 tunnel brokers come into play.

An IPv6 tunnel broker provides a mechanism to encapsulate IPv6 packets within IPv4 packets, allowing you to access IPv6 networks even when your direct connection is IPv4-only. This technique, known as tunneling, creates a virtual IPv6 connection over your existing IPv4 infrastructure.

In this comprehensive guide, we will walk through the process of setting up an IPv6 tunnel broker, configuring your systems to use it, and implementing best practices for security and performance.

## Table of Contents

1. [Understanding IPv6 Tunneling](#understanding-ipv6-tunneling)
2. [Types of IPv6 Tunnels](#types-of-ipv6-tunnels)
3. [Prerequisites](#prerequisites)
4. [Choosing a Tunnel Broker](#choosing-a-tunnel-broker)
5. [Creating a Tunnel Account](#creating-a-tunnel-account)
6. [Configuring the Tunnel on Linux](#configuring-the-tunnel-on-linux)
7. [Configuring the Tunnel on BSD/FreeBSD](#configuring-the-tunnel-on-bsdfreebsd)
8. [Persistent Configuration](#persistent-configuration)
9. [Firewall Configuration](#firewall-configuration)
10. [DNS Configuration for IPv6](#dns-configuration-for-ipv6)
11. [Testing Your IPv6 Connection](#testing-your-ipv6-connection)
12. [Troubleshooting Common Issues](#troubleshooting-common-issues)
13. [Security Best Practices](#security-best-practices)
14. [Performance Optimization](#performance-optimization)
15. [Summary](#summary)

---

## Understanding IPv6 Tunneling

IPv6 tunneling works by encapsulating IPv6 packets inside IPv4 packets. When you send data to an IPv6 destination, your system wraps the IPv6 packet in an IPv4 header and sends it to the tunnel broker's endpoint. The tunnel broker then extracts the IPv6 packet and forwards it to its destination on the IPv6 internet.

```
+------------------+     +------------------+     +------------------+
|   Your System    | --> |  Tunnel Broker   | --> | IPv6 Destination |
|   (IPv4 only)    |     |  (IPv4 & IPv6)   |     |                  |
+------------------+     +------------------+     +------------------+
        |                        |                        |
   IPv4 Network            IPv4/IPv6              IPv6 Network
        |                        |                        |
   [IPv6 in IPv4]          [Native IPv6]           [Native IPv6]
```

### How 6in4 Tunneling Works

The most common tunneling method used by tunnel brokers is 6in4 (also known as Protocol 41). Here is a breakdown of the encapsulation:

```
Original IPv6 Packet:
+------------------+------------------+
|   IPv6 Header    |    IPv6 Data     |
+------------------+------------------+

Encapsulated Packet (6in4):
+------------------+------------------+------------------+
|   IPv4 Header    |   IPv6 Header    |    IPv6 Data     |
| (Protocol = 41)  |                  |                  |
+------------------+------------------+------------------+
```

The IPv4 header uses protocol number 41 to indicate that the payload is an IPv6 packet.

---

## Types of IPv6 Tunnels

Before diving into configuration, it is important to understand the different types of IPv6 tunnels available:

### 1. 6in4 (Configured Tunnels)

- **Description**: Manually configured point-to-point tunnels
- **Protocol**: IP Protocol 41
- **Use Case**: Most tunnel broker services
- **Pros**: Simple, reliable, well-supported
- **Cons**: Requires static IPv4 endpoint (or dynamic DNS updates)

### 2. 6to4 (Automatic Tunnels)

- **Description**: Automatic tunneling using special 2002::/16 prefix
- **Protocol**: IP Protocol 41
- **Use Case**: Quick IPv6 access without registration
- **Pros**: No registration required
- **Cons**: Deprecated, unreliable, security concerns

### 3. Teredo

- **Description**: Tunnels IPv6 over UDP through NAT
- **Protocol**: UDP port 3544
- **Use Case**: Clients behind NAT without port forwarding
- **Pros**: Works through NAT
- **Cons**: Higher latency, less reliable

### 4. AYIYA (Anything In Anything)

- **Description**: Protocol-agnostic tunneling
- **Protocol**: UDP (configurable port)
- **Use Case**: Dynamic IP addresses, NAT traversal
- **Pros**: Works behind NAT, supports dynamic IPs
- **Cons**: Requires special client software

For this guide, we will focus primarily on **6in4 tunnels** as they are the most commonly used and well-supported option.

---

## Prerequisites

Before setting up your IPv6 tunnel, ensure you have the following:

### System Requirements

```bash
# Check your current kernel version (Linux)
uname -r
# Should be 2.6.x or higher (virtually all modern systems)

# Verify IPv6 module is loaded
lsmod | grep ipv6
# Or check if IPv6 is enabled
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# Output should be 0 (enabled)
```

### Network Requirements

1. **Static or predictable IPv4 address**: While some tunnel brokers support dynamic IPs, a static IP simplifies configuration
2. **Access to Protocol 41**: Your firewall must allow IP Protocol 41 (not TCP/UDP port 41)
3. **Root/sudo access**: Required for network configuration

### Required Tools

```bash
# Install necessary networking tools on Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y iproute2 iputils-ping net-tools traceroute

# Install on RHEL/CentOS/Fedora
sudo dnf install -y iproute iputils net-tools traceroute

# Install on Arch Linux
sudo pacman -S iproute2 iputils net-tools traceroute
```

---

## Choosing a Tunnel Broker

Several reputable tunnel broker services are available. Here is a comparison:

| Provider | Website | Free Tier | Features |
|----------|---------|-----------|----------|
| Hurricane Electric | tunnelbroker.net | Yes | Multiple PoPs, /48 allocation, BGP |
| SixXS (Historical) | sixxs.net | Discontinued | Was popular, now offline |
| NetAssist | tb.netassist.ua | Yes | European PoPs |
| IP4Market | ip4market.ru | Yes | Russian PoPs |

For this guide, we will use **Hurricane Electric (HE)** as it is the most widely used and offers excellent global coverage with multiple Points of Presence (PoPs).

---

## Creating a Tunnel Account

### Step 1: Register with Hurricane Electric

1. Navigate to [https://tunnelbroker.net](https://tunnelbroker.net)
2. Click "Register" and create an account
3. Verify your email address
4. Log in to your account

### Step 2: Create a New Tunnel

1. Click "Create Regular Tunnel"
2. Enter your IPv4 endpoint (your public IP address)
3. Select a tunnel server closest to your location
4. Click "Create Tunnel"

### Step 3: Note Your Tunnel Details

After creation, you will receive configuration details similar to:

```
# Example Tunnel Configuration (yours will differ)
# ================================================

# Server IPv4 Address (Tunnel Endpoint)
Server IPv4 Address: 216.66.84.46

# Server IPv6 Address
Server IPv6 Address: 2001:470:1f0e:abc::1/64

# Client IPv4 Address (Your Public IP)
Client IPv4 Address: 203.0.113.50

# Client IPv6 Address (Your IPv6 Address)
Client IPv6 Address: 2001:470:1f0e:abc::2/64

# Routed /64 Prefix (For your LAN)
Routed /64: 2001:470:1f0f:abc::/64

# Routed /48 Prefix (Available on request)
Routed /48: 2001:470:abcd::/48
```

---

## Configuring the Tunnel on Linux

### Method 1: Using ip Commands (Recommended)

The `ip` command from the iproute2 package is the modern way to configure network interfaces on Linux.

```bash
#!/bin/bash
# ================================================
# IPv6 Tunnel Configuration Script for Linux
# Using Hurricane Electric Tunnel Broker
# ================================================

# Define tunnel parameters
# Replace these values with your actual tunnel details
TUNNEL_NAME="he-ipv6"                    # Name for your tunnel interface
LOCAL_IPV4="203.0.113.50"                # Your public IPv4 address
REMOTE_IPV4="216.66.84.46"               # HE's tunnel server IPv4
CLIENT_IPV6="2001:470:1f0e:abc::2/64"    # Your assigned IPv6 address
ROUTED_PREFIX="2001:470:1f0f:abc::/64"   # Your routed /64 prefix

# Step 1: Create the tunnel interface
# This creates a sit (Simple Internet Transition) tunnel
sudo ip tunnel add ${TUNNEL_NAME} mode sit remote ${REMOTE_IPV4} local ${LOCAL_IPV4} ttl 255

# Step 2: Bring up the tunnel interface
sudo ip link set ${TUNNEL_NAME} up

# Step 3: Assign the IPv6 address to the tunnel interface
sudo ip addr add ${CLIENT_IPV6} dev ${TUNNEL_NAME}

# Step 4: Add default IPv6 route through the tunnel
sudo ip route add ::/0 dev ${TUNNEL_NAME}

# Step 5: (Optional) Add route for your routed prefix
# This is useful if you're routing IPv6 to other devices on your LAN
sudo ip -6 route add ${ROUTED_PREFIX} dev ${TUNNEL_NAME}

echo "IPv6 tunnel ${TUNNEL_NAME} has been configured successfully!"
```

### Method 2: Using ifconfig and route (Legacy)

For older systems that do not have iproute2:

```bash
#!/bin/bash
# ================================================
# Legacy IPv6 Tunnel Configuration
# Using ifconfig and route commands
# ================================================

# Define tunnel parameters
TUNNEL_NAME="sit1"
LOCAL_IPV4="203.0.113.50"
REMOTE_IPV4="216.66.84.46"
CLIENT_IPV6="2001:470:1f0e:abc::2"
PREFIX_LEN="64"

# Create and configure the tunnel
sudo ifconfig sit0 up
sudo ifconfig sit0 inet6 tunnel ::${REMOTE_IPV4}
sudo ifconfig ${TUNNEL_NAME} up
sudo ifconfig ${TUNNEL_NAME} inet6 add ${CLIENT_IPV6}/${PREFIX_LEN}

# Add default route
sudo route -A inet6 add ::/0 dev ${TUNNEL_NAME}

echo "Legacy tunnel configuration complete!"
```

### Verifying the Tunnel Interface

After configuration, verify the tunnel is properly set up:

```bash
# Check tunnel interface exists and is up
ip link show he-ipv6

# Expected output:
# 4: he-ipv6@NONE: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1480 qdisc noqueue state UNKNOWN mode DEFAULT
#     link/sit 203.0.113.50 peer 216.66.84.46

# Check IPv6 address is assigned
ip -6 addr show dev he-ipv6

# Expected output:
# 4: he-ipv6@NONE: <POINTOPOINT,NOARP,UP,LOWER_UP>
#     inet6 2001:470:1f0e:abc::2/64 scope global
#        valid_lft forever preferred_lft forever
#     inet6 fe80::cb00:7132/128 scope link
#        valid_lft forever preferred_lft forever

# Check IPv6 routing table
ip -6 route show

# Expected output should include:
# ::/0 dev he-ipv6 metric 1024 pref medium
# 2001:470:1f0e:abc::/64 dev he-ipv6 proto kernel metric 256 pref medium
```

---

## Configuring the Tunnel on BSD/FreeBSD

For BSD-based systems, the configuration differs slightly:

```bash
#!/bin/sh
# ================================================
# IPv6 Tunnel Configuration for FreeBSD
# ================================================

# Define tunnel parameters
TUNNEL_NAME="gif0"
LOCAL_IPV4="203.0.113.50"
REMOTE_IPV4="216.66.84.46"
CLIENT_IPV6="2001:470:1f0e:abc::2"
PREFIX_LEN="64"

# Create the gif (generic tunnel interface)
ifconfig ${TUNNEL_NAME} create

# Configure the tunnel endpoints
ifconfig ${TUNNEL_NAME} tunnel ${LOCAL_IPV4} ${REMOTE_IPV4}

# Assign IPv6 address
ifconfig ${TUNNEL_NAME} inet6 ${CLIENT_IPV6} prefixlen ${PREFIX_LEN}

# Bring up the interface
ifconfig ${TUNNEL_NAME} up

# Add default IPv6 route
route -6 add default -interface ${TUNNEL_NAME}

echo "FreeBSD IPv6 tunnel configured!"
```

### Making It Persistent on FreeBSD

Add the following to `/etc/rc.conf`:

```bash
# IPv6 Tunnel Configuration in /etc/rc.conf
# ==========================================

# Enable IPv6
ipv6_enable="YES"

# Configure gif0 tunnel interface
gif_interfaces="gif0"
gifconfig_gif0="203.0.113.50 216.66.84.46"
ifconfig_gif0_ipv6="inet6 2001:470:1f0e:abc::2 prefixlen 64"

# Default IPv6 route
ipv6_defaultrouter="2001:470:1f0e:abc::1"
```

---

## Persistent Configuration

### Debian/Ubuntu: Using /etc/network/interfaces

```bash
# Add to /etc/network/interfaces
# ================================================

# IPv6 Tunnel Interface Configuration
auto he-ipv6
iface he-ipv6 inet6 v4tunnel
    # Your public IPv4 address
    local 203.0.113.50

    # Hurricane Electric's tunnel server
    endpoint 216.66.84.46

    # Your assigned IPv6 address
    address 2001:470:1f0e:abc::2

    # Prefix length
    netmask 64

    # Time to live for encapsulated packets
    ttl 255

    # Default IPv6 gateway (HE's side of the tunnel)
    gateway 2001:470:1f0e:abc::1

    # Post-up commands (optional)
    up ip -6 route add 2001:470:1f0f:abc::/64 dev he-ipv6
```

### RHEL/CentOS: Using ifcfg Files

Create `/etc/sysconfig/network-scripts/ifcfg-he-ipv6`:

```bash
# /etc/sysconfig/network-scripts/ifcfg-he-ipv6
# ================================================

# Device name
DEVICE=he-ipv6

# Device type (sit = Simple Internet Transition)
TYPE=sit

# Start on boot
ONBOOT=yes

# Boot protocol
BOOTPROTO=none

# Enable IPv6
IPV6INIT=yes

# Tunnel mode
IPV6_TUNNELMODE=sit

# Remote tunnel endpoint (HE's IPv4 address)
IPV6_TUNNELIPADDR4=216.66.84.46

# Local IPv4 address
IPADDR=203.0.113.50

# IPv6 address configuration
IPV6ADDR=2001:470:1f0e:abc::2/64

# Default IPv6 gateway
IPV6_DEFAULTGW=2001:470:1f0e:abc::1

# MTU (optional, default is 1480 for sit tunnels)
IPV6_MTU=1480

# Name (optional, for identification)
NAME="Hurricane Electric IPv6 Tunnel"
```

### Systemd-networkd Configuration

For systems using systemd-networkd, create `/etc/systemd/network/he-ipv6.netdev`:

```ini
# /etc/systemd/network/he-ipv6.netdev
# ================================================

[NetDev]
Name=he-ipv6
Kind=sit
Description=Hurricane Electric IPv6 Tunnel

[Tunnel]
# Your local IPv4 address
Local=203.0.113.50

# HE's tunnel server IPv4 address
Remote=216.66.84.46

# Time to live
TTL=255
```

And `/etc/systemd/network/he-ipv6.network`:

```ini
# /etc/systemd/network/he-ipv6.network
# ================================================

[Match]
Name=he-ipv6

[Network]
Description=Hurricane Electric IPv6 Tunnel Network

# Your assigned IPv6 address
Address=2001:470:1f0e:abc::2/64

# Default IPv6 gateway
Gateway=2001:470:1f0e:abc::1

# Enable IPv6 forwarding if routing to LAN
IPForward=ipv6
```

Reload systemd-networkd after creating these files:

```bash
# Reload systemd-networkd configuration
sudo systemctl daemon-reload
sudo systemctl restart systemd-networkd

# Check status
sudo networkctl status he-ipv6
```

---

## Firewall Configuration

### iptables/ip6tables Configuration

```bash
#!/bin/bash
# ================================================
# Firewall Rules for IPv6 Tunnel
# ================================================

# Allow Protocol 41 (6in4) from tunnel broker
# This is essential for the tunnel to work
sudo iptables -A INPUT -p 41 -s 216.66.84.46 -j ACCEPT
sudo iptables -A OUTPUT -p 41 -d 216.66.84.46 -j ACCEPT

# Allow all traffic on the tunnel interface
sudo iptables -A INPUT -i he-ipv6 -j ACCEPT
sudo iptables -A OUTPUT -o he-ipv6 -j ACCEPT

# IPv6 firewall rules (ip6tables)
# ================================================

# Allow established connections
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow ICMPv6 (essential for IPv6 operation)
# Path MTU Discovery
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
# Neighbor Discovery Protocol
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-solicitation -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement -j ACCEPT
# Router Discovery
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement -j ACCEPT
# Echo request/reply (ping6)
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-reply -j ACCEPT

# Allow traffic on tunnel interface
sudo ip6tables -A INPUT -i he-ipv6 -j ACCEPT
sudo ip6tables -A OUTPUT -o he-ipv6 -j ACCEPT
sudo ip6tables -A FORWARD -i he-ipv6 -j ACCEPT
sudo ip6tables -A FORWARD -o he-ipv6 -j ACCEPT

# Allow loopback
sudo ip6tables -A INPUT -i lo -j ACCEPT

# Allow SSH over IPv6
sudo ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS over IPv6
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Default policy - drop all other incoming traffic
# Uncomment these lines for a restrictive policy
# sudo ip6tables -P INPUT DROP
# sudo ip6tables -P FORWARD DROP

echo "Firewall rules configured for IPv6 tunnel!"
```

### nftables Configuration

For modern systems using nftables:

```bash
#!/usr/sbin/nft -f
# ================================================
# nftables Configuration for IPv6 Tunnel
# /etc/nftables.conf
# ================================================

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow established/related connections
        ct state established,related accept

        # Allow loopback
        iif lo accept

        # Allow Protocol 41 from tunnel broker
        ip protocol 41 ip saddr 216.66.84.46 accept

        # Allow all traffic on tunnel interface
        iifname "he-ipv6" accept

        # ICMPv6 - essential for IPv6 operation
        icmpv6 type {
            destination-unreachable,
            packet-too-big,
            time-exceeded,
            parameter-problem,
            echo-request,
            echo-reply,
            nd-router-advert,
            nd-neighbor-solicit,
            nd-neighbor-advert
        } accept

        # Allow common services over IPv6
        tcp dport { 22, 80, 443 } accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;

        # Allow forwarding on tunnel interface
        iifname "he-ipv6" accept
        oifname "he-ipv6" accept

        # Allow established/related
        ct state established,related accept
    }

    chain output {
        type filter hook output priority 0; policy accept;

        # Allow Protocol 41 to tunnel broker
        ip protocol 41 ip daddr 216.66.84.46 accept
    }
}
```

### firewalld Configuration (RHEL/CentOS/Fedora)

```bash
#!/bin/bash
# ================================================
# firewalld Configuration for IPv6 Tunnel
# ================================================

# Add tunnel interface to trusted zone
sudo firewall-cmd --permanent --zone=trusted --add-interface=he-ipv6

# Allow Protocol 41 (requires direct rules)
sudo firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 \
    -p 41 -s 216.66.84.46 -j ACCEPT
sudo firewall-cmd --permanent --direct --add-rule ipv4 filter OUTPUT 0 \
    -p 41 -d 216.66.84.46 -j ACCEPT

# Allow ICMPv6
sudo firewall-cmd --permanent --add-icmp-block-inversion
sudo firewall-cmd --permanent --zone=public --add-icmp-block=echo-request

# Reload firewall
sudo firewall-cmd --reload

# Verify configuration
sudo firewall-cmd --list-all
sudo firewall-cmd --zone=trusted --list-interfaces
```

---

## DNS Configuration for IPv6

### Configuring resolv.conf for IPv6 DNS

```bash
# /etc/resolv.conf
# ================================================

# Primary DNS (Google IPv6)
nameserver 2001:4860:4860::8888

# Secondary DNS (Google IPv6)
nameserver 2001:4860:4860::8844

# Tertiary DNS (Cloudflare IPv6)
nameserver 2606:4700:4700::1111

# Fallback to IPv4 if IPv6 fails
nameserver 8.8.8.8
```

### Using systemd-resolved

```bash
# /etc/systemd/resolved.conf
# ================================================

[Resolve]
# IPv6 DNS servers
DNS=2001:4860:4860::8888 2606:4700:4700::1111
FallbackDNS=2001:4860:4860::8844 2606:4700:4700::1001

# Enable DNSSEC
DNSSEC=yes

# Enable DNS over TLS (if supported)
DNSOverTLS=opportunistic
```

Apply changes:

```bash
sudo systemctl restart systemd-resolved
```

### Hurricane Electric DNS (IPv6-enabled)

Hurricane Electric provides IPv6-accessible DNS servers:

```bash
# Hurricane Electric DNS Servers
# ================================================

# Anycast DNS (IPv6)
nameserver 2001:470:20::2

# Alternative (IPv6)
nameserver 2001:470:0:9d::2
```

---

## Testing Your IPv6 Connection

### Basic Connectivity Tests

```bash
#!/bin/bash
# ================================================
# IPv6 Connectivity Test Suite
# ================================================

echo "=== IPv6 Connectivity Tests ==="
echo ""

# Test 1: Check tunnel interface status
echo "1. Tunnel Interface Status:"
ip link show he-ipv6
echo ""

# Test 2: Check IPv6 addresses
echo "2. IPv6 Addresses:"
ip -6 addr show
echo ""

# Test 3: Check IPv6 routing table
echo "3. IPv6 Routing Table:"
ip -6 route show
echo ""

# Test 4: Ping the tunnel server (HE's side)
echo "4. Pinging Tunnel Server (2001:470:1f0e:abc::1):"
ping6 -c 4 2001:470:1f0e:abc::1
echo ""

# Test 5: Ping Hurricane Electric's website
echo "5. Pinging ipv6.he.net:"
ping6 -c 4 ipv6.he.net
echo ""

# Test 6: Ping Google's IPv6 address
echo "6. Pinging Google IPv6 (2607:f8b0:4000::):"
ping6 -c 4 2607:f8b0:4000::
echo ""

# Test 7: DNS resolution over IPv6
echo "7. DNS Resolution Test:"
host -t AAAA google.com
echo ""

# Test 8: Traceroute to IPv6 destination
echo "8. Traceroute to ipv6.google.com:"
traceroute6 ipv6.google.com
echo ""

# Test 9: Check external IPv6 address
echo "9. External IPv6 Address:"
curl -6 https://ipv6.icanhazip.com
echo ""

echo "=== Tests Complete ==="
```

### Using Online IPv6 Test Sites

You can also verify your IPv6 connectivity using these websites:

```bash
# Test using curl (command line)
# ================================================

# Check your IPv6 address
curl -6 https://ipv6.icanhazip.com

# Test IPv6 connectivity score
curl -6 https://test-ipv6.com/

# Hurricane Electric IPv6 test
curl -6 https://ipv6.he.net/
```

### Comprehensive Network Diagnostics

```bash
#!/bin/bash
# ================================================
# Comprehensive IPv6 Diagnostic Script
# ================================================

echo "=========================================="
echo "IPv6 Network Diagnostic Report"
echo "Generated: $(date)"
echo "=========================================="
echo ""

# System Information
echo "--- System Information ---"
uname -a
echo ""

# IPv6 Kernel Parameters
echo "--- IPv6 Kernel Parameters ---"
sysctl -a 2>/dev/null | grep ipv6 | head -20
echo ""

# Network Interfaces
echo "--- Network Interfaces ---"
ip addr show
echo ""

# IPv6 Specific Addresses
echo "--- IPv6 Addresses ---"
ip -6 addr show
echo ""

# Routing Tables
echo "--- IPv6 Routing Table ---"
ip -6 route show
echo ""

# Neighbor Cache (IPv6 ARP equivalent)
echo "--- IPv6 Neighbor Cache ---"
ip -6 neigh show
echo ""

# Socket Statistics
echo "--- IPv6 Socket Statistics ---"
ss -6 -tuln
echo ""

# Tunnel Interface Details
echo "--- Tunnel Interface Details ---"
ip tunnel show
echo ""

# Connectivity Tests
echo "--- Connectivity Tests ---"
echo "Pinging tunnel endpoint..."
ping6 -c 2 2001:470:1f0e:abc::1 2>/dev/null && echo "SUCCESS" || echo "FAILED"

echo "Pinging Google IPv6..."
ping6 -c 2 2607:f8b0:4004:800::200e 2>/dev/null && echo "SUCCESS" || echo "FAILED"
echo ""

echo "=========================================="
echo "Diagnostic Report Complete"
echo "=========================================="
```

---

## Troubleshooting Common Issues

### Issue 1: Tunnel Interface Not Coming Up

```bash
# Symptoms:
# - ip link show shows interface as DOWN
# - Cannot ping tunnel endpoint

# Solution 1: Check if sit module is loaded
lsmod | grep sit
# If not loaded:
sudo modprobe sit

# Solution 2: Verify your public IP hasn't changed
curl -4 https://icanhazip.com
# Compare with the IP configured in your tunnel

# Solution 3: Check for conflicting sit interfaces
ip tunnel show
# Remove old tunnels if necessary
sudo ip tunnel del sit1
```

### Issue 2: Protocol 41 Blocked by Firewall/ISP

```bash
# Symptoms:
# - Tunnel comes up but no connectivity
# - ping6 to tunnel endpoint times out

# Diagnostic:
# Try to detect if Protocol 41 is being blocked
sudo tcpdump -i eth0 proto 41

# If you see outgoing packets but no incoming:
# Protocol 41 is likely being blocked by your ISP or upstream firewall

# Solutions:
# 1. Contact ISP to allow Protocol 41
# 2. Use AYIYA tunnel instead (tunnels over UDP)
# 3. Use a VPN that supports IPv6
```

### Issue 3: MTU/Fragmentation Issues

```bash
# Symptoms:
# - Small packets work (ping), large transfers fail
# - Websites partially load then hang
# - SSH works, but SCP/large transfers fail

# Diagnostic:
ping6 -s 1452 -M do ipv6.google.com
# If this fails but smaller sizes work, MTU is the issue

# Solution: Reduce MTU on tunnel interface
sudo ip link set he-ipv6 mtu 1280
# 1280 is the minimum IPv6 MTU and should always work

# For automatic Path MTU Discovery, ensure ICMPv6 is not blocked:
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
```

### Issue 4: Routing Issues

```bash
# Symptoms:
# - Can ping tunnel endpoint but not other IPv6 addresses
# - Traceroute6 stops at tunnel endpoint

# Diagnostic:
ip -6 route show
# Ensure default route exists

# Solution: Add missing default route
sudo ip -6 route add ::/0 dev he-ipv6

# If you have multiple IPv6 interfaces, check route metrics
sudo ip -6 route add ::/0 dev he-ipv6 metric 100
```

### Issue 5: DNS Resolution Failures

```bash
# Symptoms:
# - ping6 works with IPv6 addresses but not hostnames
# - curl -6 fails with "Could not resolve host"

# Diagnostic:
dig AAAA google.com @2001:4860:4860::8888

# Solution 1: Add IPv6 DNS servers
echo "nameserver 2001:4860:4860::8888" | sudo tee -a /etc/resolv.conf

# Solution 2: Use IPv4 DNS for IPv6 resolution (temporary workaround)
# Edit /etc/resolv.conf to use IPv4 DNS servers

# Solution 3: Check /etc/gai.conf for address preference
# Ensure IPv6 is preferred:
echo "precedence ::ffff:0:0/96 100" | sudo tee /etc/gai.conf
```

### Issue 6: Dynamic IP Address Changes

```bash
#!/bin/bash
# ================================================
# Script to Update Tunnel Endpoint IP
# Run this when your public IP changes
# ================================================

# Your HE tunnel ID (find it on the tunnel details page)
TUNNEL_ID="123456"

# Your HE account credentials
HE_USER="your_username"
HE_PASS="your_password_or_update_key"

# Get current public IP
CURRENT_IP=$(curl -4 -s https://icanhazip.com)

# Update HE tunnel endpoint
curl -4 "https://${HE_USER}:${HE_PASS}@ipv4.tunnelbroker.net/nic/update?hostname=${TUNNEL_ID}&myip=${CURRENT_IP}"

# Reconfigure local tunnel with new IP
sudo ip tunnel change he-ipv6 local ${CURRENT_IP}

echo "Tunnel endpoint updated to ${CURRENT_IP}"
```

---

## Security Best Practices

### 1. Restrict Tunnel Source

Only accept tunnel packets from the legitimate tunnel broker:

```bash
# Accept Protocol 41 only from HE's IP
sudo iptables -A INPUT -p 41 -s 216.66.84.46 -j ACCEPT
sudo iptables -A INPUT -p 41 -j DROP
```

### 2. Implement IPv6 Firewall Rules

```bash
#!/bin/bash
# ================================================
# Comprehensive IPv6 Security Rules
# ================================================

# Flush existing rules
sudo ip6tables -F
sudo ip6tables -X

# Default policies
sudo ip6tables -P INPUT DROP
sudo ip6tables -P FORWARD DROP
sudo ip6tables -P OUTPUT ACCEPT

# Allow loopback
sudo ip6tables -A INPUT -i lo -j ACCEPT

# Allow established connections
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Rate limit ICMPv6
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request \
    -m limit --limit 10/second --limit-burst 20 -j ACCEPT

# Allow essential ICMPv6
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-solicitation -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement -j ACCEPT

# Allow specific services (customize as needed)
sudo ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT  # SSH
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT  # HTTP
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT # HTTPS

# Log dropped packets (optional, can be verbose)
sudo ip6tables -A INPUT -j LOG --log-prefix "IPv6 DROPPED: " --log-level 4
```

### 3. Disable IPv6 Privacy Extensions for Servers

On servers, you typically want predictable addresses:

```bash
# Disable privacy extensions (temporary addresses)
sudo sysctl -w net.ipv6.conf.all.use_tempaddr=0
sudo sysctl -w net.ipv6.conf.default.use_tempaddr=0

# Make permanent in /etc/sysctl.conf
echo "net.ipv6.conf.all.use_tempaddr = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.default.use_tempaddr = 0" | sudo tee -a /etc/sysctl.conf
```

### 4. Secure Router Advertisement Handling

If your system might receive rogue router advertisements:

```bash
# Disable accepting router advertisements on servers
sudo sysctl -w net.ipv6.conf.all.accept_ra=0
sudo sysctl -w net.ipv6.conf.default.accept_ra=0

# Disable redirects
sudo sysctl -w net.ipv6.conf.all.accept_redirects=0
```

### 5. Monitor Tunnel Traffic

```bash
#!/bin/bash
# ================================================
# IPv6 Tunnel Monitoring Script
# ================================================

echo "Monitoring IPv6 tunnel traffic..."
echo "Press Ctrl+C to stop"
echo ""

# Monitor tunnel interface statistics
watch -n 1 'echo "=== Tunnel Statistics ===" && \
    ip -s link show he-ipv6 && \
    echo "" && \
    echo "=== Active IPv6 Connections ===" && \
    ss -6 -tuln'
```

---

## Performance Optimization

### 1. Optimize MTU Settings

```bash
# Find optimal MTU using Path MTU Discovery
# Start with maximum and work down

#!/bin/bash
TARGET="ipv6.google.com"
MTU=1500

while [ $MTU -gt 1280 ]; do
    PAYLOAD=$((MTU - 48))  # IPv6 header (40) + ICMP header (8)
    if ping6 -c 1 -s $PAYLOAD -M do $TARGET > /dev/null 2>&1; then
        echo "MTU $MTU works"
        break
    fi
    MTU=$((MTU - 10))
done

echo "Optimal MTU: $MTU"
```

### 2. Enable TCP BBR for Better Throughput

```bash
# Enable BBR congestion control (if available)
sudo sysctl -w net.core.default_qdisc=fq
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr

# Verify BBR is enabled
sysctl net.ipv4.tcp_congestion_control
# Should output: net.ipv4.tcp_congestion_control = bbr
```

### 3. Optimize Socket Buffers

```bash
# Increase socket buffer sizes for better throughput
sudo sysctl -w net.core.rmem_max=16777216
sudo sysctl -w net.core.wmem_max=16777216
sudo sysctl -w net.ipv6.tcp_rmem="4096 87380 16777216"
sudo sysctl -w net.ipv6.tcp_wmem="4096 65536 16777216"
```

### 4. Choose the Nearest Tunnel Server

Hurricane Electric offers multiple Points of Presence. Use `mtr` to find the best one:

```bash
# Test latency to different HE tunnel servers
mtr -r -c 10 216.66.84.46    # Los Angeles
mtr -r -c 10 72.52.104.74    # New York
mtr -r -c 10 216.218.221.6   # Chicago
mtr -r -c 10 184.105.253.14  # Dallas
mtr -r -c 10 216.66.80.26    # London
mtr -r -c 10 216.66.80.90    # Frankfurt
```

---

## Advanced Configuration

### Setting Up IPv6 Routing for LAN

If you want to provide IPv6 to other devices on your network:

```bash
#!/bin/bash
# ================================================
# IPv6 Router Configuration
# Provides IPv6 to LAN via tunnel
# ================================================

# Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.conf

# Assign address from routed /64 to LAN interface
ROUTED_PREFIX="2001:470:1f0f:abc"
LAN_INTERFACE="eth1"

sudo ip -6 addr add ${ROUTED_PREFIX}::1/64 dev ${LAN_INTERFACE}

# Install and configure radvd for SLAAC
sudo apt-get install -y radvd

cat << EOF | sudo tee /etc/radvd.conf
# Router Advertisement Daemon Configuration
interface ${LAN_INTERFACE} {
    # Send router advertisements
    AdvSendAdvert on;

    # Set managed flag off (use SLAAC)
    AdvManagedFlag off;

    # Set other config flag off
    AdvOtherConfigFlag off;

    # Minimum interval between RAs
    MinRtrAdvInterval 30;

    # Maximum interval between RAs
    MaxRtrAdvInterval 100;

    # Prefix configuration
    prefix ${ROUTED_PREFIX}::/64 {
        # Prefix is valid for 7 days
        AdvValidLifetime 604800;

        # Prefix is preferred for 1 day
        AdvPreferredLifetime 86400;

        # Prefix is on-link
        AdvOnLink on;

        # Prefix can be used for SLAAC
        AdvAutonomous on;
    };

    # DNS configuration (optional)
    RDNSS 2001:4860:4860::8888 2001:4860:4860::8844 {
        AdvRDNSSLifetime 600;
    };
};
EOF

# Start radvd
sudo systemctl enable radvd
sudo systemctl start radvd
```

### Configuring DHCPv6 (Alternative to SLAAC)

```bash
#!/bin/bash
# ================================================
# DHCPv6 Server Configuration
# Using ISC DHCP for IPv6
# ================================================

sudo apt-get install -y isc-dhcp-server

cat << 'EOF' | sudo tee /etc/dhcp/dhcpd6.conf
# DHCPv6 Server Configuration

# Lease times
default-lease-time 600;
max-lease-time 7200;

# Enable logging
log-facility local7;

# IPv6 subnet configuration
subnet6 2001:470:1f0f:abc::/64 {
    # Address range for dynamic allocation
    range6 2001:470:1f0f:abc::1000 2001:470:1f0f:abc::1fff;

    # DNS servers
    option dhcp6.name-servers 2001:4860:4860::8888, 2001:4860:4860::8844;

    # Domain search list
    option dhcp6.domain-search "example.com";
}
EOF

# Configure interface for DHCPv6
echo 'INTERFACESv6="eth1"' | sudo tee /etc/default/isc-dhcp-server

# Start DHCPv6 server
sudo systemctl enable isc-dhcp-server
sudo systemctl start isc-dhcp-server
```

---

## Summary

Configuring an IPv6 tunnel broker is an effective way to gain IPv6 connectivity over IPv4-only infrastructure. Here is a summary of the key points covered in this guide:

### Quick Reference Table

| Task | Command/Configuration |
|------|----------------------|
| Create tunnel | `ip tunnel add he-ipv6 mode sit remote <HE_IP> local <YOUR_IP> ttl 255` |
| Bring tunnel up | `ip link set he-ipv6 up` |
| Add IPv6 address | `ip addr add <YOUR_IPV6>/64 dev he-ipv6` |
| Add default route | `ip route add ::/0 dev he-ipv6` |
| Test connectivity | `ping6 ipv6.google.com` |
| Check tunnel status | `ip tunnel show` |
| View IPv6 addresses | `ip -6 addr show` |
| View IPv6 routes | `ip -6 route show` |
| Update dynamic IP | `curl "https://user:pass@ipv4.tunnelbroker.net/nic/update?hostname=<ID>"` |

### Configuration File Locations

| System | Configuration File |
|--------|-------------------|
| Debian/Ubuntu | `/etc/network/interfaces` |
| RHEL/CentOS | `/etc/sysconfig/network-scripts/ifcfg-he-ipv6` |
| systemd-networkd | `/etc/systemd/network/he-ipv6.netdev` and `.network` |
| FreeBSD | `/etc/rc.conf` |

### Firewall Protocols and Ports

| Protocol/Port | Purpose |
|---------------|---------|
| IP Protocol 41 | 6in4 tunnel encapsulation |
| ICMPv6 | Path MTU Discovery, Neighbor Discovery |
| UDP 3544 | Teredo tunneling (if used) |

### Recommended DNS Servers

| Provider | IPv6 Address |
|----------|--------------|
| Google Primary | 2001:4860:4860::8888 |
| Google Secondary | 2001:4860:4860::8844 |
| Cloudflare Primary | 2606:4700:4700::1111 |
| Cloudflare Secondary | 2606:4700:4700::1001 |

### Best Practices Checklist

- [ ] Choose a tunnel server geographically close to you
- [ ] Configure firewall rules for both IPv4 (Protocol 41) and IPv6
- [ ] Set appropriate MTU (1480 for sit tunnels, 1280 minimum)
- [ ] Enable IPv6 forwarding if routing to LAN
- [ ] Implement rate limiting for ICMPv6
- [ ] Monitor tunnel for connectivity issues
- [ ] Set up automatic IP update script for dynamic IPs
- [ ] Test connectivity to multiple IPv6 destinations
- [ ] Document your configuration for future reference

By following this guide, you should now have a fully functional IPv6 tunnel providing access to the IPv6 internet over your existing IPv4 infrastructure. This setup is ideal for testing IPv6 compatibility, accessing IPv6-only resources, or preparing your infrastructure for the eventual full transition to IPv6.

---

## Additional Resources

- [Hurricane Electric IPv6 Tunnel Broker](https://tunnelbroker.net)
- [RIPE NCC IPv6 Info Center](https://www.ripe.net/ipv6)
- [IPv6 Test Sites](https://test-ipv6.com)
- [Linux IPv6 HOWTO](https://tldp.org/HOWTO/Linux+IPv6-HOWTO/)

---

*This guide is maintained by the OneUptime team. For questions or contributions, please visit our [GitHub repository](https://github.com/OneUptime/oneuptime).*
