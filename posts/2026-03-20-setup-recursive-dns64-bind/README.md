# How to Set Up a Recursive DNS64 Resolver with BIND

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS64, BIND, IPv6, NAT64, RFC 6147, Resolver, Synthesis

Description: Configure BIND9 as a DNS64 recursive resolver that synthesizes AAAA records from A records to enable IPv6-only clients to reach IPv4-only services via NAT64.

## Introduction

DNS64 (RFC 6147) synthesizes AAAA records from A records when no AAAA record exists. IPv6-only clients resolve names via DNS64, get a synthesized AAAA address in the NAT64 prefix (usually `64:ff9b::/96`), and send packets to the NAT64 gateway, which translates them to IPv4.

## Architecture

```text
IPv6-only client
    → DNS64 resolver (BIND)
        → if AAAA exists: return real AAAA
        → if only A exists: synthesize AAAA = 64:ff9b::<IPv4>
    → client sends to 64:ff9b::1.2.3.4
    → NAT64 gateway translates to 1.2.3.4
```

## Step 1: Configure BIND for DNS64

```nginx
# /etc/bind/named.conf.options

options {
    directory "/var/cache/bind";

    # Listen on IPv6 (clients are IPv6-only)
    listen-on-v6 { any; };

    # Enable recursion
    recursion yes;
    allow-query { 2001:db8::/32; ::1; };

    # DNS64 configuration
    # Synthesize AAAA using the well-known NAT64 prefix
    dns64 64:ff9b::/96 {
        # Clients that should receive synthesized records
        clients { any; };

        # Exclude real IPv6 addresses from synthesis
        # (don't synthesize if AAAA already exists)
        exclude { ::ffff:0:0/96; };

        # Map IPv4 loopback to synthesized address?
        # (usually no)
        mapped { !RFC1918; any; };
    };

    dnssec-validation auto;
};
```

## Step 2: Custom NAT64 Prefix (Non-Well-Known)

```nginx
# /etc/bind/named.conf.options

options {
    # If your NAT64 gateway uses a custom prefix
    dns64 2001:db8:1::/96 {
        clients { 2001:db8:client::/48; };
        exclude { ::ffff:0:0/96; };
        mapped { any; };
        recursive-only yes;
    };
};
```

## Step 3: Exclude RFC 1918 Mapping

```nginx
acl "RFC1918" {
    10.0.0.0/8;
    172.16.0.0/12;
    192.168.0.0/16;
};

options {
    dns64 64:ff9b::/96 {
        clients { any; };
        mapped { !RFC1918; any; };
        exclude { ::ffff:0:0/96; };
    };
};
```

## Step 4: Validate

```bash
named-checkconf
systemctl restart bind9

# Test with a domain that has only A records

dig AAAA ipv4only.example.com @::1
# Expected: synthesized AAAA like 64:ff9b::c000:0201

# Test with a domain that has AAAA records (no synthesis)
dig AAAA google.com @::1
# Expected: real AAAA record

# Confirm synthesis with well-known address (RFC 7050)
dig AAAA ipv4only.arpa @::1
# Expected: 64:ff9b::c000:00aa (192.0.0.170 mapped)
```

## Step 5: Verify NAT64 Gateway Integration

```bash
# From an IPv6-only client
# Ping a synthesized address
ping6 64:ff9b::8.8.8.8

# If NAT64 gateway is working, this should succeed
# (the NAT64 gateway translates to 8.8.8.8)

# curl to an IPv4-only site
curl -6 http://ipv4only.example.com/
# Should work if DNS64 + NAT64 are configured correctly
```

## Monitoring

```bash
# Check BIND stats for synthesis
rndc stats
grep "dns64" /var/cache/bind/named_stats.txt

# Watch queries for synthesis
tail -f /var/log/named/queries.log | grep AAAA
```

## Conclusion

BIND's `dns64` directive enables DNS64 in a single configuration block. Pair it with a NAT64 gateway (Jool, Tayga, or cloud NAT64) to give IPv6-only clients transparent access to IPv4 resources. Monitor DNS64 synthesis rate and NAT64 translation success with OneUptime to detect IPv4-only services that fail in IPv6-only environments.
