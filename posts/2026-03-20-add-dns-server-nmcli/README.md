# How to Add a DNS Server with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, nmcli, NetworkManager, DNS, Networking, Configuration

Description: Add, modify, and remove DNS servers on Linux network connections using nmcli, including per-connection DNS and global DNS configuration.

## Introduction

IPv4 DNS servers in NetworkManager are set per-connection using `ipv4.dns`. You can add, modify, or remove DNS entries with `nmcli connection modify`. Changes take effect when the connection is reactivated.

## Add a DNS Server to a Connection

```bash
# Set DNS servers (replaces any existing DNS)

nmcli connection modify "Wired connection 1" \
    ipv4.dns "8.8.8.8 1.1.1.1"

# Apply changes
nmcli connection up "Wired connection 1"
```

## Append a DNS Server Without Replacing

```bash
# Use + prefix to add without removing existing entries
nmcli connection modify "Wired connection 1" \
    +ipv4.dns 9.9.9.9

nmcli connection up "Wired connection 1"
```

## Remove a Specific DNS Server

```bash
# Use - prefix to remove a single DNS entry
nmcli connection modify "Wired connection 1" \
    -ipv4.dns 9.9.9.9

nmcli connection up "Wired connection 1"
```

## Verify DNS Configuration

```bash
# Show DNS settings in the connection profile
nmcli -f ipv4.dns,ipv4.dns-search connection show "Wired connection 1"

# Show effective DNS for the interface
nmcli device show eth0 | grep DNS

# Test DNS resolution
nslookup google.com
dig google.com
```

## Configure DNS Search Domains

```bash
# Set DNS search domains
nmcli connection modify "Wired connection 1" \
    ipv4.dns-search "corp.example.com example.com"

nmcli connection up "Wired connection 1"
```

## Override DHCP-Assigned DNS

```bash
# Ignore DNS from DHCP and use custom DNS
nmcli connection modify "dhcp-eth0" \
    ipv4.ignore-auto-dns yes \
    ipv4.dns "1.1.1.1 8.8.8.8"

nmcli connection up "dhcp-eth0"
```

## Set Global DNS in NetworkManager

```ini
# /etc/NetworkManager/conf.d/dns.conf
[main]
dns=default

[global-dns-domain-*]
servers=8.8.8.8,8.8.4.4
```

```bash
# Reload NetworkManager configuration
nmcli general reload conf
```

## DNS Priority

```bash
# Set DNS priority for a connection (lower = higher priority)
nmcli connection modify "Wired connection 1" \
    ipv4.dns-priority 10

nmcli connection up "Wired connection 1"
```

## Conclusion

Per-connection IPv4 DNS with nmcli is managed via `ipv4.dns` on each connection profile. Use `nmcli connection modify` to set, append (`+`), or remove (`-`) DNS entries. Activate changes with `nmcli connection up`. Use `nmcli device show eth0 | grep DNS` to see the effective DNS in use.
