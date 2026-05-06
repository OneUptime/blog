# How to Configure DHCP with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, nmcli, NetworkManager, DHCP, IPv4, Networking

Description: Configure DHCP-based IPv4 addressing on Linux using nmcli, including switching from static to DHCP, DHCP hostname settings, and lease renewal.

## Introduction

NetworkManager uses DHCP by default for new connections. Use `nmcli` to explicitly set a connection to DHCP mode, configure DHCP client options, and manage lease renewal.

## Switch a Connection to DHCP

```bash
# Change an existing static connection to DHCP

nmcli connection modify "Wired connection 1" \
    ipv4.method auto \
    ipv4.addresses "" \
    ipv4.gateway "" \
    ipv4.dns ""

# Reactivate to apply
nmcli connection down "Wired connection 1"
nmcli connection up "Wired connection 1"
```

## Create a New DHCP Connection

```bash
# Create a new Ethernet connection using DHCP
nmcli connection add \
    type ethernet \
    con-name "dhcp-eth0" \
    ifname eth0 \
    ipv4.method auto

nmcli connection up "dhcp-eth0"
```

## Verify DHCP Lease

```bash
# Show the assigned IP (from DHCP)
ip addr show eth0

# Check connection details
nmcli connection show "dhcp-eth0" | grep IP4

# Show DHCP lease info via nmcli
nmcli device show eth0 | grep -i dhcp
```

## Set DHCP Hostname

```bash
# Send a specific hostname to the DHCP server
nmcli connection modify "dhcp-eth0" \
    ipv4.dhcp-send-hostname yes \
    ipv4.dhcp-hostname myserver

nmcli connection down "dhcp-eth0"
nmcli connection up "dhcp-eth0"
```

## Set DHCP Client ID

```bash
# Use a custom client identifier
nmcli connection modify "dhcp-eth0" \
    ipv4.dhcp-client-id myserver-unique-id

nmcli connection down "dhcp-eth0"
nmcli connection up "dhcp-eth0"
```

## Renew DHCP Lease

```bash
# Renew DHCP lease by deactivating and reactivating
nmcli connection down "dhcp-eth0"
nmcli connection up "dhcp-eth0"
```

## Accept or Ignore DNS from DHCP

```bash
# Ignore DNS servers pushed by DHCP server
nmcli connection modify "dhcp-eth0" \
    ipv4.ignore-auto-dns yes \
    ipv4.dns "8.8.8.8 1.1.1.1"

nmcli connection down "dhcp-eth0"
nmcli connection up "dhcp-eth0"
```

## Accept or Ignore Routes from DHCP

```bash
# Ignore routes pushed by DHCP
nmcli connection modify "dhcp-eth0" \
    ipv4.ignore-auto-routes yes

nmcli connection down "dhcp-eth0"
nmcli connection up "dhcp-eth0"
```

## Conclusion

DHCP with nmcli uses `ipv4.method auto`. Create connections with `nmcli connection add` or modify existing ones with `nmcli connection modify`. To renew a lease, deactivate and reactivate the connection. Use `nmcli device show eth0` to view DHCP lease details.
