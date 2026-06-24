# How to Configure AAAA Records in Unbound

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Unbound, AAAA Records, DNS Configuration

Description: Learn how to serve AAAA records from Unbound as a local authoritative or stub resolver, enabling IPv6 hostname resolution for internal services.

## Unbound as a Recursive Resolver vs Local Zones and Stub Zones

Unbound is primarily a recursive/caching resolver - it doesn't serve authoritative zones by default. However, you can configure it to:

1. **Serve local data**: Act as local authoritative for internal hostnames
2. **Override upstream responses**: Force specific AAAA responses for development
3. **Use stub zones**: Send queries for specific zones directly to an authoritative server

## Method 1: Adding Local AAAA Records with local-data

The simplest way to serve AAAA records from Unbound is using `local-data` directives in `unbound.conf`:

```conf
# /etc/unbound/unbound.conf

server:
    # Interface and port settings
    interface: 0.0.0.0
    interface: ::0
    port: 53

    # Access control
    access-control: 192.168.0.0/16 allow
    access-control: 2001:db8::/32 allow

    # Local domain
    local-zone: "internal.example.com." static

    # IPv4 A records
    local-data: "web.internal.example.com. 3600 IN A 192.168.1.10"
    local-data: "mail.internal.example.com. 3600 IN A 192.168.1.20"
    local-data: "api.internal.example.com. 3600 IN A 192.168.1.30"

    # IPv6 AAAA records - add alongside A records
    local-data: "web.internal.example.com. 3600 IN AAAA 2001:db8::10"
    local-data: "mail.internal.example.com. 3600 IN AAAA 2001:db8::20"
    local-data: "api.internal.example.com. 3600 IN AAAA 2001:db8::30"

    # PTR records for IPv6 reverse lookup
    local-data-ptr: "2001:db8::10 web.internal.example.com"
    local-data-ptr: "2001:db8::20 mail.internal.example.com"
```

## Method 2: Including a Local Data File

For larger deployments, keep local records in a separate file:

```bash
# Create the local data file

cat > /etc/unbound/local-records.conf << 'EOF'
# Local A and AAAA records

local-data: "server1.corp.example.com. 3600 IN A 10.0.1.1"
local-data: "server1.corp.example.com. 3600 IN AAAA 2001:db8:100::1"

local-data: "server2.corp.example.com. 3600 IN A 10.0.1.2"
local-data: "server2.corp.example.com. 3600 IN AAAA 2001:db8:100::2"

local-data: "gateway.corp.example.com. 3600 IN A 10.0.1.254"
local-data: "gateway.corp.example.com. 3600 IN AAAA 2001:db8:100::254"
EOF
```

Include this file in `unbound.conf`:

```conf
# /etc/unbound/unbound.conf
server:
    # Include local records from separate file
    include: /etc/unbound/local-records.conf
```

## Method 3: Stub Zone Queries to an Authoritative Server

If you have an authoritative DNS server (BIND, PowerDNS) with AAAA records, configure a stub zone so Unbound queries it directly:

```conf
# /etc/unbound/unbound.conf

# Send internal zone queries directly to the authoritative server
stub-zone:
    name: "internal.example.com."
    stub-addr: 192.168.1.53  # authoritative server IPv4
    stub-addr: 2001:db8::53  # authoritative server IPv6
    stub-prime: no
```

## Applying Configuration Changes

```bash
# Check configuration syntax
unbound-checkconf /etc/unbound/unbound.conf

# Reload Unbound to apply changes
systemctl reload unbound
# or, if remote control is enabled:
unbound-control reload

# View current status
systemctl status unbound
```

## Testing AAAA Record Responses

```bash
# Query Unbound for the local AAAA record
dig AAAA web.internal.example.com @127.0.0.1

# Expected output:
# web.internal.example.com. 3600 IN AAAA 2001:db8::10

# Verify both A and AAAA are returned
dig A web.internal.example.com @127.0.0.1
dig AAAA web.internal.example.com @127.0.0.1

# Test from a client host
dig AAAA web.internal.example.com @192.168.1.1
```

## Suppressing AAAA Records (When Needed)

If you only want an IPv4 answer for a local hostname, publish only an A record for that name. When the hostname exists in local data, AAAA queries for the same hostname return NODATA rather than NXDOMAIN:

```conf
# Publish only an A record for the legacy host
local-data: "legacy-server.internal.example.com. 60 IN A 10.0.1.100"
# No AAAA record for this name = NOERROR / NODATA for AAAA queries
```

## Summary

Unbound serves local AAAA records via `local-data` directives in `unbound.conf` or in included files. For large deployments, keep records in a separate include file. For zones hosted on external authoritative servers, use `stub-zone` to query them directly. After any configuration change, validate with `unbound-checkconf` and reload with `systemctl reload unbound` or `unbound-control reload` if remote control is enabled.
