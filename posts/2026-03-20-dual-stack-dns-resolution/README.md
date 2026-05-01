# How to Manage Dual-Stack DNS Resolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Dual-Stack, DNS, AAAA Records

Description: Learn how to manage DNS for dual-stack networks, including publishing AAAA records, handling address selection, split-horizon DNS, and troubleshooting resolution issues.

## Overview

DNS is the control plane for dual-stack connectivity. A hostname can resolve to both A (IPv4) and AAAA (IPv6) records - the system returns those addresses, and client address selection commonly follows RFC 6724 with Happy Eyeballs handling fallback. Missing AAAA records mean IPv6 is never used regardless of network readiness. Incorrect AAAA records cause delays or connection failures.

## Publishing AAAA Records

```bash
# BIND zone file - add AAAA alongside existing A records

; Forward zone: example.com
@       IN  SOA  ns1.example.com. admin.example.com. (
                 2026031901 3600 900 604800 300 )

; IPv4
@       IN  A     203.0.113.10
www     IN  A     203.0.113.10
mail    IN  A     203.0.113.20
ns1     IN  A     203.0.113.1

; IPv6 - add AAAA records for each service
@       IN  AAAA  2001:db8::10
www     IN  AAAA  2001:db8::10
mail    IN  AAAA  2001:db8::20
ns1     IN  AAAA  2001:db8::1
```

Reverse DNS for IPv6 (ip6.arpa):

```bash
; Reverse zone: 8.b.d.0.1.0.0.2.ip6.arpa (for 2001:db8::/32)
$ORIGIN 8.b.d.0.1.0.0.2.ip6.arpa.

; PTR for 2001:db8::10 (www.example.com)
0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0  IN  PTR  www.example.com.
```

## How Address Selection Works

When an application calls `getaddrinfo("www.example.com")`, the OS gets both A and AAAA records. RFC 6724 defines selection - simplified:

```text
Returned addresses are often sorted like this when both are equally suitable:
  1. 2001:db8::10   (global unicast IPv6)
  2. 203.0.113.10   (global unicast IPv4)

If IPv6 sorts first, the application usually tries 2001:db8::10 first.

Happy Eyeballs (RFC 8305):
  - Prefer the first address returned by the system (often IPv6)
  - After a short delay (250ms is a recommended default), start the next candidate
  - Whichever connection succeeds first wins
  - This provides fast fallback if the preferred path is broken
```

## Split-Horizon DNS for Internal Services

Internal services should resolve to internal IPv6 addresses:

```bash
# External DNS (public):
# internal-app.example.com → no record (not publicly accessible)

# Internal DNS (authoritative for corp.example.com):
internal-app.corp.example.com.  IN  A     10.0.1.10
internal-app.corp.example.com.  IN  AAAA  2001:db8:1::10

# Common mistake: internal DNS only has A records
# Effect: internal clients use IPv4 for internal apps
#         even if IPv6 is available between client and server
```

## BIND9 Configuration for Dual-Stack

```text
// /etc/bind/named.conf.options
options {
    listen-on     { any; };
    listen-on-v6  { any; };       // Listen on all IPv6 interfaces too

    forwarders {
        8.8.8.8;
        2001:4860:4860::8888;     // Google DNS over IPv6
    };

    // Allow queries from the internal network
    allow-query { 10.0.0.0/8; 2001:db8::/32; };

    // Enable DNSSEC validation
    dnssec-validation auto;
};
```

## Unbound Configuration for Dual-Stack

```nginx
# /etc/unbound/unbound.conf
server:
    interface: 0.0.0.0
    interface: ::0                 # Listen on all IPv6 interfaces
    access-control: 10.0.0.0/8 allow
    access-control: 2001:db8::/32 allow
    do-ip4: yes
    do-ip6: yes
    do-udp: yes
    do-tcp: yes
    prefer-ip6: yes                # Prefer IPv6 upstream queries

forward-zone:
    name: "."
    forward-addr: 8.8.8.8
    forward-addr: 2001:4860:4860::8888
```

## Controlling Address Selection with DNS

You can influence which address family clients use:

```bash
# Temporarily remove AAAA record to force IPv4 (during IPv6 troubleshooting)
# WARNING: This affects all users - use with caution

# Or lower TTL first, then remove:
www  IN  AAAA  2001:db8::10    ; TTL 300 (lower before planned removal)

# Synthesize AAAA records with DNS64 for IPv6-only clients accessing IPv4-only servers
# (NAT64/DNS64 environment - different from pure dual-stack)
```

## Testing DNS for Dual-Stack

```bash
# Query A record
dig A www.example.com

# Query AAAA record
dig AAAA www.example.com

# Do not rely on ANY here - query A and AAAA explicitly instead

# Use specific DNS server
dig AAAA www.example.com @2001:db8::53

# Check PTR for IPv6 address
dig -x 2001:db8::10

# Test with getaddrinfo (simulates application behavior)
python3 -c "import socket; print(socket.getaddrinfo('www.example.com', 80, proto=socket.IPPROTO_TCP))"

# Verify DNS over IPv6 transport
dig AAAA www.example.com @2001:4860:4860::8888 +stats | grep SERVER
```

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Site loads over IPv4 despite IPv6 available | Missing AAAA record | Add AAAA in zone file |
| Connections timeout then fall back to IPv4 | AAAA record present but IPv6 route broken | Fix routing or remove AAAA temporarily |
| AAAA returned but connection fails | Firewall blocking IPv6 | Update IPv6 firewall rules |
| Slow initial connection | Happy Eyeballs delay before the next connection attempt | Ensure IPv6 path is healthy |
| Internal service unreachable via IPv6 | Internal DNS missing AAAA | Add AAAA to internal authoritative DNS |

## Negative AAAA Caching

NXDOMAIN and NOERROR/no-data responses are cached using the SOA in the negative response:

```bash
# Inspect the SOA in the negative response's AUTHORITY SECTION
dig AAAA ipv4only.arpa +noall +authority +answer +comments
# Per RFC 2308, the negative cache TTL is the smaller of the SOA record TTL
# and the SOA MINIMUM field in that negative response

# After adding a AAAA record, clients may cache the "no AAAA" response
# for up to the negative TTL - plan accordingly
```

## Summary

Dual-stack DNS requires AAAA records alongside A records for all services. Internal DNS must cover internal IPv6 addresses, not just external ones. Configure BIND or Unbound to listen on both IPv4 and IPv6 and include IPv6 forwarders. RFC 6724 and local policy often prefer IPv6 when both families are equally suitable; Happy Eyeballs provides fast fallback if the preferred path is broken. Test with `dig AAAA` and `python3 socket.getaddrinfo()` to verify applications see both address families. Missing AAAA records silently keep traffic on IPv4 - run periodic audits to ensure parity.
