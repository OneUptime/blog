# How to Configure BIND as a Recursive IPv6 DNS Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BIND, DNS, IPv6, Recursive, Resolver, Named, DNSSEC

Description: Configure BIND9 as a recursive (caching) DNS resolver that communicates over IPv6 transport, with proper forwarders, ACLs, and DNSSEC validation.

## Introduction

A recursive BIND resolver resolves client queries by contacting other DNS servers and caches results. If forwarders are configured, it can send those recursive queries to the forwarders instead of walking the DNS hierarchy itself. Enabling IPv6 means it can receive queries from IPv6 clients and use IPv6 transport to reach upstream nameservers.

## Step 1: Basic Recursive Configuration

```nginx
# /etc/bind/named.conf.options

options {
    directory "/var/cache/bind";

    # Listen for queries from IPv6 and IPv4 clients
    listen-on-v6 { any; };
    listen-on    { any; };

    # Enable recursion
    recursion yes;

    # Allow only local clients to use this resolver
    allow-query       { localhost; localnets; };
    allow-query-cache { localhost; localnets; };
    allow-recursion   { localhost; localnets; };

    # DNSSEC validation
    dnssec-validation auto;

    # BIND can use IPv6 for outbound queries on IPv6-capable systems
};
```

## Step 2: Configure Forwarders (Optional)

```nginx
options {
    # Forward to dual-stack resolvers
    forwarders {
        2606:4700:4700::1111;  # Cloudflare IPv6
        2606:4700:4700::1001;
        8.8.8.8;               # Google IPv4 fallback
        8.8.4.4;
    };

    # Try forwarders first, then fall back to full recursion
    forward first;  # Try forwarders first, fall back to recursion
};
```

## Step 3: Outbound IPv6 Queries

```nginx
# /etc/bind/named.conf.options

options {
    # BIND uses IPv6 for outbound queries automatically when IPv6 is available

    # If you need to pin the local IPv6 source address for those queries,
    # replace the wildcard with an IPv6 address assigned to this server
    query-source-v6 address *;

    # Set outbound interface for queries
    # (not usually needed - let the OS route)
};
```

## Step 4: Rate Limiting

```nginx
options {
    # Limit response rate (DNS amplification protection)
    rate-limit {
        responses-per-second 20;
        window 5;
        slip 2;
    };
};
```

## Step 5: Validate Configuration

```bash
named-checkconf

# Restart and verify

systemctl restart bind9
systemctl status bind9

# Query the recursive resolver over IPv6
dig AAAA google.com @::1
dig A example.com @::1

# Check that DNSSEC validation works
dig A ftp.isc.org @::1 +dnssec
# Look for the ad flag in the response header

# Confirm it's listening on IPv6
ss -lnp | grep ":53"
# udp  UNCONN  0  0  [::]:53  [::]:*  users:(("named",...))
```

## Step 6: Logging

```nginx
# /etc/bind/named.conf

logging {
    channel default_log {
        file "/var/log/named/default.log" versions 3 size 10m;
        severity info;
        print-time yes;
        print-severity yes;
    };

    channel query_log {
        file "/var/log/named/queries.log" versions 5 size 50m;
        severity info;
        print-time yes;
    };

    category default    { default_log; };
    category queries    { query_log; };
    category resolver   { default_log; };
};
```

## Testing

```bash
# Test recursion with a known AAAA record
dig AAAA google.com @::1 +stats
# ;; Query time: 12 msec
# ;; SERVER: ::1#53(::1)

# Test reverse lookup
dig -x 2001:4860:4860::8888 @::1

# Verify DNSSEC chain of trust
dig A www.dnssec-failed.org @::1
# A validating resolver should return SERVFAIL

dig A www.dnssec-failed.org @::1 +cd
# If this succeeds with +cd, the failure is due to DNSSEC validation
```

## Conclusion

BIND recursive resolver with IPv6 needs recursion enabled, appropriate ACLs such as `allow-query-cache` and `allow-recursion` to restrict which clients can use it, and optional forwarders with IPv6 addresses. Enable DNSSEC validation to authenticate responses. Monitor resolver latency and cache hit rate with OneUptime.
