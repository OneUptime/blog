# How to Assign an IPv4 Address to an Interface Inside a Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Namespaces, IPv4, iproute2, Networking, Container

Description: Assign static IPv4 addresses to network interfaces inside Linux network namespaces using ip addr add with ip netns exec.

## Introduction

After creating a network namespace and moving or creating interfaces inside it, you need to assign IP addresses to enable communication. This guide covers assigning IPv4 addresses to interfaces within namespaces, handling the loopback interface, and verifying the configuration.

## Prerequisites

- A network namespace with at least one interface (e.g., veth interface)
- Root access
- iproute2 installed

## Basic IPv4 Address Assignment

```bash
# Assign an IPv4 address to interface veth0 inside namespace ns1

# Format: ip netns exec <namespace> ip addr add <ip>/<prefix> dev <interface>
ip netns exec ns1 ip addr add 192.168.10.1/24 dev veth0

# Verify the assignment
ip netns exec ns1 ip addr show veth0
```

## Bring the Interface Up After Assigning

An interface with an IP address is still administratively DOWN until you bring it up:

```bash
# Assign IP and bring the interface up
ip netns exec ns1 ip addr add 192.168.10.1/24 dev veth0
ip netns exec ns1 ip link set veth0 up

# Verify interface is UP and has the IP
ip netns exec ns1 ip addr show veth0
```

## Configure the Loopback Interface

Every namespace starts with a loopback interface that is DOWN. You must bring it up for local processes to communicate:

```bash
# Bring loopback up inside the namespace
ip netns exec ns1 ip link set lo up

# Verify loopback
ip netns exec ns1 ip addr show lo
```

## Assign Multiple IPs to the Same Interface

You can assign multiple IPv4 addresses to a single interface:

```bash
# Primary IP
ip netns exec ns1 ip addr add 10.0.0.1/24 dev veth0

# Secondary IP
ip netns exec ns1 ip addr add 10.0.0.100/24 dev veth0

# List all IPs on the interface
ip netns exec ns1 ip addr show veth0
```

## Full Namespace Interface Setup

```bash
#!/bin/bash
# configure-namespace-ip.sh
# Sets up a namespace with a veth pair and assigns IPv4 addresses

set -e

# Create namespace
ip netns add ns1

# Create a veth pair (host side: veth-host, namespace side: veth-ns)
ip link add veth-host type veth peer name veth-ns

# Move the namespace side into ns1
ip link set veth-ns netns ns1

# Configure the host side
ip addr add 10.10.0.1/24 dev veth-host
ip link set veth-host up

# Configure inside ns1
ip netns exec ns1 ip link set lo up
ip netns exec ns1 ip addr add 10.10.0.2/24 dev veth-ns
ip netns exec ns1 ip link set veth-ns up

echo "Configuration complete:"
echo "Host side:"
ip addr show veth-host
echo "Namespace side:"
ip netns exec ns1 ip addr show
```

## Remove an IP Address

```bash
# Remove an IP address from an interface inside a namespace
ip netns exec ns1 ip addr del 10.0.0.1/24 dev veth0
```

## Verify Connectivity After IP Assignment

```bash
# Ping from host to the namespace
ping -c 3 10.10.0.2

# Ping from namespace to host
ip netns exec ns1 ping -c 3 10.10.0.1

# Check interface status inside namespace
ip netns exec ns1 ip -brief addr show
```

## Conclusion

Assigning an IPv4 address inside a namespace uses the same `ip addr add` command wrapped with `ip netns exec`. Always bring both the loopback interface and the data interface up after assigning IPs. The interface remains administratively DOWN until explicitly brought up with `ip link set <dev> up`, which is a common source of connectivity issues.
