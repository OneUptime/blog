# How to Set Up a Linux Machine as an IPv4 Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, Routing, iptables, NAT

Description: Turn a Linux machine into a fully functional IPv4 router with IP forwarding, static routes, and optional NAT masquerading using kernel networking features.

## Introduction

A standard Linux machine can act as a router for IPv4 traffic with minimal configuration. By enabling IP forwarding in the kernel and configuring routes between interfaces, you can route traffic between subnets - useful for home labs, cloud VPCs, and edge routing scenarios.

## Prerequisites

- Linux machine with at least two network interfaces (physical or virtual)
- Root or sudo access
- Interfaces connected to the subnets you want to route between

## Step 1: Enable IP Forwarding

By default, the Linux kernel does not forward packets that arrive on one interface and are destined for another. Enable forwarding:

```bash
# Enable immediately (does not survive reboot)

sysctl -w net.ipv4.ip_forward=1

# Make permanent across reboots
echo "net.ipv4.ip_forward=1" | tee /etc/sysctl.d/99-ip-forward.conf
sysctl -p /etc/sysctl.d/99-ip-forward.conf

# Verify
sysctl net.ipv4.ip_forward
# Should return: net.ipv4.ip_forward = 1
```

## Step 2: Configure Interfaces

Assign IP addresses to each interface that connects to a subnet:

```bash
# Interface eth0: connected to 192.168.1.0/24 (LAN side)
ip addr add 192.168.1.1/24 dev eth0
ip link set eth0 up

# Interface eth1: connected to 10.0.0.0/24 (WAN or upstream)
ip addr add 10.0.0.2/24 dev eth1
ip link set eth1 up
```

## Step 3: Add Static Routes

Tell the router how to reach remote networks:

```bash
# Route to reach 172.16.0.0/24 via upstream gateway
ip route add 172.16.0.0/24 via 10.0.0.1

# Default route (gateway to internet)
ip route add default via 10.0.0.1

# Verify routing table
ip route show
```

If `10.0.0.1` is routing traffic onward to `172.16.0.0/24`, it also needs a route back to `192.168.1.0/24` via `10.0.0.2` unless you enable NAT in the next step.

## Step 4: Configure NAT (Optional)

If the Linux router is the internet gateway for the LAN and the address on `eth1` may change, enable masquerading:

```bash
# Masquerade all traffic leaving through eth1 (WAN interface)
iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE

# Allow forwarded traffic
iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT
iptables -A FORWARD -i eth1 -o eth0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Save rules (Debian/Ubuntu)
apt install iptables-persistent
netfilter-persistent save
```

If `eth1` has a static address, use `SNAT` instead of `MASQUERADE`.

## Step 5: Configure LAN Clients

Hosts on the 192.168.1.0/24 subnet should use the Linux router as their default gateway:

```bash
# On a LAN client, set default gateway to the router's IP
ip route add default via 192.168.1.1

# Or configure via DHCP by advertising 192.168.1.1 as the router/default gateway
```

## Verifying the Router

```bash
# Test forwarding: from a LAN host, ping a host on the other subnet
ping -c 4 172.16.0.1

# From the router, check that packets are being forwarded
watch -n 1 "ip -s link show eth0; ip -s link show eth1"

# Check conntrack for active forwarded connections (if the conntrack tool is installed)
conntrack -L | head -20
```

## Conclusion

Setting up Linux as an IPv4 router takes only a few commands. For production use, make all configurations persistent via netplan, systemd-networkd, or `/etc/network/interfaces`. For dynamic routing, install FRR to run OSPF or BGP alongside your static configuration.
