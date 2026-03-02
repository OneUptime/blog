# How to Configure Split Tunneling with WireGuard on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WireGuard, VPN, Networking, Routing

Description: Configure WireGuard split tunneling on Ubuntu to route only specific traffic through the VPN while keeping other traffic on the local internet connection.

---

By default, many WireGuard setups route all traffic through the VPN tunnel. Split tunneling is an approach where only specific traffic - such as traffic destined for corporate resources or a private network - goes through the VPN, while everything else uses the local internet connection directly.

Split tunneling reduces VPN server load, avoids latency for traffic that doesn't need VPN protection, and lets you access local network resources while connected to a remote VPN.

## The AllowedIPs Field Is the Key

In WireGuard, split tunneling is controlled entirely by the `AllowedIPs` field in the peer configuration. This field does two things:

1. **Defines which packets are sent through this peer's tunnel** - any outbound packet with a destination matching `AllowedIPs` goes through WireGuard
2. **Defines which source IPs are accepted from this peer** - inbound packets are only accepted if their source IP is in `AllowedIPs`

Full tunnel configuration routes everything:

```ini
[Peer]
AllowedIPs = 0.0.0.0/0, ::/0   # Route ALL traffic through the VPN
```

Split tunnel configuration routes only specific subnets:

```ini
[Peer]
AllowedIPs = 10.0.0.0/8, 192.168.100.0/24   # Only route these networks through VPN
```

## Basic Split Tunnel Configuration

### Scenario: Access a Private Corporate Network via VPN

You want to reach `10.10.0.0/16` (corporate resources) through the VPN, but browse the internet normally.

Client configuration:

```ini
[Interface]
PrivateKey = CLIENT_PRIVATE_KEY
Address = 10.0.0.2/24

# No DNS override - keep using your normal DNS for internet
# DNS = 10.10.0.1   # Uncomment if you need to resolve corporate hostnames

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = vpn.company.com:51820

# SPLIT TUNNEL: Only route corporate subnet through VPN
# Internet traffic goes directly through your normal connection
AllowedIPs = 10.0.0.0/24, 10.10.0.0/16

# Keep NAT mapping alive for peers behind NAT
PersistentKeepalive = 25
```

After connecting, check the routing table:

```bash
# Start the VPN
sudo wg-quick up wg0

# View routes
ip route show

# You should see specific routes for the VPN subnets
# and your default route still pointing to your ISP gateway
```

## Calculating AllowedIPs for Full Tunnel Except Specific IPs

Sometimes you want everything through the VPN except specific addresses (like your home router or a local printer). There's no direct "exclude" syntax in WireGuard, but you can achieve this by calculating the complementary CIDR blocks.

For example, to route everything except `192.168.1.0/24`:

```ini
AllowedIPs = 0.0.0.0/1, 128.0.0.0/1  # This is equivalent to 0.0.0.0/0 but allows adding exclusions
```

The WireGuard AllowedIPs Calculator is useful here:

```bash
# Install the wg-quick wrapper
# Most Ubuntu systems use wg-quick which does this calculation automatically

# Example: AllowedIPs that covers everything except 192.168.1.0/24
# Use the "CIDR hole" technique:
# 0.0.0.0/5, 8.0.0.0/7, 10.0.0.0/8, 11.0.0.0/8, 12.0.0.0/6, ...
# (too long to write manually - use a calculator tool)
```

Use the `wg-allowedips` tool or online calculators to generate the proper CIDR list.

## Policy-Based Routing for Advanced Split Tunneling

For more complex scenarios where routing decisions depend on source address, user, or application, use Linux policy routing with WireGuard.

### Mark Specific Processes for VPN Routing

This approach marks network traffic from specific processes and routes marked traffic through the VPN:

```bash
# Create a separate routing table for VPN traffic
# Add this to /etc/iproute2/rt_tables if not already there
echo "200 vpn" | sudo tee -a /etc/iproute2/rt_tables

# Add routes to the VPN table
sudo ip route add default dev wg0 table vpn

# Use iptables to mark traffic from specific user (uid 1001)
sudo iptables -t mangle -A OUTPUT -m owner --uid-owner 1001 -j MARK --set-mark 200

# Route marked traffic using the VPN table
sudo ip rule add fwmark 200 table vpn
```

Now any traffic from user with UID 1001 goes through the VPN, while other users use the normal route.

### Application-Specific VPN Routing with cgroups

A cleaner approach uses cgroups to isolate application traffic:

