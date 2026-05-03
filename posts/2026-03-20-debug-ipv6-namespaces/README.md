# How to Debug IPv6 Issues in Network Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Namespaces, IPv6, Debugging, tcpdump, Linux

Description: Diagnose and fix IPv6 connectivity problems in Linux network namespaces using ip, tcpdump, and kernel diagnostic tools.

## Overview

Diagnose and fix IPv6 connectivity problems in Linux network namespaces using ip, tcpdump, and kernel diagnostic tools.

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

# Test connectivity
ping6 -c 3 2001:db8::2
sudo ip netns exec myns ping6 -c 3 2001:db8::1
```

## Full Setup Script

```bash
#!/bin/bash
# Setup IPv6 lab with two connected namespaces

NS1="ns1"
NS2="ns2"

# Create namespaces
ip netns add $NS1
ip netns add $NS2

# Create veth pair
ip link add veth-${NS1} type veth peer name veth-${NS2}
ip link set veth-${NS1} netns $NS1
ip link set veth-${NS2} netns $NS2

# Configure IPv6
ip netns exec $NS1 ip link set lo up
ip netns exec $NS1 ip link set veth-${NS1} up
ip netns exec $NS1 ip -6 addr add 2001:db8::1/64 dev veth-${NS1}

ip netns exec $NS2 ip link set lo up
ip netns exec $NS2 ip link set veth-${NS2} up
ip netns exec $NS2 ip -6 addr add 2001:db8::2/64 dev veth-${NS2}

# Test connectivity
echo "Testing connectivity..."
ip netns exec $NS1 ping6 -c 3 2001:db8::2
echo "Setup complete!"

# Cleanup
cleanup() {
    ip netns del $NS1 2>/dev/null
    ip netns del $NS2 2>/dev/null
}
trap cleanup EXIT
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

Use [OneUptime](https://oneuptime.com) to monitor services running inside network namespaces. If running long-lived services in namespaces, configure monitors pointing to the IPv6 addresses assigned within those namespaces.

## Conclusion

Debugging IPv6 issues in network namespaces uses standard Linux `ip` commands with the `netns` subcommand. All IPv6 configuration tools work identically inside namespaces. Network namespaces are an excellent, zero-cost way to test IPv6 configurations before deploying to production.
