# How to Configure IPv6 Bridge Networking with Network Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Namespaces, IPv6, Bridge, Linux, Container

Description: Connect multiple network namespaces through a Linux bridge with IPv6 addressing for multi-container networking scenarios.

## Overview

Connect multiple network namespaces through a Linux bridge with IPv6 addressing for multi-container networking scenarios.

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

# Create a bridge
sudo ip link add br0 type bridge
sudo ip link set br0 up

# Create veth pair
sudo ip link add veth-br type veth peer name veth-ns

# Move interface to namespace
sudo ip link set veth-ns netns myns

# Attach host end to bridge
sudo ip link set veth-br master br0

# Add IPv6 address
sudo ip -6 addr add 2001:db8:1::ff/64 dev br0
sudo ip netns exec myns ip -6 addr add 2001:db8:1::2/64 dev veth-ns

# Enable interfaces
sudo ip link set veth-br up
sudo ip netns exec myns ip link set lo up
sudo ip netns exec myns ip link set veth-ns up

# Test connectivity
ping -6 -c 3 2001:db8:1::2
sudo ip netns exec myns ping -6 -c 3 2001:db8:1::ff
```

## Full Setup Script

```bash
#!/bin/bash
set -e
# Setup IPv6 lab with two namespaces connected through a bridge

BRIDGE="br0"
NS1="ns1"
NS2="ns2"

# Create namespaces
ip netns add $NS1
ip netns add $NS2

# Create bridge
ip link add $BRIDGE type bridge
ip link set $BRIDGE up
ip -6 addr add 2001:db8:1::ff/64 dev $BRIDGE

# Create veth pairs and connect them to the bridge
ip link add veth-${NS1}-br type veth peer name veth-${NS1}-ns
ip link add veth-${NS2}-br type veth peer name veth-${NS2}-ns
ip link set veth-${NS1}-ns netns $NS1
ip link set veth-${NS2}-ns netns $NS2
ip link set veth-${NS1}-br master $BRIDGE
ip link set veth-${NS2}-br master $BRIDGE
ip link set veth-${NS1}-br up
ip link set veth-${NS2}-br up

# Configure IPv6
ip netns exec $NS1 ip link set lo up
ip netns exec $NS1 ip link set veth-${NS1}-ns up
ip netns exec $NS1 ip -6 addr add 2001:db8:1::1/64 dev veth-${NS1}-ns

ip netns exec $NS2 ip link set lo up
ip netns exec $NS2 ip link set veth-${NS2}-ns up
ip netns exec $NS2 ip -6 addr add 2001:db8:1::2/64 dev veth-${NS2}-ns

# Test connectivity
echo "Testing connectivity..."
ip netns exec $NS1 ping -6 -c 3 2001:db8:1::2
echo "Setup complete!"

# Cleanup when finished
# ip netns del $NS1
# ip netns del $NS2
# ip link del $BRIDGE
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
sudo ip netns exec myns tcpdump -i veth-ns ip6
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor services running inside network namespaces. If running long-lived services in namespaces, configure monitors against IPv6 addresses that are reachable from the monitoring location.

## Conclusion

How to Configure IPv6 Bridge Networking with Network Namespaces uses standard Linux `ip` commands with the `netns` subcommand and a Linux bridge created with `ip link`. Most IPv6 configuration tools work the same inside namespaces when run with `ip netns exec`. Network namespaces are an excellent, zero-cost way to test IPv6 configurations before deploying to production.