```bash
# Create a cgroup for VPN applications
sudo mkdir -p /sys/fs/cgroup/net_cls/vpn_apps

# Assign a class ID to the cgroup
echo 0x00110011 | sudo tee /sys/fs/cgroup/net_cls/vpn_apps/net_cls.classid

# Add iptables rule to mark traffic from this cgroup
sudo iptables -t mangle -A OUTPUT -m cgroup --cgroup 0x00110011 -j MARK --set-mark 200

# Route marked traffic through VPN
sudo ip rule add fwmark 200 table vpn

# Run an application in the VPN cgroup
sudo cgexec -g net_cls:vpn_apps /usr/bin/curl https://internal.example.com
```

## wg-quick Integration for Split Tunneling

`wg-quick` has a `Table` option that controls how routes are managed. For split tunneling:

```ini
[Interface]
PrivateKey = CLIENT_PRIVATE_KEY
Address = 10.0.0.2/24

# Use a specific routing table instead of main
# Table = 51820

# PostUp and PreDown for custom routing rules
PostUp = ip rule add table main suppress_prefixlength 0
PreDown = ip rule del table main suppress_prefixlength 0

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = vpn.example.com:51820
AllowedIPs = 10.0.0.0/8
PersistentKeepalive = 25
```

The `suppress_prefixlength 0` trick with `ip rule` can be combined with wg-quick's fwmark feature for flexible routing.

## Split DNS with Split Tunneling

Split tunneling often requires split DNS - corporate hostnames should resolve through the VPN's DNS, while public hostnames use your normal DNS.

### Using systemd-resolved

```bash
# After the VPN connects, configure DNS for the VPN interface
sudo resolvectl dns wg0 10.10.0.53    # VPN's DNS server
sudo resolvectl domain wg0 corp.internal   # Domain suffix for VPN DNS

# Public DNS remains on the default interface
# Verify
sudo resolvectl status
```

### Using wg-quick Hooks

```ini
[Interface]
PrivateKey = CLIENT_PRIVATE_KEY
Address = 10.0.0.2/24

# Set DNS only for corporate domains using systemd-resolved
PostUp = resolvectl dns %i 10.10.0.53; resolvectl domain %i corp.internal ~corp.internal
PreDown = resolvectl revert %i

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = vpn.example.com:51820
AllowedIPs = 10.0.0.0/8, 10.10.0.0/16
PersistentKeepalive = 25
```

The `~corp.internal` prefix tells systemd-resolved to use the VPN DNS exclusively for that domain, while public domains still use the default DNS.

## Verifying Split Tunnel Configuration

After setting up split tunneling, verify that traffic routes correctly:

```bash
# Start the WireGuard interface
sudo wg-quick up wg0

# Check the routing table - should have VPN-specific routes
ip route show

# Verify internet traffic doesn't go through VPN
# (the route to 8.8.8.8 should NOT go through wg0)
ip route get 8.8.8.8

# Verify corporate traffic DOES go through VPN
ip route get 10.10.0.100
# Should show: 10.10.0.100 via ... dev wg0 ...

# Traceroute to confirm paths
traceroute 8.8.8.8          # Should NOT go through VPN
traceroute 10.10.0.100      # Should go through VPN

# Check your external IP (should be your normal ISP IP with split tunnel)
curl ifconfig.me
```

## Common Split Tunnel Issues

### All Traffic Still Going Through VPN

Check if the server is pushing a `redirect-gateway` directive:

```bash
# View WireGuard status - check what routes were added
sudo wg show

# Look at the full route table
ip route show table all | grep wg0

# If a 0.0.0.0/0 route points to wg0, AllowedIPs is overriding your intent
# Make sure AllowedIPs in the config does NOT include 0.0.0.0/0
```

### Local Network Not Accessible Through VPN Interface

When doing split tunneling, your local subnet might conflict with VPN routes:

```bash
# Example: your local network is 10.0.0.0/24 and so is the VPN
# This creates a conflict

# Solution: use a different VPN subnet that doesn't conflict
# Or add explicit routes for your local network
sudo ip route add 192.168.1.0/24 via 192.168.1.1 dev eth0 metric 10
```

### DNS Resolving Incorrectly

```bash
# Check which DNS is being used
resolvectl status

# Test DNS resolution
dig corp.internal @10.10.0.53    # Through VPN DNS
dig google.com                    # Through normal DNS
```

Split tunneling gives you fine-grained control over which traffic benefits from VPN protection. By carefully setting `AllowedIPs` and combining that with split DNS configuration, you can build a setup that accesses private resources securely while keeping normal internet traffic fast and direct.
