# How to Set Up a 6in4 Tunnel with Hurricane Electric for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: 6in4, IPv6, Hurricane Electric, Tunnel, IPv4, Transition, Networking

Description: Configure a 6in4 tunnel from Hurricane Electric (HE.net) to get free IPv6 connectivity over an IPv4 connection, with static addressing and routing.

## Introduction

Hurricane Electric's Tunnelbroker.net provides free 6in4 tunnels that encapsulate IPv6 packets inside IPv4 packets (protocol 41). Unlike 6to4, 6in4 tunnels connect to a specific endpoint (HE's server) and provide stable, static IPv6 addresses with a /64 routed subnet.

## Prerequisites

```bash
# 1. Register at https://tunnelbroker.net/ (free)

# 2. Create a new tunnel - enter your public IPv4 address
# 3. Note your tunnel details:
#    Server IPv4: 216.66.88.98       (HE's endpoint)
#    Server IPv6: 2001:470:1f14:xxx::1/64
#    Client IPv6: 2001:470:1f14:xxx::2/64
#    Routed /64:  2001:470:1f15:xxx::/64

# Verify your public IPv4 is accessible (HE will test it):
curl -4 https://ifconfig.me
# HE uses your public IPv4 endpoint.
# If you're behind NAT, the NAT device must allow and forward IP protocol 41.
```

## Linux Configuration

```bash
# Create 6in4 tunnel interface (protocol 41 = IPv6-in-IPv4)
# HE's server IPv4: 216.66.88.98
# Your public IPv4: 203.0.113.10
sudo ip tunnel add he-ipv6 mode sit \
  remote 216.66.88.98 \
  local 203.0.113.10 \
  ttl 255

sudo ip link set he-ipv6 up
sudo ip link set he-ipv6 mtu 1480

# Assign your client IPv6 address
sudo ip address add 2001:470:1f14:XXX::2/64 dev he-ipv6

# Add default IPv6 route through tunnel
sudo ip -6 route add ::/0 via 2001:470:1f14:XXX::1 dev he-ipv6 metric 1
```

## Persistent Configuration (Debian/Ubuntu)

```bash
# /etc/network/interfaces

auto he-ipv6
iface he-ipv6 inet6 v4tunnel
    address 2001:470:1f14:XXX::2
    netmask 64
    endpoint 216.66.88.98       # HE server IPv4
    local 203.0.113.10          # Your public IPv4
    ttl 255
    mtu 1480
    gateway 2001:470:1f14:XXX::1
```

## Netplan Configuration (Ubuntu 18.04+)

```yaml
# /etc/netplan/01-he-tunnel.yaml

network:
  version: 2
  tunnels:
    he-ipv6:
      mode: sit
      local: 203.0.113.10
      remote: 216.66.88.98
      addresses:
        - 2001:470:1f14:XXX::2/64
      routes:
        - to: ::/0
          via: 2001:470:1f14:XXX::1
```

## Firewall: Allow Protocol 41

```bash
# Allow IPv6-in-IPv4 encapsulation from HE's server
sudo iptables -A INPUT -p 41 -s 216.66.88.98 -j ACCEPT
sudo iptables -A OUTPUT -p 41 -d 216.66.88.98 -j ACCEPT
```

## Testing the Tunnel

```bash
# Check tunnel interface
ip address show he-ipv6

# Ping HE's tunnel endpoint (should work immediately)
ping -6 2001:470:1f14:XXX::1

# Test IPv6 internet
ping -6 2001:4860:4860::8888

# Test with curl
curl -6 https://ipv6.google.com

# Verify IPv6 routing
ip -6 route show
# Should have: ::/0 via 2001:470:1f14:XXX::1 dev he-ipv6

# Test MTU (tunnel adds 20 bytes overhead)
ping -6 -s 1432 -M do 2001:4860:4860::8888
```

## Conclusion

Hurricane Electric's 6in4 tunnels provide reliable, free IPv6 connectivity. Register at tunnelbroker.net, create a tunnel, and configure the `sit` (Simple Internet Transition) tunnel interface with the provided endpoint addresses. Allow protocol 41 in your firewall. 6in4 is more reliable than 6to4 because it uses a dedicated endpoint rather than anycast relays. HE provides a routed /64 subnet for assigning addresses to devices.
