# How to Set Up a 6to4 Tunnel for IPv6 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: 6to4, IPv6, Tunnel, IPv4, Transition, Networking

Description: Configure a 6to4 tunnel to provide IPv6 connectivity over an IPv4 network, understanding the 2002::/16 address space and its limitations.

## Introduction

6to4 (RFC 3056) automatically derives an IPv6 address from an existing public IPv4 address using the 2002::/16 prefix. An IPv4 address of a.b.c.d becomes the IPv6 prefix `2002:aabb:ccdd::/48`. A typical 6to4 deployment requires the 6to4 router itself to have a globally reachable public IPv4 address, so it does not work from a host hidden behind ordinary NAT.

## Address Derivation

```text
IPv4 address: 203.0.113.10
Hex: cb.00.71.0a
6to4 prefix: 2002:cb00:710a::/48

IPv4: 10.0.0.5
Hex: 0a.00.00.05
6to4 prefix: 2002:0a00:0005::/48  (private - DON'T use 6to4 with private IPs!)
```

## Checking Prerequisites

```bash
# 6to4 requires the 6to4 router to use a public IPv4 address (not RFC1918)

# Check the IPv4 address assigned to this host
ip -4 addr show scope global

# Check the externally visible IPv4 address
curl -4 https://ifconfig.me
# For 6to4 on this host, these need to match.
# If this host only has RFC1918 or CGNAT space locally, 6to4 will NOT work from this machine.

# Check if 6to4 module is available
sudo modprobe sit
# SIT support may be built into the kernel and not appear in lsmod
lsmod | grep sit
```

## Configuring 6to4 Tunnel (Linux)

```bash
# Create the 6to4 tunnel interface
# Replace 203.0.113.10 with your actual public IPv4

PUBLIC_IP=203.0.113.10
# Convert to hex: 203=cb, 0=00, 113=71, 10=0a
# 6to4 prefix: 2002:cb00:710a::/48

sudo ip tunnel add tun6to4 mode sit remote any local $PUBLIC_IP ttl 64
sudo ip link set tun6to4 up
sudo ip -6 address add 2002:cb00:710a::1/16 dev tun6to4
# The public anycast relay 192.88.99.1 is deprecated; only use it if your ISP or network still provides a working relay
sudo ip -6 route add 2000::/3 via ::192.88.99.1 dev tun6to4
```

## Persistent Configuration (Debian/interfaces)

```bash
# /etc/network/interfaces

# 6to4 tunnel
auto tun6to4
iface tun6to4 inet6 6to4
    local 203.0.113.10
    ttl 64
    mtu 1472
```

## Testing 6to4 Connectivity

```bash
# Verify 6to4 interface is up
ip address show tun6to4
ip -6 route show | grep tun6to4

# Ping an IPv6 address through the tunnel
ping -6 2001:4860:4860::8888

# Test IPv6 internet access
curl -6 https://ipv6.google.com

# If your network still provides the deprecated anycast relay, check that its IPv4 endpoint is reachable
ping 192.88.99.1
```

## Limitations of 6to4

| Issue | Description |
|---|---|
| Requires public IPv4 | Typical deployments need a globally reachable IPv4 address on the 6to4 router |
| Anycast relays unreliable | 192.88.99.1 anycast may be unreachable |
| Deprecated | RFC 7526 deprecated 6to4 anycast |
| Performance | Extra encapsulation overhead |
| Preferred alternative | Use 6in4 (Hurricane Electric) or native IPv6 |

## Conclusion

6to4 tunnels provide quick IPv6 connectivity over IPv4 by encoding the public IPv4 address into the `2002::/16` prefix. While it works without any registration or service setup, its public anycast relay model is deprecated (RFC 7526) due to unreliable relay infrastructure. For reliable IPv6 tunneling, prefer 6in4 tunnels from Hurricane Electric (he.net) or request native IPv6 from your ISP.
