# How to Configure PowerDNS to Listen on IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, PowerDNS, Network Configuration, DNS Server

Description: A guide to configuring PowerDNS Authoritative Server and Recursor to listen on IPv6 addresses for serving DNS queries from IPv6 clients.

## PowerDNS Components

PowerDNS has two separate daemons:
- **pdns** (Authoritative Server): Serves authoritative DNS zones
- **pdns_recursor**: Recursive resolver for client queries

Both need separate IPv6 configuration.

## Configuring PowerDNS Authoritative Server for IPv6

Edit `/etc/powerdns/pdns.conf`:

```ini
# /etc/powerdns/pdns.conf

# Listen on all IPv4 and IPv6 addresses

# Format: address:port or just address
local-address=0.0.0.0, ::

# Or listen on specific addresses
# local-address=203.0.113.1, 2001:db8::1

# Port (default 53)
local-port=53

# Allow AXFR (zone transfer) to secondary servers including IPv6
allow-axfr-ips=2001:db8::2, 192.0.2.0/24

# Allow DNS notify from primaries
allow-notify-from=2001:db8::1, 192.0.2.0/24
```

## Configuring PowerDNS Recursor for IPv6

Edit `/etc/powerdns/recursor.conf`:

```ini
# /etc/powerdns/recursor.conf

# Listen on all interfaces including IPv6
local-address=0.0.0.0, ::

# Allow queries from IPv6 clients
allow-from=127.0.0.0/8, ::1/128, 192.168.0.0/16, 10.0.0.0/8, 2001:db8::/32, fd00::/8

# Use IPv4 and IPv6 for outbound queries to authoritative servers
# Since Recursor 4.4, query-local-address accepts both IPv4 and IPv6
# (the legacy query-local-address6 setting is deprecated)
query-local-address=0.0.0.0, ::

# Enable IPv6 for recursive queries
# (enabled by default in recent versions, but explicit is safer)
```

## Applying Configuration Changes

```bash
# Check pdns configuration syntax
pdns_server --config=check
# or for Recursor (requires Recursor 4.8.0+)
pdns_recursor --config=check

# Restart PowerDNS Authoritative Server
systemctl restart pdns

# Restart PowerDNS Recursor
systemctl restart pdns-recursor

# Verify PowerDNS is listening on IPv6
ss -6 -tlnp | grep pdns
# Expected:
# LISTEN  0  128  [::]:53  ...  users:(("pdns_server", ...))
```

## Verifying IPv6 Listening

```bash
# Check all DNS listeners
ss -tlnp | grep ':53'

# Specifically check IPv6
ss -6 -tlnp | grep ':53'

# Check using netstat (if available)
netstat -6 -tlnp | grep ':53'

# Test querying PowerDNS over IPv6
dig SOA example.com @::1
dig SOA example.com @2001:db8::1
```

## Firewall Configuration for IPv6 DNS

```bash
# Allow DNS queries over IPv6
ip6tables -A INPUT -p udp --dport 53 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 53 -j ACCEPT

# Allow DNS responses from upstream resolvers (for Recursor)
ip6tables -A INPUT -p udp --sport 53 -j ACCEPT
ip6tables -A INPUT -p tcp --sport 53 -j ACCEPT

# Save rules (path used by iptables-persistent on Debian/Ubuntu)
ip6tables-save > /etc/iptables/rules.v6
```

## Monitoring IPv6 Queries in PowerDNS

PowerDNS provides built-in statistics accessible via the API:

```bash
# Check statistics with pdns_control (Authoritative)
pdns_control show '*' | grep -i ipv6

# For Recursor
rec_control get-all | grep -E 'v6|ipv6'

# Via the HTTP API (PowerDNS 4.x+)
# Enable API in pdns.conf: api=yes, api-key=secret, webserver=yes
curl -H "X-API-Key: secret" http://127.0.0.1:8081/api/v1/servers/localhost/statistics |
    python3 -m json.tool | grep -i v6
```

## Using the PowerDNS API to Verify IPv6 Queries

```bash
# Query specific statistics
curl -s -H "X-API-Key: your-key" \
    http://127.0.0.1:8081/api/v1/servers/localhost/statistics |
    python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data:
    if 'v6' in item['name'].lower() or 'ipv6' in item['name'].lower():
        print(f\"{item['name']}: {item['value']}\")
"
```

## Troubleshooting IPv6 Listening Issues

**Issue**: PowerDNS won't start after adding `::` to `local-address`
```bash
# Check if IPv6 is enabled on the system
sysctl net.ipv6.conf.all.disable_ipv6
# If 1, IPv6 is disabled - enable it first:
sysctl -w net.ipv6.conf.all.disable_ipv6=0

# Check logs for binding errors
journalctl -u pdns | grep -E 'error|bind'
```

**Issue**: Recursor accepts queries from IPv4 but not IPv6
```bash
# Check allow-from includes IPv6 ranges
grep allow-from /etc/powerdns/recursor.conf
# Must include ::1/128 for localhost and your IPv6 client subnets
```

## Summary

Configure PowerDNS to listen on IPv6 by adding `::` to `local-address` in `pdns.conf` (Authoritative) or `recursor.conf` (Recursor), updating `allow-from` to include IPv6 subnets, and restarting the service. Verify with `ss -6 -tlnp | grep pdns` and test with `dig @::1`. Ensure firewall rules allow IPv6 traffic on port 53.
