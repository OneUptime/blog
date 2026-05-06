# How to Configure AAAA Records in dnsmasq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Dnsmasq, AAAA Records, Small Network

Description: Learn how to add IPv6 AAAA records in dnsmasq for local network name resolution in home labs, small offices, and embedded Linux deployments.

## What Is dnsmasq?

dnsmasq is a lightweight DNS forwarder and DHCP server commonly used in small networks, home labs, and embedded Linux devices (routers, IoT gateways). It supports both A and AAAA records through simple host file-style configuration.

## Method 1: Using /etc/hosts (Simplest)

dnsmasq reads `/etc/hosts` by default. Adding IPv4 and IPv6 entries there serves both A and AAAA records:

```text
# /etc/hosts

# IPv4 entries

192.168.1.10    server1.home.arpa server1
192.168.1.20    server2.home.arpa server2

# IPv6 AAAA entries - add these for IPv6 resolution
2001:db8::10    server1.home.arpa server1
2001:db8::20    server2.home.arpa server2
```

After editing `/etc/hosts`, reload dnsmasq:

```bash
# Reload dnsmasq to pick up /etc/hosts changes
# if your service unit supports reload
systemctl reload dnsmasq
# or send SIGHUP directly
kill -HUP $(cat /var/run/dnsmasq.pid)
```

## Method 2: Using dnsmasq.conf host-record

For dnsmasq-native configuration without editing `/etc/hosts`, use `host-record` in `dnsmasq.conf`. This creates A and/or AAAA records in a single directive:

```ini
# /etc/dnsmasq.conf

# host-record creates A and/or AAAA records simultaneously
# Format: host-record=name[,alias...],[IPv4-address],[IPv6-address]
host-record=server1.home.arpa,192.168.1.10,2001:db8::10
host-record=server2.home.arpa,192.168.1.20,2001:db8::20

# IPv6-only record (no IPv4) - omit the IPv4 address
host-record=ipv6only.home.arpa,,2001:db8::50

# IPv4-only record (no AAAA)
host-record=legacy.home.arpa,192.168.1.100
```

## Method 3: AAAA-Only Records with host-record

dnsmasq does not have a separate `aaaa-record` directive. For AAAA-only records, use `host-record` with just an IPv6 address:

```ini
# /etc/dnsmasq.conf

# Explicit AAAA-only record
host-record=ipv6host.home.arpa,2001:db8::100

# Add AAAA alongside an A record for the same name
host-record=server3.home.arpa,192.168.1.30,2001:db8::30
```

## Method 4: Pointing Hostnames to IPv6 Addresses with address=

The `address=` directive can set IPv6 addresses:

```ini
# Return a specific IPv6 address for AAAA lookups in this domain
address=/api.home.arpa/2001:db8::50

# Wildcard: return IPv6 for any subdomain of internal.example.com
address=/*.internal.example.com/2001:db8::1
```

Note: `address=` is domain-based. Repeat the directive with both IPv4 and IPv6 values if you want both A and AAAA answers for the same name. In dnsmasq 2.86 and later, queries that do not match the configured address family are forwarded upstream unless you also add `local=/domain/`. For per-host A/AAAA/PTR records, use `host-record` or `/etc/hosts` instead.

## Applying Configuration Changes

```bash
# Test the dnsmasq configuration
dnsmasq --test

# Restart dnsmasq to apply changes
systemctl restart dnsmasq

# Check that dnsmasq is running
systemctl status dnsmasq
```

## Verifying AAAA Records

```bash
# Query dnsmasq for AAAA record
dig @127.0.0.1 AAAA server1.home.arpa

# Expected output:
# server1.home.arpa. 0 IN AAAA 2001:db8::10

# Query the A record separately
dig @127.0.0.1 A server1.home.arpa

# Test from a client on the network
nslookup -type=AAAA server1.home.arpa 192.168.1.1
```

## Adding a Dedicated Hosts File for IPv6

For larger deployments, keep IPv6 entries in a dedicated file:

```bash
# Create a dedicated IPv6 hosts file
cat > /etc/dnsmasq-ipv6.hosts << 'EOF'
2001:db8::10 server1.home.arpa
2001:db8::20 server2.home.arpa
2001:db8::30 server3.home.arpa
EOF

# Reference it in dnsmasq.conf
echo "addn-hosts=/etc/dnsmasq-ipv6.hosts" >> /etc/dnsmasq.conf

systemctl restart dnsmasq
```

## Enabling IPv6 Support in dnsmasq

If you restrict what dnsmasq listens on, make sure the IPv6-capable interface or listen address is included:

```ini
# /etc/dnsmasq.conf

# Restrict dnsmasq to a specific interface
interface=eth0

# Or listen on explicit addresses, including IPv6
# listen-address=127.0.0.1,::1

# Optionally bind only to the interfaces configured above
# bind-interfaces
```

## Summary

dnsmasq supports AAAA records through `/etc/hosts` entries, the `host-record` directive (creates A and/or AAAA records), and the `address=` directive. For IPv6-only names, `host-record` can be used with just an IPv6 address. For most small networks, adding IPv6 addresses to `/etc/hosts` alongside IPv4 entries is the simplest approach. Reload dnsmasq after hosts-file changes, restart it after `dnsmasq.conf` changes, and verify with `dig AAAA`.
