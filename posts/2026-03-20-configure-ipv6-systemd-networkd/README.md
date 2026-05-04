# How to Configure IPv6 with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, systemd-networkd, Linux, Network Configuration, Server

Description: A guide to configuring IPv6 addresses, routing, and DNS using systemd-networkd, the network daemon used by many minimal Linux server installations.

## What Is systemd-networkd?

`systemd-networkd` is a system daemon that manages network configuration. It is commonly used on minimal server installations and is the renderer used by Ubuntu's Netplan when targeting server configurations. Configuration files live in `/etc/systemd/network/`.

## Checking If systemd-networkd Is Active

```bash
# Check if systemd-networkd is running

systemctl status systemd-networkd

# Start and enable if not running
systemctl enable --now systemd-networkd

# View current network status
networkctl status
networkctl list
```

## Configuration File Format

systemd-networkd uses `.network` files (for interface configuration) and `.netdev` files (for virtual devices):

```text
/etc/systemd/network/
    10-eth0.network     # eth0 network configuration
    20-eth1.network     # eth1 network configuration
```

## Static IPv6 Address Configuration

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
# IPv4 settings
Address=192.168.1.10/24
Gateway=192.168.1.1

# IPv6 settings
Address=2001:db8::10/64
Gateway=2001:db8::1

# DNS (both IPv4 and IPv6)
DNS=8.8.8.8
DNS=2001:4860:4860::8888
DNS=2001:4860:4860::8844
```

## SLAAC Configuration

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
# Enable IPv4 via DHCP
DHCP=ipv4

# Enable IPv6 SLAAC from Router Advertisements
IPv6AcceptRA=yes     # Accept RA and configure via SLAAC
```

## DHCPv6 Configuration

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
DHCP=yes              # Enable DHCPv4 and DHCPv6
IPv6AcceptRA=yes      # Also accept RA for additional IPv6 config

[DHCPv6]
# DHCPv6 specific settings
UseAddress=yes
UseDNS=yes
UseNTP=yes
```

## Dual-Stack with Static IPv6 and DHCP IPv4

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
# IPv4 via DHCP
DHCP=ipv4

# Static IPv6 address
Address=2001:db8::10/64

# IPv6 gateway
Gateway=2001:db8::1

# DNS servers
DNS=2001:4860:4860::8888
DNS=8.8.8.8

# Accept RA for SLAAC in addition to static (optional)
IPv6AcceptRA=yes
```

## IPv6 Privacy Extensions

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
DHCP=ipv4
IPv6AcceptRA=yes

# Enable privacy extensions (RFC 4941)
IPv6PrivacyExtensions=prefer-public  # or: yes, no, kernel
```

## Adding Static IPv6 Routes

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
Address=2001:db8::10/64
Gateway=2001:db8::1

# Additional static routes
[Route]
Destination=2001:db8:remote::/48
Gateway=2001:db8::1
Metric=200
```

## Applying Configuration Changes

```bash
# Restart systemd-networkd to apply changes
systemctl restart systemd-networkd

# Or reload specific interface
networkctl reload
networkctl reconfigure eth0

# Check network status
networkctl status eth0

# Verify IPv6 addresses
ip -6 addr show eth0

# Verify IPv6 routes
ip -6 route show

# Verify DNS configuration
resolvectl status eth0
```

## Configuring IPv6 Forwarding

For servers that should route IPv6 traffic:

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
Address=2001:db8::1/64
IPv6Forwarding=yes     # Enable IPv6 forwarding on this interface

# Also must be set globally
# sysctl net.ipv6.conf.all.forwarding=1
```

## Checking systemd-networkd Logs

```bash
# View networkd journal logs
journalctl -u systemd-networkd -f

# View configuration parsing info
networkctl --json=short status eth0

# Check for configuration errors
journalctl -u systemd-networkd | grep -E 'error|warning' | head -20
```

## Summary

systemd-networkd configures IPv6 through `.network` files in `/etc/systemd/network/`. Use `Address=` for static IPv6, `IPv6AcceptRA=yes` for SLAAC, and `DHCP=yes` for DHCPv6. Apply changes with `systemctl restart systemd-networkd` and verify with `networkctl status eth0` and `ip -6 addr show`. For privacy extensions, set `IPv6PrivacyExtensions=yes` or `prefer-public` in the `[Network]` section.
