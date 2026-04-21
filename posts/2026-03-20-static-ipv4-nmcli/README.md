# How to Configure a Static IPv4 Address with nmcli - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, NetworkManager, nmcli, RHEL

Description: Learn how to configure a static IPv4 address on Linux using nmcli, the command-line interface for NetworkManager, on RHEL, CentOS, Fedora, and Ubuntu systems.

## Introduction

`nmcli` is the command-line tool for managing NetworkManager, the default network management service on most major Linux distributions. It lets you configure static IP addresses, gateways, and DNS from the terminal without editing configuration files manually.

## Listing Network Connections

```bash
nmcli connection show
nmcli device status
```

## Setting a Static IPv4 Address

Replace `connection-name` with the NetworkManager connection profile name from `nmcli connection show` and adjust the IP addresses:

```bash
nmcli connection modify "connection-name" \
  ipv4.method manual \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8,8.8.4.4"
```

## Disabling DHCP

Ensure DHCP is turned off for the connection:

```bash
nmcli connection modify "connection-name" ipv4.method manual
```

## Applying the Configuration

Bring the connection down and back up to apply changes:

```bash
nmcli connection down "connection-name"
nmcli connection up "connection-name"
```

Or restart NetworkManager (less preferred):

```bash
sudo systemctl restart NetworkManager
```

## Creating a New Connection with a Static IP

If no connection profile exists yet:

```bash
nmcli connection add \
  type ethernet \
  con-name "static-eth0" \
  ifname eth0 \
  ipv4.method manual \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8,8.8.4.4"

nmcli connection up static-eth0
```

## Verifying the Configuration

```bash
nmcli connection show "connection-name"
ip -4 addr show interface-name
ip route show
```

Test connectivity:

```bash
ping -c 4 192.168.1.1
ping -c 4 google.com
```

## Adding DNS Search Domains

```bash
nmcli connection modify "connection-name" ipv4.dns-search "example.local,corp.internal"
```

## Setting Multiple IP Addresses

```bash
nmcli connection modify "connection-name" \
  ipv4.addresses "192.168.1.100/24,192.168.1.101/24"
```

## Viewing Connection Details

```bash
nmcli -p connection show "connection-name"
```

## Conclusion

`nmcli` provides a powerful and scriptable way to configure static IPv4 addresses with NetworkManager. Its changes are persistent across reboots and work consistently across RHEL, Fedora, Ubuntu, and other NetworkManager-based distributions.
