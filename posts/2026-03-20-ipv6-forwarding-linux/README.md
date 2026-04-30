# How to Enable IPv6 Forwarding on Linux - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Forwarding, Sysctl, Router

Description: Learn how to enable IPv6 packet forwarding on Linux to turn a host into a router, including persistent configuration and interface-specific settings.

## Overview

By default, Linux hosts do not forward IPv6 packets between interfaces - they only accept packets addressed to themselves. To act as an IPv6 router, you must enable IP forwarding via the `sysctl` interface.

## Checking Current Forwarding State

```bash
# Check global IPv6 forwarding state

sysctl net.ipv6.conf.all.forwarding
# net.ipv6.conf.all.forwarding = 0  (disabled by default)

# Check per-interface forwarding
sysctl net.ipv6.conf.eth0.forwarding
sysctl net.ipv6.conf.eth1.forwarding
```

## Enabling IPv6 Forwarding Temporarily

```bash
# Enable globally for all interfaces (not persistent - lost on reboot)
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Alternatively, write directly to the /proc filesystem
echo 1 | sudo tee /proc/sys/net/ipv6/conf/all/forwarding
```

## Enabling IPv6 Forwarding Persistently

Edit the sysctl configuration file to persist across reboots:

```bash
# /etc/sysctl.conf or /etc/sysctl.d/99-ipv6-forwarding.conf

# Enable IPv6 forwarding globally
net.ipv6.conf.all.forwarding = 1

# Optional: disable router advertisement acceptance on routers
# (hosts should accept RA, routers should not)
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0
```

Apply the configuration:

```bash
# Apply sysctl changes without rebooting
sudo sysctl -p /etc/sysctl.d/99-ipv6-forwarding.conf

# Or apply all sysctl configs
sudo sysctl --system
```

## Interface-Specific Forwarding

You can enable forwarding only on specific interfaces:

```bash
# Enable forwarding only on eth0 and eth1 (not other interfaces)
sudo sysctl -w net.ipv6.conf.eth0.forwarding=1
sudo sysctl -w net.ipv6.conf.eth1.forwarding=1

# In /etc/sysctl.d/99-forwarding.conf:
net.ipv6.conf.eth0.forwarding = 1
net.ipv6.conf.eth1.forwarding = 1
```

## Impact on Router Advertisement Acceptance

When `net.ipv6.conf.all.forwarding=1` is set globally, Linux treats interfaces as routers and will not accept Router Advertisements by default. If your Linux router uses its upstream link to receive RA (e.g., from your ISP), override this:

```bash
# Allow RA on the WAN interface even when forwarding is enabled
# Set accept_ra=2 (accept RA even if forwarding is on)
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=2

# Persist it
net.ipv6.conf.eth0.accept_ra = 2
```

## Verifying Forwarding is Working

```bash
# Confirm forwarding is enabled
sysctl net.ipv6.conf.all.forwarding
# Expected: net.ipv6.conf.all.forwarding = 1

# Test forwarding by pinging through the router from a client
# On the client (connected to eth0):
ping -6 -I eth0 2001:db8:2::1

# On the router, watch packets arrive and leave across interfaces:
sudo tcpdump -i any -n "ip6 and not icmp6[0]=135 and not icmp6[0]=136"
```

## systemd-networkd Router Configuration

If using systemd-networkd, enable global forwarding in `networkd.conf` and set RA behavior per interface in the `.network` file:

```ini
# /etc/systemd/networkd.conf
[Network]
IPv6Forwarding=yes

# /etc/systemd/network/10-router.network
[Match]
Name=eth*

[Network]
IPv6AcceptRA=no   # Disable RA acceptance on router interfaces
```

## Summary

Enable IPv6 forwarding with `sysctl -w net.ipv6.conf.all.forwarding=1` and persist it in `/etc/sysctl.d/`. When forwarding is enabled globally, Linux will not accept Router Advertisements by default - use `accept_ra=2` on WAN interfaces that still need to receive a default route from upstream. Always verify forwarding is active before testing inter-network routing.
