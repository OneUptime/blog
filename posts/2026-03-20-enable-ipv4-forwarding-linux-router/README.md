# How to Enable IPv4 Packet Forwarding on a Linux Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Linux, IPv4, Router

Description: Learn how to turn a Linux machine into an IPv4 router by enabling packet forwarding and configuring routes between multiple network interfaces.

## Linux as a Router

A Linux machine with two or more network interfaces can act as a router by:
1. Enabling IP forwarding (kernel allows packets to cross interfaces)
2. Configuring correct IP addresses on each interface
3. Adding necessary routes

## Network Topology

```text
[Network A]  192.168.1.0/24        [Network B]  192.168.2.0/24
     |                                    |
  eth0: 192.168.1.1             eth1: 192.168.2.1
           [Linux Router]
```

## Step 1: Assign IP Addresses

```bash
# Configure eth0 (LAN A)

ip addr add 192.168.1.1/24 dev eth0
ip link set eth0 up

# Configure eth1 (LAN B)
ip addr add 192.168.2.1/24 dev eth1
ip link set eth1 up
```

## Step 2: Enable IP Forwarding

```bash
# Temporary
sysctl -w net.ipv4.ip_forward=1

# Permanent
cat > /etc/sysctl.d/99-ip-forwarding.conf << 'EOF'
net.ipv4.ip_forward = 1
EOF
sysctl --system
```

## Step 3: Configure Client Routing

Hosts on each network must use the Linux router as their gateway:

```bash
# On Host in Network A (192.168.1.x):
ip route add default via 192.168.1.1

# On Host in Network B (192.168.2.x):
ip route add default via 192.168.2.1

# Or for specific remote network routing:
# From Network A, to reach Network B:
ip route add 192.168.2.0/24 via 192.168.1.1
```

## Step 4: Optional - Configure iptables for Forwarding

If the FORWARD chain policy is ACCEPT and no firewall rules block it, forwarding works once `net.ipv4.ip_forward` is enabled. But if iptables has a DROP policy:

```bash
# Allow forwarding between networks
iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT
iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT

# Or use conntrack-based forwarding (more secure)
iptables -A FORWARD -i eth0 -o eth1 -m conntrack --ctstate NEW,RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i eth1 -o eth0 -m conntrack --ctstate NEW,RELATED,ESTABLISHED -j ACCEPT
```

## Testing Router Connectivity

```bash
# From a host in Network A, ping a host in Network B
ping 192.168.2.10

# Traceroute should show the Linux router as hop 1
traceroute 192.168.2.10

# Expected:
# 1. 192.168.1.1  (Linux router - eth0)
# 2. 192.168.2.10 (destination host)
```

## Adding Internet Access via a Third Interface

If the router also has WAN access:

```bash
# eth2: WAN interface with a dynamic public IP (e.g., via DHCP)
# Add NAT for both LANs to reach internet
iptables -t nat -A POSTROUTING -o eth2 -j MASQUERADE
iptables -A FORWARD -i eth0 -o eth2 -j ACCEPT
iptables -A FORWARD -i eth1 -o eth2 -j ACCEPT
iptables -A FORWARD -i eth2 -o eth0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i eth2 -o eth1 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
```

## Complete Router Script

```bash
#!/bin/bash
# configure-linux-router.sh

# Assign IPs
ip addr add 192.168.1.1/24 dev eth0
ip addr add 192.168.2.1/24 dev eth1
ip link set eth0 up
ip link set eth1 up

# Enable forwarding
sysctl -w net.ipv4.ip_forward=1

# Allow forwarding between networks
iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT
iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT

echo "Linux router configured!"
ip route show
```

## Key Takeaways

- Enable forwarding with `sysctl -w net.ipv4.ip_forward=1`.
- Each subnet interface gets its own IP address (it serves as the gateway for that subnet).
- Hosts on each network need routes pointing to the Linux router.
- Use iptables FORWARD rules if the filter table has a DROP default policy.

**Related Reading:**

- [How to Set Up IP Forwarding on Linux](https://oneuptime.com/blog/post/2026-03-20-ip-forwarding-linux/view)
- [How to Add a Static Route on Linux](https://oneuptime.com/blog/post/2026-03-20-add-static-route-linux/view)
- [How to Set Up NAT Masquerading on a Linux Gateway](https://oneuptime.com/blog/post/2026-03-20-nat-masquerading-linux-gateway/view)
