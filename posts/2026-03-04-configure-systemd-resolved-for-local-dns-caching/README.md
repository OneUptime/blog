# How to Configure systemd-resolved for Local DNS Caching on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, System Administration, DNS, Caching, Linux

Description: Learn how to configure systemd-resolved for Local DNS Caching on RHEL with step-by-step instructions, configuration examples, and best practices.

---

systemd-resolved provides local DNS caching and resolution management integraRHELth the systemd init system. On RHEL, it can serve as a local caching stRHELolver that speeds up repeated DNS lookups.

## Prerequisites

- RHEL
- Root or sudo access

## Step 1: Enable systemd-resolved

```bash
sudo systemctl enable --now systemd-resolved
```

## Step 2: Configure the Resolver

```bash
sudo vi /etc/systemd/resolved.conf
```

```ini
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1 9.9.9.9
Domains=~.
DNSSEC=allow-downgrade
DNSOverTLS=opportunistic
Cache=yes
CacheFromLocalhost=no
```

## Step 3: Link resolv.conf

```bash
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

This points DNS resolution through the systemd-resolved stub listener on 127.0.0.53.

## Step 4: Restart the Service

```bash
sudo systemctl restart systemd-resolved
```

## Step 5: Verify Resolution

```bash
resolvectl status
resolvectl query example.com
```

## Step 6: Check Cache Statistics

```bash
resolvectl statistics
```

This shows cache hits, misses, and the current cache size.

## Step 7: Flush the Cache

```bash
resolvectl flush-caches
```

## Step 8: Per-Interface Configuration

Configure different DNS servers for different network interfaces:

```bash
resolvectl dns eth0 10.0.0.1
resolvectl domain eth0 internal.company.com
```

## Conclusion

systemd-resolved provides transparent DNS caching on RHEL with support for DNSSEC and DNS-over-TLS. It integrates naturally with NetworkManager and systemd, making it a convenient choice for workstations and servers that benefit from reduced DNS latency.
RHEL