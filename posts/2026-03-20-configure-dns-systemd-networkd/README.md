# How to Configure DNS Servers with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, systemd-networkd, DNS, Systemd-resolved, Networking, Configuration

Description: Configure DNS servers with systemd-networkd and systemd-resolved, including per-interface DNS settings, search domains, and DNS-over-TLS.

## Introduction

systemd-networkd integrates with `systemd-resolved` for DNS resolution. DNS servers can be configured per-interface in `.network` files or globally in `resolved.conf`. A common and recommended setup is linking `/etc/resolv.conf` to the systemd-resolved stub resolver.

## Configure DNS in a .network File

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
DNS=8.8.4.4
DNS=1.1.1.1
Domains=example.com
```

## Enable systemd-resolved

```bash
# Enable and start systemd-resolved
systemctl enable --now systemd-resolved

# Recommended: point /etc/resolv.conf to the systemd-resolved stub
ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

## Verify DNS Configuration

```bash
# Show DNS servers in use per interface
resolvectl status

# Test DNS resolution
resolvectl query google.com

# Check /etc/resolv.conf
cat /etc/resolv.conf
```

## Configure Global DNS in resolved.conf

```ini
# /etc/systemd/resolved.conf
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1 1.0.0.1
Domains=~.
DNSOverTLS=opportunistic
```

```bash
# Restart resolved to apply changes
systemctl restart systemd-resolved
```

## Set DNS Search Domains

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=ipv4
Domains=corp.example.com dev.example.com
```

## DNS for DHCP-Assigned Interfaces

When using DHCP, you can accept or override the DNS provided by the server:

```ini
[Match]
Name=eth0

[Network]
DHCP=ipv4

[DHCPv4]
# Accept DNS from DHCP (default: yes)
UseDNS=yes

# Override: use your own DNS instead
# UseDNS=no
```

If `UseDNS=no`, add `DNS=` lines in `[Network]` to specify your own servers.

## View Resolved Statistics

```bash
# Show detailed resolver statistics
resolvectl statistics

# Flush DNS cache
resolvectl flush-caches

# Show cache statistics
resolvectl show-cache
```

## Conclusion

DNS configured with systemd-networkd is typically handled by systemd-resolved. Configure per-interface DNS servers in `[Network]` DNS= lines within `.network` files. Enable systemd-resolved and, in the recommended stub-resolver setup, link `/etc/resolv.conf` to its stub. Use `resolvectl status` to verify DNS assignment and `resolvectl query` to test resolution.
