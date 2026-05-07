# How to Avoid Adding AAAA Records When the Server Has No IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, AAAA Records, Troubleshooting, Best Practice

Description: Learn why adding AAAA records for servers without real IPv6 connectivity causes connection failures and how to safely test before publishing AAAA records.

## The Problem: Premature AAAA Records

A common mistake during IPv6 deployment is adding AAAA records to DNS before the server actually has working IPv6 connectivity. When a client receives a AAAA record and tries to connect, it experiences a connection timeout or failure before falling back to IPv4 - leading to noticeable delays for users.

This is particularly painful because:
- **Modern clients often prefer IPv6**: When AAAA records exist, dual-stack clients commonly try IPv6 first
- **Happy Eyeballs has a delay**: RFC 8305 recommends a 250ms default delay before the next connection attempt
- **Some clients don't fall back**: Certain applications don't implement Happy Eyeballs correctly

## Why a Server Might Have a AAAA Record But No Working IPv6

1. **AAAA record added before IPv6 was configured on the server**
2. **IPv6 configured but no default route** - the server has an IPv6 address but can't route traffic
3. **Firewall blocks IPv6** - packets are silently dropped
4. **IPv6 on wrong interface** - IPv6 bound to loopback or wrong NIC
5. **Service not listening on IPv6** - nginx/Apache only listening on `0.0.0.0` not `::`

## Checking Before Adding AAAA Records

Run these checks on the server BEFORE adding a AAAA record:

```bash
# 1. Verify the server has a routable IPv6 address (not just link-local)

ip -6 addr show scope global
# Should show your 2001:db8:... or similar global address

# 2. Verify there is a default IPv6 route
ip -6 route show default
# Should show: default via <gateway> dev eth0 ...

# 3. Test outbound IPv6 connectivity from the server
ping -6 -c 3 2001:4860:4860::8888
# If this fails, IPv6 routing is broken - do NOT add AAAA yet

# 4. Test that the service is listening on IPv6
# Replace 80 with your actual port
ss -6 -tlnp | grep :80
# Should show: LISTEN 0 128 [::]:80 ...

# 5. Test inbound IPv6 connectivity from an external host
# From another machine with IPv6:
curl -6 http://[2001:db8::1]/
```

## Testing with a Pre-Publication Check

Before adding the AAAA to public DNS, test with a local `/etc/hosts` override:

```bash
# On a test client, add the AAAA record to /etc/hosts temporarily
printf '2001:db8::1 www.example.com\n' | sudo tee -a /etc/hosts >/dev/null

# Test the connection over IPv6
curl -6 http://www.example.com/
wget -6 http://www.example.com/

# If successful, it's safe to add the AAAA to DNS
# Remove the test entry from /etc/hosts after verification
```

## Diagnosing a Bad AAAA Record in Production

If a AAAA record was already published and is causing issues:

```bash
# From a client: check which address is being used
curl -v http://www.example.com/ 2>&1 | grep "Trying\|Connected"
# If you see IPv6 address followed by timeout: bad AAAA record

# Check if the issue is firewall vs service not listening
# From outside, attempt TCP connect to the IPv6 address
nc -6 -v -w 5 2001:db8::1 80
# "Connection refused" = service not listening on IPv6
# Timeout = firewall blocking or routing issue

# From the server: test if the service binds to IPv6
ss -6 -tlnp | grep ':80\|:443'
```

## Immediate Fix: Remove the Bad AAAA Record

If a AAAA record is causing failures and IPv6 isn't ready yet:

```bash
# BIND: for a file-backed zone, remove the AAAA record, increment the SOA serial, and reload
# In the zone file: delete the AAAA line for www
rndc reload example.com

# For dynamic BIND zones, use nsupdate or rndc freeze/thaw before editing

# PowerDNS via pdnsutil
pdnsutil rrset delete example.com www.example.com AAAA

# Wait for TTL to expire on resolvers
# Cached answers already served with a TTL generally have to age out

# Verify the record is no longer returned
dig AAAA www.example.com @8.8.8.8
```

## Configuring the Service to Listen on IPv6

For nginx, ensure it listens on IPv6:

```nginx
# nginx.conf - listen on both IPv4 and IPv6
server {
    listen 80;        # IPv4
    listen [::]:80;   # IPv6
    server_name www.example.com;
}
```

For Apache, ensure it is listening on IPv6 as well. On builds that use separate IPv6 sockets, add an explicit IPv6 `Listen` directive:

```apache
# httpd.conf
Listen 80
Listen [::]:80
```

## Safe AAAA Rollout Checklist

Before adding any AAAA record:
- Server has a global (non-link-local) IPv6 address: `ip -6 addr show scope global`
- Default IPv6 route exists: `ip -6 route show default`
- Service listens on `::` or specific IPv6 address: `ss -6 -tlnp`
- Firewall allows IPv6 on service port: `ip6tables -L -n`
- Outbound IPv6 works: `ping -6 2001:4860:4860::8888`
- Inbound IPv6 tested from external host: `curl -6 http://[<IPv6-addr>]/`

## Summary

Only add AAAA records after thoroughly verifying IPv6 connectivity end-to-end: the server has a routable IPv6 address, has a default IPv6 route, the service listens on IPv6, and firewalls allow IPv6 traffic. Use temporary `/etc/hosts` overrides to test before publishing to public DNS. Premature AAAA records cause connection delays and user-visible failures.
