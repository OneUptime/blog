# How to Set Up GRE Tunnel Between Linux and a Cisco Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, GRE, Cisco, Tunnel, Networking, Interoperability, Site-to-Site

Description: Configure a compatible GRE tunnel between a Linux host and a Cisco router for site-to-site connectivity, ensuring matching tunnel parameters on both sides.

## Introduction

GRE is an open standard (RFC 2784), so Linux and Cisco routers interoperate natively. Both use the same GRE encapsulation. The key is matching the tunnel parameters (local/remote IPs, optional key, and routing) on both sides.

## Topology

```text
Linux Host:  Underlay IP = 10.0.0.1, Tunnel IP = 172.16.0.1/30, LAN = 192.168.1.0/24
Cisco Router: Underlay IP = 10.0.0.2, Tunnel IP = 172.16.0.2/30, LAN = 192.168.2.0/24
```

## Linux Configuration

```bash
# Load GRE module

modprobe ip_gre

# Create the GRE tunnel
ip tunnel add gre1 mode gre \
    local 10.0.0.1 \
    remote 10.0.0.2 \
    ttl 255

# Assign tunnel endpoint IP
ip addr add 172.16.0.1/30 dev gre1

# Bring up the tunnel
ip link set gre1 up

# Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1

# Add route to Cisco's LAN
ip route add 192.168.2.0/24 via 172.16.0.2

# Allow GRE in firewall
iptables -A INPUT -p gre -j ACCEPT
iptables -A OUTPUT -p gre -j ACCEPT
iptables -A FORWARD -i gre1 -j ACCEPT
iptables -A FORWARD -o gre1 -j ACCEPT
```

## Cisco Router Configuration

```text
! Cisco IOS configuration (provided for reference)
interface Tunnel0
 ip address 172.16.0.2 255.255.255.252
 tunnel source 10.0.0.2
 tunnel destination 10.0.0.1
 tunnel mode gre ip
!
ip route 192.168.1.0 255.255.255.0 172.16.0.1
```

## With GRE Tunnel Key (Optional)

Using a tunnel key provides an extra level of discrimination for multiple GRE tunnels:

**Linux:**
```bash
ip tunnel add gre1 mode gre \
    local 10.0.0.1 \
    remote 10.0.0.2 \
    ttl 255 \
    key 12345
```

**Cisco:**
```text
interface Tunnel0
 tunnel key 12345
```

## Verify the Tunnel

```bash
# On Linux
ip link show gre1
ping -c 3 172.16.0.2

# Check GRE traffic is flowing
tcpdump -i eth0 proto gre -n
```

## Test End-to-End

```bash
# Ping Cisco LAN hosts from Linux
ping 192.168.2.1

# Traceroute should cross the tunnel; exact hop output varies by platform and routing
traceroute 192.168.2.1
```

## Common Interoperability Issues

| Issue | Cause | Fix |
|---|---|---|
| Tunnel up, no traffic | Key mismatch | Ensure both sides have same key or no key |
| Packets lost | MTU/PMTU issue | Reduce tunnel MTU to account for GRE overhead (for example, 1476 for plain GRE over IPv4 on a 1500-byte path) |
| One-way traffic | Routing/NAT issue | Check routes and firewall on both sides |

## Conclusion

Linux GRE tunnels interoperate natively with Cisco IOS GRE tunnels. Match the tunnel mode (`gre ip` on Cisco = `mode gre` on Linux), local/remote IPs, optional key, and add routes for the remote LAN on both sides. The only difference is the configuration syntax - the underlying GRE protocol is identical.
