# How to Configure IPv6 with NetworkManager on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RHEL, NetworkManager, nmcli, Linux

Description: A guide to configuring IPv6 addresses, routing, and DNS on Red Hat Enterprise Linux using NetworkManager via the nmcli command-line tool.

## NetworkManager IPv6 on RHEL

RHEL uses NetworkManager as the default network management daemon since RHEL 7. IPv6 can be configured via `nmcli` (command line), `nmtui` (text UI), or by editing connection files in `/etc/NetworkManager/system-connections/`.

## Checking Current IPv6 Configuration

```bash
# Show all connections and their IPv6 settings

nmcli connection show

# Show IPv6 details for a specific connection
nmcli connection show eth0 | grep ipv6

# View current IPv6 addresses
ip -6 addr show

# View IPv6 routes
ip -6 route show
```

## Configuring Static IPv6 with nmcli

```bash
# Set static IPv6 address on a connection
nmcli connection modify eth0 \
    ipv6.method manual \
    ipv6.addresses "2001:db8::10/64" \
    ipv6.gateway "2001:db8::1" \
    ipv6.dns "2001:4860:4860::8888,2001:4860:4860::8844"

# Apply the changes (reconnect)
nmcli connection up eth0

# Verify
ip -6 addr show eth0
ip -6 route show
```

## Configuring Multiple IPv6 Addresses

```bash
# Add multiple IPv6 addresses
nmcli connection modify eth0 \
    ipv6.method manual \
    ipv6.addresses "2001:db8::10/64,2001:db8::20/64,2001:db8::30/64"

nmcli connection up eth0
```

## Configuring SLAAC (Stateless Autoconfig)

```bash
# Configure IPv6 via SLAAC (from Router Advertisements)
nmcli connection modify eth0 \
    ipv6.method auto

# This enables RA processing and SLAAC address generation
nmcli connection up eth0
```

## Configuring DHCPv6

```bash
# Configure IPv6 address via DHCPv6
nmcli connection modify eth0 \
    ipv6.method dhcp

# SLAAC + DHCPv6 for DNS and other options (no address from DHCPv6)
nmcli connection modify eth0 \
    ipv6.method auto \
    ipv6.ignore-auto-dns no  # Use DNS from RA/DHCPv6

nmcli connection up eth0
```

## Dual-Stack Configuration

```bash
# Configure both IPv4 (DHCP) and IPv6 (static) on the same interface
nmcli connection modify eth0 \
    ipv4.method auto \
    ipv6.method manual \
    ipv6.addresses "2001:db8::10/64" \
    ipv6.gateway "2001:db8::1" \
    ipv6.dns "2001:4860:4860::8888"

nmcli connection up eth0

# Verify dual-stack
ip addr show eth0  # Shows both IPv4 and IPv6
```

## Configuring IPv6 Privacy Extensions

```bash
# Enable IPv6 privacy extensions (temporary addresses)
nmcli connection modify eth0 \
    ipv6.ip6-privacy 2  # 2 = prefer temporary address

# Privacy values:
# -1 = kernel default
# 0 = disabled
# 1 = enabled but prefer public
# 2 = enabled and prefer temporary

nmcli connection up eth0
```

## Configuring IPv6 Route Metric

```bash
# Set metric for IPv6 default route (lower = preferred)
nmcli connection modify eth0 \
    ipv6.route-metric 100

# Add a specific IPv6 static route
nmcli connection modify eth0 \
    ipv6.routes "2001:db8:remote::/48 2001:db8::1"

nmcli connection up eth0
```

## Disabling IPv6 on a Specific Connection

```bash
# Disable IPv6 on an interface
nmcli connection modify eth0 ipv6.method disabled

nmcli connection up eth0

# Verify no IPv6 addresses
ip -6 addr show eth0
```

## Using nmtui (Text User Interface)

For a more interactive approach:

```bash
# Launch the NetworkManager text UI
nmtui

# Navigate to: Edit a connection → Select eth0 → IPv6 CONFIGURATION
# Change method to Manual, add addresses, gateway, DNS
```

## Viewing Connection Files Directly

NetworkManager stores connections as INI-style files:

```bash
# View connection files
ls /etc/NetworkManager/system-connections/

# View IPv6 settings in a connection file
cat /etc/NetworkManager/system-connections/eth0.nmconnection | grep -A 10 '\[ipv6\]'

# Example [ipv6] section:
# [ipv6]
# method=manual
# addresses=2001:db8::10/64
# gateway=2001:db8::1
# dns=2001:4860:4860::8888;
```

## Applying and Verifying

```bash
# Reload connection files (after manual edits)
nmcli connection reload

# Reconnect the interface
nmcli connection up eth0

# Verify IPv6 configuration
nmcli device show eth0 | grep IP6

ip -6 addr show eth0
ip -6 route show
ping6 2001:4860:4860::8888
```

## Summary

NetworkManager on RHEL manages IPv6 through `nmcli connection modify <conn> ipv6.method <method>`. Use `manual` for static, `auto` for SLAAC, `dhcp` for DHCPv6, and `disabled` to turn off IPv6. Set addresses with `ipv6.addresses`, gateway with `ipv6.gateway`, and DNS with `ipv6.dns`. Always run `nmcli connection up <conn>` after changes and verify with `ip -6 addr show`.
