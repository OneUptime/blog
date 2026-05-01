# How to Enable and Start systemd-networkd on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, systemd-networkd, Networking, Systemd, Configuration

Description: Enable and start systemd-networkd on Linux to manage network interfaces declaratively using .network and .netdev configuration files.

## Introduction

`systemd-networkd` is a system daemon that manages network interfaces. It reads `.network` and `.netdev` configuration files, typically from `/etc/systemd/network/`, and supports static IP, DHCP, VLANs, bridges, bonds, tunnels, and more. It integrates with `systemd-resolved` for DNS and `networkctl` for management.

## Check if systemd-networkd is Running

```bash
# Check current status

systemctl status systemd-networkd

# Quick check
systemctl is-active systemd-networkd
```

## Enable systemd-networkd on Boot

```bash
# Enable and start the service
systemctl enable --now systemd-networkd
```

## Disable Conflicting Network Managers

Before using systemd-networkd, disable NetworkManager if it is managing your interfaces:

```bash
# Stop and disable NetworkManager
systemctl stop NetworkManager
systemctl disable NetworkManager

# Prevent it from starting automatically
systemctl mask NetworkManager
```

## Verify systemd-networkd is Managing Interfaces

```bash
# List all interfaces and their management status
networkctl list

# Sample output:
# IDX LINK  TYPE     OPERATIONAL SETUP
#   1 lo    loopback carrier     unmanaged
#   2 eth0  ether    routable    configured
```

## Check Interface Details

```bash
# Show detailed status for eth0
networkctl status eth0
```

## Create a Minimal .network File

A `.network` file is needed for each interface you want managed:

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=yes
```

```bash
# Reload after creating/modifying .network files
networkctl reload

# Or restart the service
systemctl restart systemd-networkd
```

## Verify Network Configuration Applied

```bash
# Show IP addresses assigned by systemd-networkd
ip addr show eth0

# Check routes
ip route show
```

## Enable systemd-resolved Alongside networkd

```bash
# systemd-resolved provides DNS for networkd-managed interfaces
systemctl enable --now systemd-resolved

# Create the symlink to use systemd-resolved as the system resolver
ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

## Conclusion

Enabling systemd-networkd requires running `systemctl enable --now systemd-networkd` and creating matching `.network` files, typically in `/etc/systemd/network/`. Disable NetworkManager if present to avoid conflicts. Use `networkctl list` and `networkctl status` to verify that interfaces are being managed and configured correctly.
