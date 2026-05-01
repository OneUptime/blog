# How to Configure DHCP for IPv4 with systemd-networkd - Ipv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Linux, systemd-networkd, DHCP, IPv4, Network Configuration

Description: Learn how to configure DHCPv4 client settings in systemd-networkd including custom client identifiers, options, and DHCP server interaction.

---

systemd-networkd's DHCPv4 client is configured through the `[DHCPv4]` and `[Network]` sections in `.network` files. It supports custom client IDs, requested options, and fine-grained control over how the client interacts with the DHCP server.

---

## Basic DHCP Configuration

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
DHCP=ipv4
```

---

## DHCP with Specific Options

```ini
[Match]
Name=eth0

[Network]
# Only IPv4 DHCP, not IPv6
DHCP=ipv4

[DHCPv4]
UseHostname=yes
UseDNS=yes
UseNTP=yes
UseRoutes=yes
SendHostname=yes
Hostname=myserver
RequestBroadcast=no
```

---

## Override DHCP-Assigned DNS

```ini
[Match]
Name=eth0

[Network]
DHCP=ipv4
DNS=1.1.1.1
DNS=8.8.8.8

[DHCPv4]
# Ignore DHCP-provided DNS servers
UseDNS=no
```

---

## Set a Custom DHCP Client Identifier

```ini
[DHCPv4]
# Use the interface MAC address as the DHCPv4 client identifier
ClientIdentifier=mac
# Default behavior:
# ClientIdentifier=duid
```

---

## Control DHCP Broadcast and Retry Behavior

```ini
[DHCPv4]
RequestBroadcast=yes
MaxAttempts=3
```

---

## Static Address Alongside DHCP

```ini
[Match]
Name=eth0

[Network]
DHCP=ipv4
# Adds a static address in addition to the DHCP-assigned address
Address=192.168.1.99/24
```

---

## Verify DHCP Lease

```bash
# Show DHCP lease info
networkctl status eth0

# More detail
cat /run/systemd/netif/leases/*

# Check networkctl output
networkctl -a
```

---

## Summary

Configure DHCPv4 in systemd-networkd with `DHCP=ipv4` in the `[Network]` section. Use the `[DHCPv4]` section to control whether the client adopts DNS, NTP, routes, and hostname from the DHCP server. Override DHCP-assigned DNS by setting `UseDNS=no` and specifying your own `DNS=` entries. Verify the lease with `networkctl status <interface>`.
