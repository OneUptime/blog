# How to Configure NAT64 with Jool on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NAT64, Jool, Linux, IPv6 Transition

Description: A step-by-step guide to installing and configuring Jool, the open-source NAT64 implementation for Linux, to enable IPv6-only clients to reach IPv4 servers.

## What Is Jool?

Jool is an open-source, kernel-module-based NAT64 and SIIT (Stateless IP/ICMP Translation) implementation for Linux. It is one of the most widely deployed NAT64 solutions and supports both stateful NAT64 (RFC 6146) and stateless SIIT (RFC 7915).

## Prerequisites

- Linux kernel 5.4 or later
- Root/sudo access
- A public IPv4 address pool for NAT64 source addresses
- IPv6 connectivity on the gateway

## Installing Jool

Install Jool kernel modules and the user-space management tool:

```bash
# On Ubuntu/Debian: install from the Jool PPA

add-apt-repository ppa:ydahhrk/jool
apt update
apt install jool-dkms jool-tools

# On RHEL/CentOS/Fedora (build from source)
dnf install gcc make kernel-devel
git clone https://github.com/NICMx/Jool.git
cd Jool
make
make install
```

## Loading the Jool Kernel Module

```bash
# Load the Jool NAT64 kernel module
modprobe jool

# Verify the module is loaded
lsmod | grep jool

# To load automatically at boot
echo 'jool' >> /etc/modules-load.d/jool.conf
```

## Creating a NAT64 Instance

Jool uses "instances" to define NAT64 translation configurations. Each instance is bound to a network namespace:

```bash
# Create a NAT64 instance named "default" in the current namespace
# --pool6 is mandatory for NAT64 and sets the translation prefix
jool instance add --iptables --pool6 64:ff9b::/96

# Verify the instance was created
jool instance display
```

## Configuring the IPv6 Prefix (Pool6)

Pool6 is the NAT64 prefix that embeds IPv4 addresses. In Jool 4.x, pool6 is a global configuration field rather than its own database, so it is set at instance creation via `--pool6` (as above) and can be updated later through the `global` command:

```bash
# Update the NAT64 prefix on the existing instance (e.g., to your own prefix)
jool global update pool6 64:ff9b::/96

# Verify the pool6 configuration
jool global display | grep pool6
```

## Configuring the IPv4 Address Pool (Pool4)

Pool4 defines the IPv4 addresses Jool uses as source addresses when translating outbound connections:

```bash
# Add an IPv4 address range to pool4 for TCP and UDP
# Replace 203.0.113.0/28 with your actual public IPv4 addresses
jool pool4 add --tcp 203.0.113.0/28
jool pool4 add --udp 203.0.113.0/28
jool pool4 add --icmp 203.0.113.0/28

# View the pool4 configuration
jool pool4 display
```

## Configuring iptables to Route Traffic Through Jool

Jool uses iptables hooks to intercept packets for translation:

```bash
# Route IPv6 packets destined for the NAT64 prefix through Jool
ip6tables -t mangle -A PREROUTING -d 64:ff9b::/96 -j JOOL --instance default

# Route IPv4 packets from the NAT64 pool back through Jool
iptables -t mangle -A PREROUTING -d 203.0.113.0/28 -j JOOL --instance default
```

## Enabling IPv6 and IPv4 Forwarding

Jool requires IP forwarding to be enabled on the gateway:

```bash
# Enable IPv6 forwarding
sysctl -w net.ipv6.conf.all.forwarding=1

# Enable IPv4 forwarding
sysctl -w net.ipv4.ip_forward=1

# Persist across reboots
echo 'net.ipv6.conf.all.forwarding=1' >> /etc/sysctl.d/99-jool.conf
echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.d/99-jool.conf
sysctl -p /etc/sysctl.d/99-jool.conf
```

## Verifying NAT64 Translation

From an IPv6-only client, test connectivity to an IPv4-only server:

```bash
# Test DNS resolution via DNS64 (should return 64:ff9b:: prefixed address)
dig AAAA example.com @dns64-resolver-address

# Ping an IPv4 address via the NAT64 prefix from an IPv6-only client
ping6 64:ff9b::8.8.8.8

# On the NAT64 gateway, view active translation sessions
jool bib display
jool session display
```

## Viewing the BIB and Session Tables

```bash
# Show Binding Information Base (BIB) entries
# These are the static half of the translation mappings
jool bib display --tcp

# Show active session table entries
# These are full 5-tuple translation bindings
jool session display --tcp | head -20
```

## Summary

Jool provides a robust, kernel-level NAT64 implementation for Linux. The key steps are: install the kernel module, create a Jool instance, configure pool6 with the NAT64 prefix, configure pool4 with public IPv4 addresses, and set up iptables rules to route traffic through the translator. Pair Jool with a DNS64 resolver to give IPv6-only clients seamless access to IPv4-only services.
