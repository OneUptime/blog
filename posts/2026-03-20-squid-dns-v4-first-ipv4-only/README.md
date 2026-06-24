# How to Configure Squid DNS Lookups to Return IPv4 Only (dns_v4_first)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, DNS, IPv4, Dns_v4_first, Configuration, Proxy, Networking

Description: Learn how to configure Squid to prefer or exclusively use IPv4 DNS resolution, preventing connections to IPv6 addresses on dual-stack networks.

---

On dual-stack networks, Squid may resolve hostnames to IPv6 addresses and attempt to connect to backends via IPv6, even when the preferred path is IPv4. In Squid 4 and older, the `dns_v4_first` directive controls this preference. In Squid 5 and newer, `dns_v4_first` was removed, and IPv6 avoidance should be handled with DNS resolver, firewall, or build-time IPv6 controls.

## The Problem

With IPv6-enabled Squid, both A and AAAA records can be resolved for dual-stack destinations. Squid 4 and older prefer IPv6 by default unless `dns_v4_first` is enabled. Squid 5 and newer use a Happy Eyeballs approach where DNS response timing and cached address order affect which address family is tried first. RFC 6724 applies to address selection and sorting in system resolver APIs, not to DNS servers changing record order.

## Fix 1: Squid 4 and Older: dns_v4_first on (Prefer IPv4)

```squid
# /etc/squid/squid.conf

# Squid 3.1.16 through 4.x only. Removed in Squid 5 and newer.
# Prefer IPv4 addresses for dual-stack destinations.

# Squid still performs both A and AAAA lookups and can use IPv6 if no A record exists.
dns_v4_first on
```

## Fix 2: Restrict Squid's Client Listener to IPv4

For environments where clients should reach Squid only over IPv4:

```squid
# Bind Squid's client listener to IPv4 only.
# This does not disable IPv6 for Squid's outbound server connections.

http_port 0.0.0.0:3128     # IPv4 only (not [::]:3128)
```

For strict outbound IPv4-only behavior, use firewall rules, DNS recursive-resolver configuration, or a Squid binary built with `--disable-ipv6` where available.

## Fix 3: System-Level IPv6 Preference (gai.conf)

This affects applications that use the system `getaddrinfo()` address selection policy, not just Squid. Do not rely on it as the only Squid control when Squid's internal DNS resolver or Happy Eyeballs behavior is in use:

```bash
# /etc/gai.conf
# Increase IPv4-mapped address precedence to prefer IPv4 connections
precedence ::ffff:0:0/96  100
```

## Fix 4: Use a DNS Resolver That Filters AAAA Responses

Point Squid at a resolver configured to answer A queries normally and suppress or filter AAAA responses for the domains you want to force over IPv4.

```squid
# /etc/squid/squid.conf

# Use a specific DNS server (overrides /etc/resolv.conf)
dns_nameservers 192.168.1.53

# Optionally set the DNS query timeout
dns_timeout 30 seconds
```

## Verifying DNS Resolution

```bash
# Check what Squid resolves for a hostname using the cache manager IP cache
curl -s http://127.0.0.1:3128/squid-internal-mgr/ipcache | grep example.com

# Older deployments, if squidclient's mgr: shortcut is available
squidclient -h localhost -p 3128 mgr:ipcache | grep example.com

# Check the system-level resolution
getent ahosts example.com

# Compare with explicit IPv4 lookup
dig +short A example.com @192.168.1.53
dig +short AAAA example.com @192.168.1.53
```

## Confirming IPv4 Outbound Connections

```bash
# List Squid's current TCP connections
# IPv4 endpoints show x.x.x.x:port; IPv6 endpoints show [addr]:port
ss -tnp | grep '[s]quid'

# Check the access log for DIRECT connections and the IP used
tail -f /var/log/squid/access.log | grep DIRECT
```

## Key Takeaways

- `dns_v4_first on` is only available in Squid 3.1.16 through 4.x; it makes Squid prefer IPv4 for dual-stack destinations but still performs A and AAAA lookups.
- Bind `http_port` to `0.0.0.0` (not `::`) to restrict Squid's client listener to IPv4.
- For strict outbound IPv4-only behavior in modern Squid, use DNS recursive-resolver configuration, firewall rules, or a Squid build without IPv6 support.
- `/etc/gai.conf` provides a system-wide `getaddrinfo()` preference for applications that use it, but it is not a complete Squid-specific IPv6 control.
