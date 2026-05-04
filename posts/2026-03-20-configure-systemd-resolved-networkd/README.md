# How to Configure systemd-resolved with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Systemd-resolved, systemd-networkd, DNS, Networking, Configuration

Description: Configure systemd-resolved for DNS resolution alongside systemd-networkd, including global DNS settings, DNS-over-TLS, caching, and per-interface DNS configuration.

## Introduction

`systemd-resolved` is the DNS resolver service that integrates with systemd-networkd. It provides DNS caching, DNSSEC validation, DNS-over-TLS, and per-interface DNS configuration. Activating it requires pointing `/etc/resolv.conf` to its stub resolver and configuring DNS in `.network` files or `/etc/systemd/resolved.conf`.

## Enable and Activate systemd-resolved

```bash
# Enable and start systemd-resolved

systemctl enable --now systemd-resolved

# Point /etc/resolv.conf to the stub resolver
# This makes applications use resolved for DNS
ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf

# Verify
cat /etc/resolv.conf
# Should show: nameserver 127.0.0.53
```

## Configure Global DNS in resolved.conf

```ini
# /etc/systemd/resolved.conf
[Resolve]
# Primary DNS servers
DNS=8.8.8.8 8.8.4.4 1.1.1.1

# Fallback DNS (used when interface DNS fails)
FallbackDNS=9.9.9.9 149.112.112.112

# DNSSEC validation
DNSSEC=yes

# DNS-over-TLS
DNSOverTLS=opportunistic

# Enable DNS caching (boolean or "no-negative")
Cache=yes
```

```bash
# Restart resolved to apply
systemctl restart systemd-resolved
```

## Per-Interface DNS in .network Files

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
Address=192.168.1.10/24
DNS=192.168.1.1
DNS=8.8.8.8
Domains=corp.example.com
```

## Split DNS (Route Specific Domains to Specific Servers)

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=ipv4
# Route queries for internal.company.com to internal DNS
DNS=10.0.0.53
Domains=~internal.company.com
```

## Check DNS Resolution

```bash
# Test resolution via resolved
resolvectl query google.com

# Test with a specific server (resolvectl always uses resolved's
# configured servers; use dig to query a specific server directly)
dig @8.8.8.8 example.com

# Show per-interface DNS configuration
resolvectl status

# Show DNS servers in use
resolvectl dns

# Show search domains
resolvectl domain
```

## Flush DNS Cache

```bash
# Clear the resolved cache
resolvectl flush-caches

# Verify cache was cleared
resolvectl statistics
```

## DNSSEC Status

```bash
# Check DNSSEC mode for an interface
resolvectl dnssec eth0

# Query with DNSSEC validation enabled
resolvectl query --validate=yes example.com
```

## Conclusion

systemd-resolved integrates with systemd-networkd for DNS management. Enable it, link `/etc/resolv.conf` to the stub, configure global DNS in `resolved.conf`, and per-interface DNS in `.network` files. Use `resolvectl status` and `resolvectl query` to verify configuration and test resolution.
