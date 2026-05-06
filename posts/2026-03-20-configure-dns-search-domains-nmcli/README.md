# How to Configure DNS Search Domains with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, nmcli, NetworkManager, DNS, Search Domains, Networking

Description: Configure DNS search domains on Linux network connections using nmcli, enabling short hostname resolution within your domain.

## Introduction

DNS search domains allow you to resolve short hostnames without typing the full FQDN. For example, with search domain `corp.example.com`, typing `ssh server1` resolves to `server1.corp.example.com`. Set search domains per-connection in NetworkManager using `ipv4.dns-search`.

## Add a DNS Search Domain

```bash
# Add a single search domain

nmcli connection modify "Wired connection 1" \
    ipv4.dns-search "corp.example.com"

# Apply
nmcli connection up "Wired connection 1"
```

## Add Multiple Search Domains

```bash
# Set multiple search domains
nmcli connection modify "Wired connection 1" \
    ipv4.dns-search "corp.example.com dev.example.com staging.example.com"

nmcli connection up "Wired connection 1"
```

## Append a Search Domain Without Replacing

```bash
# Use + to append without removing existing domains
nmcli connection modify "Wired connection 1" \
    +ipv4.dns-search "extra.example.com"

nmcli connection up "Wired connection 1"
```

## Remove a Specific Search Domain

```bash
nmcli connection modify "Wired connection 1" \
    -ipv4.dns-search "dev.example.com"

nmcli connection up "Wired connection 1"
```

## Clear All Manually Configured Search Domains

```bash
# Clear manually configured search domains
nmcli connection modify "Wired connection 1" \
    ipv4.dns-search ""

nmcli connection up "Wired connection 1"
```

## Verify Search Domains are Applied

```bash
# Show connection settings
nmcli connection show "Wired connection 1" | grep dns-search

# If NetworkManager writes search domains to resolv.conf
grep '^search' /etc/resolv.conf

# If your system uses systemd-resolved
resolvectl domain

# Test short hostname resolution
nslookup server1
# Should resolve server1.corp.example.com
```

## Ignore Search Domains from DHCP

```bash
# Do not accept DNS servers or search domains pushed by DHCP server
nmcli connection modify "myconn" \
    ipv4.ignore-auto-dns yes \
    ipv4.dns "8.8.8.8" \
    ipv4.dns-search "mycompany.local"

nmcli connection up "myconn"
```

## Search Domains vs DNS Domains

- **Search domains** (`ipv4.dns-search`): used for hostname completion
- **Routing domains** (`ipv4.dns-search` with `~domain.com`): used with split DNS to decide which connection's DNS servers receive matching queries; they are not used to complete unqualified hostnames

```bash
# Configure a routing domain for internal DNS
nmcli connection modify "vpn-conn" \
    ipv4.dns-search "~internal.company.com"
```

## Conclusion

DNS search domains in nmcli are set with `ipv4.dns-search`. Multiple domains are space-separated. Use `+` to append and `-` to remove specific entries. Verify with `nmcli connection show`, and if your system uses `systemd-resolved`, `resolvectl domain`.
