# How to Configure IPv6 NAT with Network Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Namespaces, IPv6, NAT66, nftables, Linux

Description: Configure NAT66 (IPv6-to-IPv6 NAT) in Linux network namespaces for testing and specific deployment scenarios.

## Overview

Configure NAT66 (IPv6-to-IPv6 NAT) in Linux network namespaces for testing and specific deployment scenarios. In this example, one namespace acts as an IPv6 gateway that forwards traffic from an internal ULA subnet to an external IPv6 subnet by using nftables NAT.

## Prerequisites

- Linux system with iproute2 and nftables installed
- Root or sudo access
- Basic understanding of IPv6 addressing

## Network Namespace IPv6 Fundamentals

Network namespaces on Linux provide isolated network stacks. Each namespace has its own:
- Network interfaces
- IPv6 addresses and routing table
- ip6tables/nftables rules
- IPv6 neighbor cache (NDP)
- `/proc/sys/net` settings such as IPv6 forwarding

## Common Commands

```bash
# Create namespaces
sudo ip netns add natns
sudo ip netns add client

# List namespaces
ip netns list

# Execute command in namespace
sudo ip netns exec natns COMMAND

# Create veth pairs for the upstream and internal links
sudo ip link add vethhost type veth peer name vethwan
sudo ip link add vethlan type veth peer name vethclient

# Move interfaces into namespaces
sudo ip link set vethwan netns natns
sudo ip link set vethlan netns natns
sudo ip link set vethclient netns client

# Add IPv6 address
sudo ip -6 addr add 2001:db8:1::1/64 dev vethhost
sudo ip netns exec natns ip -6 addr add 2001:db8:1::2/64 dev vethwan
sudo ip netns exec natns ip -6 addr add fd00:1::1/64 dev vethlan
sudo ip netns exec client ip -6 addr add fd00:1::2/64 dev vethclient

# Enable interfaces
sudo ip link set vethhost up
sudo ip netns exec natns ip link set lo up
sudo ip netns exec natns ip link set vethwan up
sudo ip netns exec natns ip link set vethlan up
sudo ip netns exec client ip link set lo up
sudo ip netns exec client ip link set vethclient up

# Add a default route inside the client namespace
sudo ip netns exec client ip -6 route add default via fd00:1::1

# Enable IPv6 forwarding inside the NAT namespace
sudo ip netns exec natns sysctl -w net.ipv6.conf.all.forwarding=1

# Configure NAT66 with nftables inside the NAT namespace
sudo ip netns exec natns nft add table ip6 nat
sudo ip netns exec natns nft 'add chain ip6 nat prerouting { type nat hook prerouting priority -100; policy accept; }'
sudo ip netns exec natns nft 'add chain ip6 nat postrouting { type nat hook postrouting priority 100; policy accept; }'
sudo ip netns exec natns nft add rule ip6 nat postrouting oif vethwan ip6 saddr fd00:1::/64 masquerade

# Test connectivity through NAT66
sudo ip netns exec client ping -6 -c 3 2001:db8:1::1
```

## Full Setup Script

```bash
#!/bin/bash
# Setup IPv6 NAT66 lab with a gateway namespace and a client namespace

GW_NS="natns"
CLIENT_NS="client"
HOST_IF="vethhost"
WAN_IF="vethwan"
LAN_IF="vethlan"
CLIENT_IF="vethclient"

# Cleanup
cleanup() {
    ip netns del "$GW_NS" 2>/dev/null
    ip netns del "$CLIENT_NS" 2>/dev/null
    ip link del "$HOST_IF" 2>/dev/null
}
trap cleanup EXIT

# Remove leftovers from a previous run
cleanup

# Create namespaces
ip netns add "$GW_NS"
ip netns add "$CLIENT_NS"

# Create veth pairs
ip link add "$HOST_IF" type veth peer name "$WAN_IF"
ip link add "$LAN_IF" type veth peer name "$CLIENT_IF"

# Move interfaces into namespaces
ip link set "$WAN_IF" netns "$GW_NS"
ip link set "$LAN_IF" netns "$GW_NS"
ip link set "$CLIENT_IF" netns "$CLIENT_NS"

# Configure the upstream side in the root namespace
ip link set "$HOST_IF" up
ip -6 addr add 2001:db8:1::1/64 dev "$HOST_IF"

# Configure the NAT namespace
ip netns exec "$GW_NS" ip link set lo up
ip netns exec "$GW_NS" ip link set "$WAN_IF" up
ip netns exec "$GW_NS" ip link set "$LAN_IF" up
ip netns exec "$GW_NS" ip -6 addr add 2001:db8:1::2/64 dev "$WAN_IF"
ip netns exec "$GW_NS" ip -6 addr add fd00:1::1/64 dev "$LAN_IF"
ip netns exec "$GW_NS" ip -6 route add default via 2001:db8:1::1
ip netns exec "$GW_NS" sysctl -w net.ipv6.conf.all.forwarding=1

# Configure the client namespace
ip netns exec "$CLIENT_NS" ip link set lo up
ip netns exec "$CLIENT_NS" ip link set "$CLIENT_IF" up
ip netns exec "$CLIENT_NS" ip -6 addr add fd00:1::2/64 dev "$CLIENT_IF"
ip netns exec "$CLIENT_NS" ip -6 route add default via fd00:1::1

# Configure NAT66 in the gateway namespace
ip netns exec "$GW_NS" nft add table ip6 nat
ip netns exec "$GW_NS" nft 'add chain ip6 nat prerouting { type nat hook prerouting priority -100; policy accept; }'
ip netns exec "$GW_NS" nft 'add chain ip6 nat postrouting { type nat hook postrouting priority 100; policy accept; }'
ip netns exec "$GW_NS" nft add rule ip6 nat postrouting oif "$WAN_IF" ip6 saddr fd00:1::/64 masquerade

# Test connectivity from the client through the NAT namespace
echo "Testing NAT66 connectivity..."
ip netns exec "$CLIENT_NS" ping -6 -c 3 2001:db8:1::1
echo "Setup complete!"
```

## Verifying IPv6 Configuration

```bash
# Check IPv6 addresses
sudo ip netns exec natns ip -6 addr show
sudo ip netns exec client ip -6 addr show

# Check IPv6 routing tables
sudo ip netns exec natns ip -6 route show
sudo ip netns exec client ip -6 route show

# Check IPv6 forwarding and NAT rules
sudo ip netns exec natns sysctl net.ipv6.conf.all.forwarding
sudo ip netns exec natns nft list ruleset

# Check NDP (neighbor) cache
sudo ip netns exec natns ip -6 neigh show
sudo ip netns exec client ip -6 neigh show

# Monitor IPv6 traffic inside the NAT namespace
sudo ip netns exec natns tcpdump -i vethwan ip6
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor services running inside network namespaces. If running long-lived services in namespaces, configure monitors against an IPv6 address that is reachable from the monitor, such as the upstream-facing address on the NAT namespace, rather than an internal ULA that exists only inside the lab.

## Conclusion

How to Configure IPv6 NAT with Network Namespaces uses standard Linux `ip` commands with the `netns` subcommand plus namespace-local `nft` rules. For NAT66, the namespace acting as the gateway must have IPv6 forwarding enabled and a postrouting NAT rule. Network namespaces are an excellent, zero-cost way to test IPv6 and NAT behavior before deploying to production.
