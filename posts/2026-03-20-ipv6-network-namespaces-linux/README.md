# How to Create IPv6 Network Namespaces on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Namespaces, IPv6, Linux, Container, Networking

Description: Create and configure Linux network namespaces with IPv6 addresses for network isolation, testing, and container networking.

## What Are Network Namespaces?

Linux network namespaces provide isolated network stacks - each namespace has its own network interfaces, routes, iptables rules, and socket table. They are the foundation of container networking.

## Creating a Network Namespace with IPv6

```bash
# Create a new network namespace

sudo ip netns add ns-ipv6-test

# Verify it was created
ip netns list

# Execute commands inside the namespace
sudo ip netns exec ns-ipv6-test ip link list

# The namespace starts with only a loopback interface
# Bring up loopback
sudo ip netns exec ns-ipv6-test ip link set lo up
```

## Adding IPv6 Addresses to Namespace

```bash
# Create a veth pair (virtual ethernet cable)
sudo ip link add veth0 type veth peer name veth1

# Move one end into the namespace
sudo ip link set veth1 netns ns-ipv6-test

# Configure IPv6 on the host end (veth0)
sudo ip link set veth0 up
sudo ip -6 addr add 2001:db8::1/64 dev veth0

# Configure IPv6 inside the namespace (veth1)
sudo ip netns exec ns-ipv6-test ip link set veth1 up
sudo ip netns exec ns-ipv6-test ip -6 addr add 2001:db8::2/64 dev veth1

# Verify connectivity
ping6 -c 3 2001:db8::2   # From host to namespace
sudo ip netns exec ns-ipv6-test ping6 -c 3 2001:db8::1  # From namespace to host
```

## Enabling IPv6 Forwarding in the Namespace

```bash
# Enable IPv6 forwarding in the namespace
sudo ip netns exec ns-ipv6-test sysctl -w net.ipv6.conf.all.forwarding=1

# Allow router advertisements even when forwarding is enabled
# (needed for SLAAC on this interface)
sudo ip netns exec ns-ipv6-test sysctl -w net.ipv6.conf.veth1.accept_ra=2

# Check IPv6 configuration
sudo ip netns exec ns-ipv6-test ip -6 addr show
sudo ip netns exec ns-ipv6-test ip -6 route show
```

## Bash Script for IPv6 Namespace Setup

```bash
#!/bin/bash
# setup-ipv6-namespace.sh

NS_NAME="testns"
HOST_VETH="veth-host"
NS_VETH="veth-ns"
HOST_IPV6="2001:db8:1::1/64"
NS_IPV6="2001:db8:1::2/64"

# Create namespace
ip netns add "$NS_NAME"

# Create veth pair
ip link add "$HOST_VETH" type veth peer name "$NS_VETH"

# Move one end to namespace
ip link set "$NS_VETH" netns "$NS_NAME"

# Configure host end
ip link set "$HOST_VETH" up
ip -6 addr add "$HOST_IPV6" dev "$HOST_VETH"

# Configure namespace end
ip netns exec "$NS_NAME" ip link set lo up
ip netns exec "$NS_NAME" ip link set "$NS_VETH" up
ip netns exec "$NS_NAME" ip -6 addr add "$NS_IPV6" dev "$NS_VETH"

echo "Namespace $NS_NAME created with IPv6:"
echo "  Host: $HOST_IPV6 on $HOST_VETH"
echo "  Namespace: $NS_IPV6 on $NS_VETH"
echo ""
echo "Test with:"
echo "  ping6 -c 3 2001:db8:1::2"
echo "  ip netns exec $NS_NAME ping6 -c 3 2001:db8:1::1"
```

## Cleaning Up

```bash
# Delete the veth pair on the host (this removes the namespace peer too)
sudo ip link del veth0

# Delete the namespace
sudo ip netns del ns-ipv6-test
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor services running inside network namespaces over IPv6. Configure monitors that target the IPv6 addresses assigned within your namespaces to verify isolated network environments are functioning correctly.

## Conclusion

IPv6 network namespaces on Linux are created with `ip netns add`, connected via veth pairs, and configured with `ip -6 addr add`. They provide full IPv6 isolation including separate routing tables and firewall rules, making them ideal for testing IPv6 network configurations safely.
