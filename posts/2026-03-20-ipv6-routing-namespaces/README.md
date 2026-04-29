# How to Configure IPv6 Routing Between Network Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Namespaces, IPv6, Routing, Linux, Networking

Description: Set up IPv6 routing between multiple Linux network namespaces using static routes and a central routing namespace.

## Overview

Set up IPv6 routing between multiple Linux network namespaces using static routes and a central routing namespace.

## Prerequisites

- Linux system with iproute2 tools
- Root or sudo access
- Basic understanding of IPv6 addressing

## Network Namespace IPv6 Fundamentals

Network namespaces on Linux provide isolated network stacks. Each namespace has its own:
- Network interfaces
- IPv6 addresses and routing table
- ip6tables/nftables rules
- IPv6 neighbor cache (NDP)

## Common Commands

```bash
# Create a namespace

sudo ip netns add myns

# List namespaces
ip netns list

# Execute command in namespace
sudo ip netns exec myns COMMAND

# Create veth pair
sudo ip link add veth0 type veth peer name veth1

# Move interface to namespace
sudo ip link set veth1 netns myns

# Add IPv6 address
sudo ip -6 addr add 2001:db8::1/64 dev veth0
sudo ip netns exec myns ip -6 addr add 2001:db8::2/64 dev veth1

# Enable interfaces
sudo ip link set veth0 up
sudo ip netns exec myns ip link set veth1 up

# Enable IPv6 forwarding in a router namespace
sudo ip netns exec router sysctl -w net.ipv6.conf.all.forwarding=1

# Add a static IPv6 route inside a namespace
sudo ip netns exec myns ip -6 route add 2001:db8:1::/64 via 2001:db8::1 dev veth1

# Test connectivity
ping -6 -c 3 2001:db8::2
sudo ip netns exec myns ping -6 -c 3 2001:db8::1
```

## Full Setup Script

```bash
#!/bin/bash
# Setup IPv6 lab with two namespaces routed through a central namespace

set -e

NS1="ns1"
RTR="router"
NS2="ns2"

# Cleanup
cleanup() {
    ip netns del $NS1 2>/dev/null || true
    ip netns del $RTR 2>/dev/null || true
    ip netns del $NS2 2>/dev/null || true
}
trap cleanup EXIT

# Create namespaces
ip netns add $NS1
ip netns add $RTR
ip netns add $NS2

# Create veth pairs
ip link add veth-${NS1} type veth peer name veth-rtr1
ip link add veth-${NS2} type veth peer name veth-rtr2

# Move interfaces to namespaces
ip link set veth-${NS1} netns $NS1
ip link set veth-rtr1 netns $RTR
ip link set veth-${NS2} netns $NS2
ip link set veth-rtr2 netns $RTR

# Configure loopback and links
ip netns exec $NS1 ip link set lo up
ip netns exec $RTR ip link set lo up
ip netns exec $NS2 ip link set lo up

ip netns exec $NS1 ip link set veth-${NS1} up
ip netns exec $RTR ip link set veth-rtr1 up
ip netns exec $RTR ip link set veth-rtr2 up
ip netns exec $NS2 ip link set veth-${NS2} up

# Configure IPv6 addresses on routed subnets
ip netns exec $NS1 ip -6 addr add 2001:db8:1::2/64 dev veth-${NS1}
ip netns exec $RTR ip -6 addr add 2001:db8:1::1/64 dev veth-rtr1
ip netns exec $RTR ip -6 addr add 2001:db8:2::1/64 dev veth-rtr2
ip netns exec $NS2 ip -6 addr add 2001:db8:2::2/64 dev veth-${NS2}

# Enable IPv6 forwarding in the router namespace
ip netns exec $RTR sysctl -w net.ipv6.conf.all.forwarding=1 >/dev/null

# Add static routes
ip netns exec $NS1 ip -6 route add 2001:db8:2::/64 via 2001:db8:1::1 dev veth-${NS1}
ip netns exec $NS2 ip -6 route add 2001:db8:1::/64 via 2001:db8:2::1 dev veth-${NS2}

# Test routed connectivity
echo "Testing routed connectivity..."
ip netns exec $NS1 ping -6 -c 3 2001:db8:2::2
echo "Setup complete!"
```

## Verifying IPv6 Configuration

```bash
# Check IPv6 addresses
sudo ip netns exec myns ip -6 addr show

# Check IPv6 routing table
sudo ip netns exec myns ip -6 route show

# Check NDP (neighbor) cache
sudo ip netns exec myns ip -6 neigh show

# Monitor IPv6 traffic inside namespace
sudo ip netns exec myns tcpdump -i veth1 ip6
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor services running inside network namespaces. If running long-lived services in namespaces, configure monitors from a network context that has routes to the namespaces' IPv6 addresses. In a real deployment, use routable IPv6 prefixes rather than the `2001:db8::/32` documentation prefix shown here.

## Conclusion

How to Configure IPv6 Routing Between Network Namespaces uses standard Linux `ip` commands with the `netns` subcommand. The same `ip` and IPv6 troubleshooting commands work inside namespaces when run with `ip netns exec`. Network namespaces are an excellent, zero-cost way to test IPv6 configurations before deploying to production.
