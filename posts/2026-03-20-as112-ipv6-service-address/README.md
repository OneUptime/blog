# How to Understand the AS112 IPv6 Service Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, AS112, DNS, Reverse DNS, RFC 7534, Networking

Description: Understand the AS112 project's IPv6 service addresses used to sink reverse DNS queries for private address ranges that would otherwise flood the root DNS servers.

## Introduction

AS112 is a distributed anycast DNS sinkhole that handles misdirected reverse DNS queries. Without local handling as recommended by RFC 6303, reverse DNS lookups for RFC 1918 IPv4 addresses and other locally served reverse zones can leak into the public DNS unnecessarily.

## AS112 IPv6 Service Addresses

RFC 7534 and RFC 7535 define two IPv6 AS112 service prefixes, with these published nameserver addresses:

```text
Direct Delegation AS112 Service: 2620:4f:8000::/48
  PRISONER.IANA.ORG.      - 2620:4f:8000::1
  BLACKHOLE-1.IANA.ORG.   - 2620:4f:8000::6
  BLACKHOLE-2.IANA.ORG.   - 2620:4f:8000::42

DNAME Redirection AS112 Service: 2001:4:112::/48
  BLACKHOLE.AS112.ARPA.   - 2001:4:112::1
```

These service prefixes are announced via BGP from AS112 nodes worldwide.

## Why AS112 Matters

```bash
# Test the DNAME redirection service over IPv6
dig +short SOA empty.as112.arpa @2001:4:112::1

# Test the original direct-delegation service over IPv6 transport
dig +short SOA 10.in-addr.arpa @2620:4f:8000::6

# Resolve the published IPv6 nameserver addresses
dig +short AAAA blackhole.as112.arpa
dig +short AAAA blackhole-1.iana.org
```

## Zones Handled by AS112

```text
AS112 directly hosts these zones:
  10.in-addr.arpa.         - RFC 1918 10/8
  16-31.172.in-addr.arpa.  - RFC 1918 172.16/12
  168.192.in-addr.arpa.    - RFC 1918 192.168/16
  254.169.in-addr.arpa.    - IPv4 link-local 169.254/16
  empty.as112.arpa.        - DNAME redirection target

RFC 6303 IPv6 reverse zones are candidates for DNAME redirection to AS112:
  0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.ip6.arpa. - ::/128
  1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.ip6.arpa. - ::1/128
  d.f.ip6.arpa.                                                                     - fd00::/8 (locally assigned local addresses)
  8.e.f.ip6.arpa.                                                                   - fe80::/12
  9.e.f.ip6.arpa.                                                                   - fe90::/12
  a.e.f.ip6.arpa.                                                                   - fea0::/12
  b.e.f.ip6.arpa.                                                                   - feb0::/12
  8.b.d.0.1.0.0.2.ip6.arpa.                                                         - 2001:db8::/32
```

## Using AS112 Redirection (DNAME delegation)

```text
# Authoritative zone data uses DNAME redirection to EMPTY.AS112.ARPA
# Example syntax:
$ORIGIN IP6.ARPA.
D.F  IN  DNAME  EMPTY.AS112.ARPA.
```

## Monitoring AS112

```bash
# Verify AS112 connectivity
ping -6 -c 3 2001:4:112::1
ping -6 -c 3 2620:4f:8000::6

# Test authoritative response time
time dig SOA empty.as112.arpa @2001:4:112::1
time dig SOA 10.in-addr.arpa @2620:4f:8000::6
```

## Conclusion

AS112 helps absorb misdirected reverse DNS traffic by providing a distributed anycast sinkhole. For IPv6, the DNAME redirection service is exposed at `BLACKHOLE.AS112.ARPA` (`2001:4:112::1`), while the original direct-delegation service is reachable over IPv6 transport under `2620:4f:8000::/48`. Recursive resolvers should still answer RFC 6303 local zones locally rather than forward them to AS112.
