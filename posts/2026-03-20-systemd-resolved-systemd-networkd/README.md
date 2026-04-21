# How to Configure systemd-resolved with systemd-networkd - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, DNS, Systemd-resolved, systemd-networkd, Name Resolution

Description: Learn how to configure systemd-resolved alongside systemd-networkd for DNS name resolution, including stub resolver setup, per-interface DNS, and DNSSEC.

## Introduction

`systemd-resolved` is a DNS resolver and local stub DNS server that integrates tightly with `systemd-networkd`. Together they provide a complete network stack including IP configuration and DNS resolution for Linux servers and desktops.

## Enabling the Services

```bash
sudo systemctl enable --now systemd-networkd
sudo systemctl enable --now systemd-resolved
```

## Linking resolv.conf

Replace the default `/etc/resolv.conf` with the systemd-resolved stub:

```bash
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

This makes DNS clients that read `/etc/resolv.conf` use the systemd-resolved stub listener at `127.0.0.53`.

## Configuring DNS in Network Unit Files

Set per-interface DNS in your `.network` file:

```ini
[Match]
Name=ens3

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
DNS=1.1.1.1
Domains=example.local ~.
```

The `~.` in `Domains=` sets this interface as the default for all domains (useful for primary interfaces).

## Global DNS Configuration

Configure global DNS settings in `/etc/systemd/resolved.conf`:

```ini
[Resolve]
DNS=8.8.8.8 1.1.1.1
FallbackDNS=9.9.9.9 149.112.112.112
Domains=example.local
DNSSEC=allow-downgrade
DNSOverTLS=opportunistic
Cache=yes
```

Apply changes:

```bash
sudo systemctl restart systemd-resolved
```

## Checking Resolution Status

```bash
resolvectl status
resolvectl query google.com
resolvectl query --interface=ens3 example.local
```

## DNS over TLS

Enable encrypted DNS in `resolved.conf`:

```ini
[Resolve]
DNS=1.1.1.1#cloudflare-dns.com 8.8.8.8#dns.google
DNSOverTLS=yes
```

## DNSSEC Validation

```ini
[Resolve]
DNSSEC=yes
```

Test DNSSEC:

```bash
resolvectl query --validate=yes google.com
```

## Flushing the DNS Cache

```bash
sudo resolvectl flush-caches
resolvectl statistics
```

## Troubleshooting

View DNS logs:

```bash
journalctl -u systemd-resolved -f
```

Test resolution directly:

```bash
dig @127.0.0.53 google.com
nslookup google.com 127.0.0.53
```

## Conclusion

`systemd-resolved` integrates seamlessly with `systemd-networkd` to provide flexible, cacheable DNS resolution with support for per-interface DNS servers, DNSSEC, and DNS over TLS. The combination provides a production-grade network stack without requiring additional software.
