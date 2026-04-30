# How to Use GRE Tunnels to Connect Remote Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, GRE, Tunnel, Networking, Routing, Site-to-Site, Subnets

Description: Connect two geographically separated subnets using a GRE tunnel on Linux routers, enabling hosts on different networks to communicate transparently.

## Introduction

GRE tunnels are commonly used to connect subnets at different sites - a classic site-to-site tunneling scenario. Each site has a Linux router that creates a GRE tunnel to the other site. The routers forward traffic between local LAN interfaces and the tunnel, with static routes directing inter-site traffic through the tunnel.

## Network Topology

```yaml
Site A: 192.168.1.0/24 - Router A (eth0: 10.0.0.1, eth1: 192.168.1.1)
          |--- GRE tunnel: gre0 ---
Site B: 192.168.2.0/24 - Router B (eth0: 10.0.0.2, eth1: 192.168.2.1)

Tunnel IPs: 172.16.0.1 (A) ↔ 172.16.0.2 (B)
```

## Configuration on Router A

```bash
# Enable IP forwarding

sysctl -w net.ipv4.ip_forward=1

# Load GRE module
modprobe ip_gre

# Create GRE tunnel
ip tunnel add gre0 mode gre local 10.0.0.1 remote 10.0.0.2 ttl 255
ip addr add 172.16.0.1/30 dev gre0
ip link set gre0 up

# Add route to Site B's LAN through the tunnel
ip route add 192.168.2.0/24 via 172.16.0.2

# Verify
ip route show | grep 192.168.2.0
```

## Configuration on Router B

```bash
sysctl -w net.ipv4.ip_forward=1
modprobe ip_gre

ip tunnel add gre0 mode gre local 10.0.0.2 remote 10.0.0.1 ttl 255
ip addr add 172.16.0.2/30 dev gre0
ip link set gre0 up

# Add route to Site A's LAN through the tunnel
ip route add 192.168.1.0/24 via 172.16.0.1
```

## Configure LAN Hosts

If the Linux router is not already the host's default gateway, add a route for the remote LAN via the local router:

```bash
# Host on Site A (192.168.1.10): route Site B through Router A
ip route add 192.168.2.0/24 via 192.168.1.1

# Host on Site B (192.168.2.10): route Site A through Router B
ip route add 192.168.1.0/24 via 192.168.2.1
```

## Test End-to-End Connectivity

```bash
# From a host on Site A, ping a host on Site B
ping 192.168.2.10

# Traceroute shows the path through the tunnel
traceroute 192.168.2.10
# 1  192.168.1.1  (Router A LAN interface)
# 2  172.16.0.2   (Router B tunnel endpoint)
# 3  192.168.2.10 (destination)
```

## Allow GRE in Firewall

```bash
# Both routers must allow GRE protocol (IP protocol 47)
iptables -A INPUT -p gre -j ACCEPT
iptables -A OUTPUT -p gre -j ACCEPT
iptables -A FORWARD -i gre0 -j ACCEPT
iptables -A FORWARD -o gre0 -j ACCEPT
```

## Add MSS Clamping for TCP

```bash
# Prevent TCP fragmentation through the tunnel
iptables -t mangle -A FORWARD -o gre0 -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu
```

## Make Configuration Persistent

```bash
# Save sysctl
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.d/99-forwarding.conf

# Use systemd-networkd .netdev and .network files for tunnel and route persistence
```

## Conclusion

Connecting remote subnets with GRE requires a router at each site with: IP forwarding enabled, a GRE tunnel to the remote router, and a static route for the remote subnet via the tunnel. If the Linux routers are already the LAN hosts' default gateways, no additional host-side routing changes are required; otherwise, add a route for the remote subnet via the local router. This setup creates transparent inter-site connectivity between the two LANs.
