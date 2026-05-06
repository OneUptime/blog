# How to Configure DNS64 with Unbound

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS64, Unbound, NAT64, DNS Configuration

Description: Learn how to enable DNS64 in the Unbound recursive resolver to synthesize AAAA records for IPv4-only domains, supporting IPv6-only clients through a NAT64 gateway.

## Prerequisites

- Unbound 1.5.0 or later (DNS64 support added in 1.5.0)
- Root access on the DNS server
- A configured NAT64 gateway using the same prefix

## Installing Unbound

```bash
# Ubuntu/Debian

apt update && apt install unbound

# RHEL/CentOS/Fedora
dnf install unbound

# Verify version supports DNS64
unbound -V | grep Version
```

## Unbound Configuration for DNS64

Unbound's DNS64 configuration is done in the `module-config` directive and DNS64 options in the `server:` section of `unbound.conf`:

```text
# /etc/unbound/unbound.conf

server:
    # Listen on all interfaces including IPv6
    interface: 0.0.0.0
    interface: ::0

    # Allow queries from local networks
    access-control: 192.168.0.0/16 allow
    access-control: 2001:db8::/32 allow
    access-control: ::1 allow
    access-control: 127.0.0.1 allow

    # Enable DNSSEC validation (DNS64 is compatible with this)
    auto-trust-anchor-file: "/var/lib/unbound/root.key"

    # Module configuration: dns64 must come before validator and iterator
    module-config: "dns64 validator iterator"

    # The NAT64 prefix to use for synthesis
    # Must match your NAT64 gateway's prefix
    dns64-prefix: 64:ff9b::/96

    # dns64-synthall is off by default, so only names without AAAA
    # records get synthesized answers
```

## Advanced DNS64 Configuration Options

```text
server:
    # The NAT64 prefix
    dns64-prefix: 64:ff9b::/96

    # Debugging feature: synthesize records even when AAAA exists
    # Default: no
    # dns64-synthall: yes
```

## Restricting DNS64 to Specific Clients

Unbound does not natively support per-client DNS64 prefixes in the same way BIND does. Because the DNS64 options live in the global `server:` section, DNS64 applies to all clients querying that resolver. If you need different behavior for different clients, run multiple Unbound instances on different ports or addresses.

For fine-grained control, use a separate DNS64-enabled Unbound instance for IPv6-only clients:

```bash
# Create a separate config for the DNS64 instance
cp /etc/unbound/unbound.conf /etc/unbound/unbound-dns64.conf

# Edit the DNS64 instance to listen on a different port or address
# e.g., only listen on the IPv6-only subnet interface
```

## Checking the Configuration

```bash
# Validate the Unbound configuration
unbound-checkconf /etc/unbound/unbound.conf

# Restart Unbound to apply changes
systemctl restart unbound

# Check service status
systemctl status unbound
```

## Testing DNS64 with dig

```bash
# Query the Unbound DNS64 resolver for ipv4only.arpa,
# a special-use name that has only A records
# Replace 127.0.0.1 with the Unbound server's address if remote
dig +short AAAA ipv4only.arpa @127.0.0.1

# Expected output with dns64-prefix: 64:ff9b::/96
# 64:ff9b::c000:aa
# 64:ff9b::c000:ab

# Confirm that real AAAA records pass through unchanged
dig +short AAAA google.com @127.0.0.1

# Compare with the original A records
dig +short A ipv4only.arpa @127.0.0.1
```

## Verifying Module Order

The module order in `module-config` is critical. DNS64 must process queries before validation:

```text
# Correct order for DNS64 + DNSSEC validation
module-config: "dns64 validator iterator"

# If you don't use DNSSEC validation (not recommended):
module-config: "dns64 iterator"
```

## Monitoring Unbound DNS64 Statistics

```bash
# Enable statistics in unbound.conf
# server:
#     statistics-interval: 60
#     extended-statistics: yes
# remote-control:
#     control-enable: yes
# ...and create the control keys with unbound-control-setup

# Unbound does not expose dedicated DNS64 counters,
# so inspect AAAA and answer statistics instead
unbound-control stats_noreset | grep -E 'num.query.type.AAAA|num.answer.rcode.nodata|num.answer.secure'

# Check query counts
unbound-control stats | grep num.queries
```

## Common Issues and Fixes

**Issue**: Synthesized AAAA records not returned
- Verify `dns64` appears before `validator` in `module-config`
- Confirm prefix matches NAT64 gateway

**Issue**: DNSSEC validation failures for synthesized records
- With validation enabled, Unbound validates the negative AAAA response and the A response before synthesizing
- Clients that perform their own end-to-end DNSSEC validation cannot validate synthesized AAAA records, so use a non-DNS64 resolver for those clients

**Issue**: Unbound crashes after adding dns64
- Ensure Unbound version is 1.5.0 or newer
- Check logs: `journalctl -u unbound`

## Summary

Enabling DNS64 in Unbound requires adding the `dns64` module to `module-config` (before `validator`) and setting the NAT64 prefix with `dns64-prefix` in the `server:` section. The configuration is simpler than BIND's but equally effective for synthesizing AAAA records for IPv4-only domains.
