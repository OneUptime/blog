# How to Configure a Static IPv4 Address with systemd-networkd - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, systemd-networkd, Network Configuration, Server

Description: Learn how to configure a static IPv4 address using systemd-networkd by creating network unit files, setting gateways, and configuring DNS resolution.

## Introduction

`systemd-networkd` is a system service that manages network configuration on Linux systems. It is lightweight, integrates well with the systemd ecosystem, and is ideal for servers and embedded systems where NetworkManager is not needed.

## Prerequisites

- systemd-networkd enabled and running
- systemd-resolved for DNS (recommended)

Enable and start the services:

```bash
sudo systemctl enable --now systemd-networkd
sudo systemctl enable --now systemd-resolved
```

## Finding Your Interface Name

```bash
ip link show
networkctl list
```

## Creating a Network Unit File

Create a `.network` file in `/etc/systemd/network/`:

```bash
sudo nano /etc/systemd/network/10-static.network
```

Add the following:

```ini
[Match]
Name=ens3

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
DNS=8.8.4.4
Domains=example.com
```

Replace `ens3` with your interface name and update the IP addresses accordingly.

## Applying the Configuration

Restart systemd-networkd to apply the changes:

```bash
sudo systemctl restart systemd-networkd
```

## Verifying the Configuration

```bash
networkctl status ens3
ip -4 addr show ens3
ip route show
```

Check DNS resolution:

```bash
resolvectl status
nslookup google.com
```

## Configuring DNS with systemd-resolved

If using systemd-resolved, link the resolv.conf:

```bash
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

## Multiple IP Addresses

Add multiple `Address=` lines:

```ini
[Network]
Address=192.168.1.100/24
Address=192.168.1.101/24
Gateway=192.168.1.1
DNS=8.8.8.8
```

## Matching by MAC Address

For more specific matching:

```ini
[Match]
MACAddress=52:54:00:ab:cd:ef
```

## Disabling DHCP Explicitly

```ini
[Network]
DHCP=no
Address=192.168.1.100/24
```

## Conclusion

`systemd-networkd` provides a simple, file-based way to configure static IPv4 addresses without additional software dependencies. Its unit file approach integrates well with configuration management tools and is well-suited for headless server environments.
