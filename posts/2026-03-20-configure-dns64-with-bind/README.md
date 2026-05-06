# How to Configure DNS64 with BIND

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS64, BIND, NAT64, DNS Configuration

Description: Step-by-step instructions for enabling DNS64 in BIND (named) to synthesize AAAA records for IPv4-only domains and support IPv6-only clients through a NAT64 gateway.

## Prerequisites

- BIND 9.8 or later (DNS64 support was introduced in BIND 9.8)
- A working NAT64 gateway configured with the NAT64 prefix
- The NAT64 prefix to use (e.g., `64:ff9b::/96` or another RFC 6052-compatible prefix)

## Understanding BIND's dns64 Statement

BIND implements DNS64 natively via the `dns64` configuration block in `named.conf`. When a AAAA query arrives and no native AAAA record exists, BIND can synthesize one using the configured prefix.

## Basic DNS64 Configuration

Add the `dns64` block to your `named.conf` or `named.conf.options` file:

```named
// /etc/named.conf or /etc/bind/named.conf.options

options {
    // Listen on IPv6 as well as IPv4
    listen-on-v6 { any; };

    // Allow queries from clients on your network
    allow-query { 192.168.0.0/16; 2001:db8::/32; };

    // Enable DNS64 with the well-known NAT64 prefix
    dns64 64:ff9b::/96 {
        // clients: which source addresses should receive synthesized records
        // Use "any" for all clients, or restrict to specific IPv6 prefixes
        clients { any; };

        // mapped: which IPv4 addresses to synthesize records for
        // Use negated ACL entries to skip ranges such as RFC 1918 space
        mapped {
            !10.0.0.0/8;
            !172.16.0.0/12;
            !192.168.0.0/16;
            any;
        };

        // exclude: IPv6 AAAA records to ignore if they are already present
        // This is commonly used to ignore previously translated AAAA records
        exclude { 64:ff9b::/96; ::ffff:0.0.0.0/96; };

        // suffix: optional IPv6 suffix to append (rarely needed)
        // suffix ::;

        // recursive-only: set to yes to synthesize only for recursive queries
        recursive-only yes;
    };
};
```

## Restricting DNS64 to Specific Clients

If you want only IPv6-only clients to receive synthesized records (dual-stack clients can use a non-DNS64 resolver instead):

```named
dns64 64:ff9b::/96 {
    // Only synthesize records for clients on the IPv6-only subnet
    clients { 2001:db8:100::/48; };

    mapped {
        !10.0.0.0/8;
        !172.16.0.0/12;
        !192.168.0.0/16;
        !127.0.0.0/8;
        any;
    };

    // Ignore already-translated AAAA records if they appear
    exclude {
        64:ff9b::/96;
        ::ffff:0.0.0.0/96;
    };
};
```

## Multiple DNS64 Prefixes

BIND supports multiple `dns64` blocks, useful when different NAT64 gateways serve different client groups:

```named
// First NAT64 prefix for internal IPv6-only subnet
dns64 2001:db8:64:a::/96 {
    clients { 2001:db8:a::/48; };
    mapped { any; };
    exclude { 2001:db8:64:a::/96; ::ffff:0.0.0.0/96; };
};

// Second NAT64 prefix for a different subnet
dns64 2001:db8:64:b::/96 {
    clients { 2001:db8:b::/48; };
    mapped { any; };
    exclude { 2001:db8:64:b::/96; ::ffff:0.0.0.0/96; };
};
```

## Reloading BIND After Configuration Changes

```bash
# Check configuration syntax before reloading

named-checkconf /etc/named.conf
# or on Debian/Ubuntu
named-checkconf /etc/bind/named.conf

# Reload BIND without restarting
rndc reload

# Or restart the service
systemctl restart named
# or on Debian/Ubuntu
systemctl restart bind9
```

## Testing DNS64 Resolution

```bash
# Query ipv4only.arpa, a well-known IPv4-only name used for DNS64/NAT64 discovery
# Should return synthesized AAAA records in the 64:ff9b::/96 range
dig AAAA ipv4only.arpa @127.0.0.1

# Expected output includes synthesized records for 192.0.0.170 and 192.0.0.171
# ;; ANSWER SECTION:
# ipv4only.arpa.  IN  AAAA  64:ff9b::c000:aa
# ipv4only.arpa.  IN  AAAA  64:ff9b::c000:ab

# Verify that real AAAA records are returned unchanged
dig AAAA ipv6.google.com @127.0.0.1
```

## Verifying DNS64 Does Not Interfere with DNSSEC

When DNSSEC validation is enabled, BIND's default behavior is not to synthesize AAAA answers for signed data when the client requests DNSSEC records (for example, by using `+dnssec`, which sets the DO bit). This avoids returning data that would fail DNSSEC validation:

```bash
# Replace signed-a-only.example with a DNSSEC-signed name that has A records but no AAAA records
# With the default "break-dnssec no;" and +dnssec, BIND should not synthesize a AAAA answer
dig AAAA signed-a-only.example @127.0.0.1 +dnssec
```

## Logging DNS64 Activity

Enable query logging in BIND to inspect DNS64-related queries:

```named
logging {
    channel dns64_log {
        file "/var/log/named/dns64.log" versions 3 size 5m;
        severity dynamic;
        print-time yes;
    };
    category queries { dns64_log; };
};
```

## Summary

Configuring DNS64 in BIND requires adding a `dns64` block to `named.conf` specifying the NAT64 prefix, the clients that should receive synthesized records, and any mapped or excluded address rules. After reloading BIND, test with `dig AAAA` against a domain that only has A records. Make sure the NAT64 gateway uses the same prefix configured in BIND.
