# How to Create a SIT Tunnel for IPv6-over-IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, SIT, IPv6, Tunnel, 6in4, Networking, IPv6 Transition

Description: Create a SIT (Simple Internet Transition) tunnel on Linux to carry IPv6 traffic over an IPv4 network, enabling IPv6 connectivity in IPv4-only environments.

## Introduction

SIT (Simple Internet Transition) tunnels, also known as 6in4 tunnels, encapsulate IPv6 packets inside IPv4 packets. They are commonly used to get IPv6 connectivity when your ISP only provides IPv4, by tunneling IPv6 through an IPv6 tunnel broker service like Hurricane Electric (tunnelbroker.net).

## Use Cases

- Connect to an IPv6 tunnel broker for IPv6 connectivity
- Connect two IPv6 islands over an IPv4 backbone
- Transition from IPv4 to IPv6 infrastructure gradually

## Create a SIT Tunnel (6in4)

### Using a Tunnel Broker (e.g., Hurricane Electric)

Hurricane Electric provides these values when you create a tunnel:
- Server IPv4 endpoint: `64.62.134.130` (example)
- Client IPv4 endpoint: your public IP
- Server IPv6 endpoint: `2001:db8::1/64` (example)
- Client IPv6 endpoint: `2001:db8::2/64` (example)

```bash
# Load the SIT module

modprobe sit

# Create the SIT tunnel
ip tunnel add he-ipv6 mode sit \
    local <your-public-ipv4> \
    remote 64.62.134.130 \
    ttl 255

# Bring up the tunnel
ip link set he-ipv6 up

# Assign IPv6 address to the tunnel
ip addr add 2001:db8::2/64 dev he-ipv6

# Add IPv6 default route through the tunnel
ip -6 route add ::/0 dev he-ipv6
```

### Site-to-Site SIT Tunnel (Private)

```bash
# Host A (IPv4: 10.0.0.1)
ip tunnel add sit-ipv6 mode sit \
    local 10.0.0.1 \
    remote 10.0.0.2 \
    ttl 255
ip addr add 2001:db8:a::1/64 dev sit-ipv6
ip link set sit-ipv6 up

# Host B (IPv4: 10.0.0.2)
ip tunnel add sit-ipv6 mode sit \
    local 10.0.0.2 \
    remote 10.0.0.1 \
    ttl 255
ip addr add 2001:db8:a::2/64 dev sit-ipv6
ip link set sit-ipv6 up
```

## Test IPv6 Connectivity

```bash
# Ping the tunnel far end
ping -6 -c 3 2001:db8::1

# Test internet IPv6 connectivity
ping -6 -c 3 2606:4700:4700::1111

# Show IPv6 routes
ip -6 route show
```

## Verify Tunnel

```bash
# Show tunnel details
ip tunnel show he-ipv6
ip -d link show he-ipv6

# Show IPv6 address
ip -6 addr show he-ipv6
```

## Persistent Configuration with systemd-networkd

```ini
# /etc/systemd/network/10-he-ipv6.netdev
[NetDev]
Name=he-ipv6
Kind=sit

[Tunnel]
Independent=yes
Local=<your-public-ipv4>
Remote=64.62.134.130
TTL=255
```

```ini
# /etc/systemd/network/10-he-ipv6.network
[Match]
Name=he-ipv6

[Network]
Address=2001:db8::2/64

[Route]
Destination=::/0
```

## Conclusion

SIT tunnels provide a straightforward path to IPv6 connectivity over IPv4 networks. They are widely used with IPv6 tunnel brokers for home and lab use. The `mode sit` creates a 6in4 tunnel - IPv6 packets are encapsulated in IPv4 with IP protocol 41. For production IPv6 connectivity, prefer native IPv6 from your ISP, using SIT tunnels as a transition mechanism.
