# How to Configure Knot DNS with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knot DNS, DNS, IPv6, Authoritative, AAAA, DNSSEC, Knotd

Description: Configure Knot DNS as an authoritative server with IPv6 listening, AAAA records, DNSSEC signing, and zone transfers over IPv6 transport.

## Introduction

Knot DNS is a high-performance authoritative DNS server developed by CZ.NIC. It features online DNSSEC signing, zone transfers (AXFR/IXFR), and full IPv6 support.

## Installation

```bash
# Ubuntu/Debian

apt-get install -y knot

# RHEL/CentOS (EPEL)
dnf install -y knot

# Verify
knotd --version
```

## Step 1: Basic knot.conf

```yaml
# /etc/knot/knot.conf

server:
    # Listen on all IPv6 and IPv4 interfaces
    listen:
        - "::@53"
        - "0.0.0.0@53"

    # Or listen on specific IPv6 address
    # listen: [2001:db8::53@53]

    identity: "ns1.example.com"
    version: "hidden"

log:
  - target: syslog
    any: info
```

## Step 2: Zone Configuration with AAAA Records

```yaml
# /etc/knot/knot.conf (continued)

zone:
  - domain: example.com
    file: /etc/knot/zones/example.com.zone
    notify:
      - secondary-ns
    acl:
      - transfer-acl

acl:
  - id: transfer-acl
    address: [2001:db8:1::53]   # IPv6 secondary
    action: transfer

remote:
  - id: secondary-ns
    address: 2001:db8:1::53@53
```

```dns-zone
; /etc/knot/zones/example.com.zone
$TTL 3600
@   IN  SOA ns1.example.com. admin.example.com. (
            2026031901 3600 900 604800 300 )

@       IN  NS      ns1.example.com.
@       IN  NS      ns2.example.com.

ns1     IN  A       203.0.113.1
ns1     IN  AAAA    2001:db8::1

ns2     IN  A       203.0.113.2
ns2     IN  AAAA    2001:db8::2

@       IN  A       203.0.113.10
@       IN  AAAA    2001:db8::10

www     IN  A       203.0.113.10
www     IN  AAAA    2001:db8::10

mail    IN  AAAA    2001:db8::20
@       IN  MX 10   mail.example.com.
```

## Step 3: Online DNSSEC Signing

```yaml
# /etc/knot/knot.conf

policy:
  - id: default-policy
    algorithm: ECDSAP256SHA256
    ksk-lifetime: 365d
    zsk-lifetime: 90d
    nsec3: on

zone:
  - domain: example.com
    dnssec-signing: on
    dnssec-policy: default-policy
    file: /etc/knot/zones/example.com.zone
```

```bash
# Initialize DNSSEC keys
knotc zone-keys-load example.com

# Check DS records for submission to registrar
knotc zone-status example.com
```

## Step 4: Validate and Reload

```bash
# Check configuration
knotc conf-check

# Reload configuration
systemctl start knot
knotc reload

# List zones
knotc zone-status

# Test AAAA over IPv6
dig AAAA www.example.com @2001:db8::1 -6

# Check DNSSEC
dig +dnssec AAAA www.example.com @2001:db8::1
```

## Step 5: Statistics

```bash
# Enable statistics module
# /etc/knot/knot.conf
# mod-stats:
#   - id: default

# Query stats
knotc stats
# Output includes:
# server.zone-count: 1
# query.type.AAAA: 42
```

## Conclusion

Knot DNS is configured for IPv6 by adding `:: ` to the `listen` list. Online DNSSEC with ECDSAP256SHA256 is the recommended algorithm for new deployments. IPv6 zone transfers use the same ACL mechanism as IPv4. Monitor Knot DNS query rates and DNSSEC key rollover events with OneUptime.
