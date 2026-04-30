# How to Enable IP Forwarding for GRE Tunnel Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, GRE, Tunnel, IP Forwarding, Routing, Networking, Sysctl

Description: Enable IPv4 IP forwarding on a Linux router to allow GRE tunnel traffic to route between the tunnel interface and LAN interfaces.

## Introduction

GRE tunnels connect remote networks, but for traffic to flow between the tunnel and local networks, the Linux host must act as a router. IP forwarding must be enabled so that packets arriving on the tunnel interface are forwarded to the correct LAN interface, and vice versa.

## Check Current IP Forwarding State

```bash
# Check if forwarding is enabled (1=enabled, 0=disabled)

sysctl net.ipv4.ip_forward

# Or directly read the proc file
cat /proc/sys/net/ipv4/ip_forward
```

## Enable IP Forwarding Temporarily

```bash
# Enable immediately (does not survive reboot)
sysctl -w net.ipv4.ip_forward=1

# Or write directly to proc
echo 1 > /proc/sys/net/ipv4/ip_forward
```

## Enable IP Forwarding Persistently

```bash
# Add to sysctl configuration file
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.d/99-forwarding.conf

# Apply the configuration
sysctl -p /etc/sysctl.d/99-forwarding.conf

# Verify
sysctl net.ipv4.ip_forward
# net.ipv4.ip_forward = 1
```

## Per-Interface Forwarding

You can also control forwarding on specific interfaces:

```bash
# Enable forwarding specifically for the GRE tunnel interface
echo 1 > /proc/sys/net/ipv4/conf/gre0/forwarding

# Enable for the LAN interface
echo 1 > /proc/sys/net/ipv4/conf/eth1/forwarding
```

## Full Setup: GRE Tunnel with IP Forwarding

```bash
#!/bin/bash
# gre-with-forwarding.sh

# Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1

# Create GRE tunnel (Host A side)
modprobe ip_gre
ip tunnel add gre0 mode gre local 10.0.0.1 remote 10.0.0.2 ttl 255
ip addr add 172.16.0.1/30 dev gre0
ip link set gre0 up

# Add route to Host B's LAN
ip route add 192.168.2.0/24 via 172.16.0.2

# Allow forwarding between tunnel and LAN in firewall
iptables -A FORWARD -i gre0 -o eth1 -j ACCEPT
iptables -A FORWARD -i eth1 -o gre0 -j ACCEPT
```

## Allow Forwarding in Firewall

If you have a restrictive FORWARD chain policy, you must explicitly allow tunnel forwarding:

```bash
# Allow traffic between GRE tunnel and LAN
iptables -A FORWARD -i gre0 -j ACCEPT
iptables -A FORWARD -o gre0 -j ACCEPT

# Or with nftables (assuming the inet filter table and forward base chain already exist)
nft add rule inet filter forward iifname "gre0" accept
nft add rule inet filter forward oifname "gre0" accept
```

## Reverse Path Filtering Consideration

Reverse path filtering may drop tunnel traffic. Check and adjust if needed:

```bash
# Check global and tunnel rp_filter settings
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.conf.gre0.rp_filter

# If needed, disable reverse path filtering globally and on the tunnel interface
# Linux uses the higher value of conf/all/rp_filter and conf/<iface>/rp_filter.
echo 0 > /proc/sys/net/ipv4/conf/all/rp_filter
echo 0 > /proc/sys/net/ipv4/conf/gre0/rp_filter
```

## Conclusion

IP forwarding is the fundamental requirement for a Linux host to route traffic between a GRE tunnel and LAN interfaces. Enable it with `sysctl -w net.ipv4.ip_forward=1` for immediate effect and persist it in `/etc/sysctl.d/`. Always add matching FORWARD chain firewall rules if your default FORWARD policy is DROP, and consider reverse path filtering when tunnels arrive on unexpected interfaces.
