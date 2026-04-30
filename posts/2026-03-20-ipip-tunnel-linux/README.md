# How to Create an IPIP Tunnel on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, IPIP, Tunnel, Networking, iproute2, IPv4, Encapsulation

Description: Create an IP-in-IP (IPIP) tunnel between two Linux hosts to encapsulate IPv4 traffic inside IPv4 packets for simple point-to-point routing.

## Introduction

IPIP (IP-in-IP) is the simplest tunneling protocol, encapsulating IPv4 packets inside other IPv4 packets using IP protocol number 4. It has lower overhead than GRE (no GRE header) but supports only IPv4 encapsulation. IPIP is useful for simple point-to-point tunnels where GRE's additional capabilities (like multicast or IPv6) are not needed.

## IPIP vs GRE Comparison

| Feature | IPIP | GRE |
|---|---|---|
| Protocol overhead | Minimal (IP header only) | IP + GRE header (4 extra bytes) |
| IPv4 support | Yes | Yes |
| IPv6 support | No | Yes |
| Multicast support | No | Yes |
| Complexity | Simple | Moderate |

## Create an IPIP Tunnel

### On Host A (10.0.0.1)

```bash
# Load the IPIP module

modprobe ipip

# Create the IPIP tunnel
ip tunnel add ipip0 mode ipip \
    local 10.0.0.1 \
    remote 10.0.0.2 \
    ttl 255

# Assign overlay IP
ip addr add 172.16.0.1/30 dev ipip0

# Bring up the tunnel
ip link set ipip0 up
```

### On Host B (10.0.0.2)

```bash
modprobe ipip

ip tunnel add ipip0 mode ipip \
    local 10.0.0.2 \
    remote 10.0.0.1 \
    ttl 255

ip addr add 172.16.0.2/30 dev ipip0
ip link set ipip0 up
```

## Test the Tunnel

```bash
# Ping the far end of the tunnel
ping -c 3 172.16.0.2

# Verify tunnel statistics
ip -s link show ipip0
```

## Add Routes Through the Tunnel

```bash
# On both hosts, if they will route traffic between LANs
sysctl -w net.ipv4.ip_forward=1

# On Host A: reach Host B's LAN
ip route add 192.168.2.0/24 via 172.16.0.2

# On Host B: reach Host A's LAN
ip route add 192.168.1.0/24 via 172.16.0.1
```

## View IPIP Tunnels

```bash
# Show all tunnels
ip tunnel show

# Show IPIP-specific tunnels
ip tunnel show | grep ipip
```

## Persistent Configuration with systemd-networkd

```ini
# /etc/systemd/network/10-ipip0.netdev
[NetDev]
Name=ipip0
Kind=ipip

[Tunnel]
Independent=yes
Local=10.0.0.1
Remote=10.0.0.2
TTL=255
```

```ini
# /etc/systemd/network/10-ipip0.network
[Match]
Name=ipip0

[Network]
Address=172.16.0.1/30

[Route]
Destination=192.168.2.0/24
Gateway=172.16.0.2
```

## Capture IPIP Traffic

```bash
# IPIP uses IP protocol 4
tcpdump -i eth0 proto 4 -n

# Or filter by host
tcpdump -i eth0 proto 4 and host 10.0.0.2
```

## Conclusion

IPIP tunnels are the most lightweight tunneling option on Linux for IPv4-over-IPv4. Use them when you need simple point-to-point IP encapsulation and don't require multicast or non-IP protocol support. IPIP has less overhead than GRE but is more limited in capability. Load the `ipip` module, create the tunnel with `ip tunnel add mode ipip`, assign an overlay IP, and if you are routing other subnets through the tunnel, enable IPv4 forwarding and add static routes for the remote subnets.
