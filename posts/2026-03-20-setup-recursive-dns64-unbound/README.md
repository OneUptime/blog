# How to Set Up a Recursive DNS64 Resolver with Unbound

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS64, Unbound, IPv6, NAT64, RFC 6147, Synthesis, Resolver

Description: Configure Unbound as a DNS64 recursive resolver to synthesize AAAA records for IPv6-only clients using NAT64, including custom prefix support.

## Introduction

Unbound supports DNS64 natively. When an IPv6-only client queries for a domain that only has A records, Unbound synthesizes a AAAA record by combining the NAT64 prefix with the IPv4 address, enabling the client to connect through a NAT64 gateway.

## Step 1: Configure Unbound for DNS64

```conf
# /etc/unbound/unbound.conf

server:
    interface: ::0
    interface: 0.0.0.0
    # Replace these with the client prefixes that should use this resolver.
    # Do not run an open recursive resolver on the public Internet.
    access-control: ::1/128 allow
    access-control: 127.0.0.0/8 allow
    access-control: 2001:db8:100::/64 allow
    access-control: 10.0.0.0/8 allow

    prefer-ip6: yes
    auto-trust-anchor-file: "/var/lib/unbound/root.key"

    module-config: "dns64 validator iterator"

    # Well-known NAT64 prefix
    dns64-prefix: 64:ff9b::/96

    # Synthesize only when no AAAA record exists
    # dns64-synthall defaults to "no"
```

## Step 2: Custom NAT64 Prefix

```conf
# If your NAT64 gateway uses a custom /96 prefix.
# 2001:db8:1::/96 is a documentation prefix; replace it with your routed prefix.

server:
    dns64-prefix: 2001:db8:1::/96

# The synthesized address will be:
# 2001:db8:1::<IPv4-address>
# Example: for 1.2.3.4 → 2001:db8:1::102:304
```

## Step 3: Filter Private IPv4 Answers

```conf
# RFC 6052 forbids the well-known prefix from representing non-global IPv4.
# Do not use reverse in-addr.arpa local-zones to block DNS64 synthesis;
# DNS64 synthesis is based on forward A answers.
server:
    # Optional DNS rebinding protection for public DNS answers.
    # Add only the ranges you want Unbound to remove from answers.
    private-address: 10.0.0.0/8
    private-address: 172.16.0.0/12
    private-address: 192.168.0.0/16
    private-address: 169.254.0.0/16

# If internal names legitimately resolve to private IPv4 addresses,
# either provide native AAAA/local data for those names, add a private-domain
# exception, or use a network-specific DNS64 prefix routed to your NAT64 gateway.
```

## Step 4: Validate and Test

```bash
# Check configuration
unbound-checkconf

# Initialize trust anchor
unbound-anchor -a /var/lib/unbound/root.key

# Start Unbound
systemctl restart unbound

# Test synthesis - domain with A only
dig @::1 ipv4.google.com AAAA
# Expected: 64:ff9b::<embedded IPv4> for each A record

# Test no synthesis for domains with AAAA
dig @::1 google.com AAAA
# Expected: real 2607:f8b0:... address (no synthesis)

# Test synthesis of well-known test address
dig @::1 ipv4only.arpa AAAA +short
# 64:ff9b::c000:aa and 64:ff9b::c000:ab (192.0.0.170 and 192.0.0.171)
```

## Step 5: Integration Test with NAT64

```bash
# From an IPv6-only host using this Unbound as DNS64
export DNS_SERVER="2001:db8::53"

# Check name resolution
host -t AAAA ipv4.google.com $DNS_SERVER

# Test connectivity through NAT64
# Requires a curl build with c-ares support for --dns-servers
curl --dns-servers "[$DNS_SERVER]" -6 http://ipv4.google.com/

# Packet capture to verify AAAA synthesis
tcpdump -i eth0 -n 'udp port 53' &
dig @$DNS_SERVER ipv4.google.com AAAA
```

## Step 6: DNS64 + DNSSEC

```conf
# Keep DNSSEC validation enabled for the underlying DNS data.

server:
    module-config: "dns64 validator iterator"
    # The dns64 module must be first in module-config.
    # It passes lookups through the validator/iterator and synthesizes
    # after the validated A data is available.
    # Clients that set CD and validate on their own should perform DNS64 locally.
```

## Monitoring

```bash
# Check overall Unbound statistics
unbound-control stats_noreset | grep -E 'num\.query\.type\.(A|AAAA)|num\.answer'

# There are no dedicated DNS64 synthesis counters in unbound-control stats.
# Log DNS64 decisions temporarily with algorithm-level verbosity.
# /etc/unbound/unbound.conf
# server:
#   verbosity: 4
```

## Conclusion

Unbound's DNS64 module is enabled with `module-config: "dns64 validator iterator"` and `dns64-prefix:` in the `server:` block. The module transparently synthesizes AAAA records for A-only domains, enabling NAT64 connectivity for IPv6-only clients. Monitor DNS64 resolution behavior alongside NAT64 translation success using OneUptime synthetic checks.
