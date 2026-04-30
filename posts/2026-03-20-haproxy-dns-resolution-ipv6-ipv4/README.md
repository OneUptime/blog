# How to Troubleshoot HAProxy DNS Resolution Defaulting to IPv6 Instead of IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, DNS, IPv4, IPv6, Troubleshooting, Resolver, Networking

Description: Learn how to diagnose and fix HAProxy DNS resolution defaulting to IPv6 addresses instead of IPv4, causing connection failures to IPv4-only backends.

---

HAProxy can use DNS to resolve backend server hostnames dynamically. On dual-stack systems, if a backend hostname resolves to both A and AAAA records, HAProxy prefers IPv6 by default and may attempt an IPv6 connection to a backend that only listens on IPv4.

## Symptoms

- HAProxy logs show `Connection refused` or `No route to host` errors.
- The resolved address in HAProxy runtime output is IPv6 even though the backend only listens on IPv4.
- Backends are IPv4-only but hostnames resolve to both A and AAAA records.

## Checking What HAProxy Resolves

```bash
# Check what the system resolver returns for a hostname

getent ahosts backend.internal

# Look in HAProxy runtime for resolved addresses
echo "show servers state" | socat stdio unix-connect:/var/run/haproxy/admin.sock | grep backend
```

## Fix 1: Use IPv4 Literals in the Backend

The simplest fix - bypass DNS entirely by using IP addresses.

```haproxy
backend app_servers
    server app1 10.0.0.1:8080 check
    server app2 10.0.0.2:8080 check
```

## Fix 2: Configure HAProxy to Prefer IPv4 with resolve-prefer

Use a `resolvers` section for DNS lookups and set `resolve-prefer ipv4` on each `server` line to prefer A (IPv4) records when both A and AAAA records are returned.

```haproxy
# /etc/haproxy/haproxy.cfg

resolvers local_dns
    # Use your internal DNS server
    nameserver ns1 192.168.1.53:53

    # DNS retry and cache settings
    resolve_retries 3
    timeout resolve 1s
    timeout retry   1s
    hold valid 10s

backend app_servers
    balance roundrobin

    # Reference the resolver and enable dynamic DNS resolution
    server app1 backend-app1.internal:8080 check resolvers local_dns resolve-prefer ipv4
    server app2 backend-app2.internal:8080 check resolvers local_dns resolve-prefer ipv4
```

The `resolve-prefer ipv4` option on the `server` line tells HAProxy to prefer A records when both A and AAAA are returned.

## Fix 3: Configure the System Resolver to Prefer IPv4

If you're using the system resolver through libc-based lookups, edit `/etc/gai.conf` to globally prefer IPv4 on the host:

```bash
# /etc/gai.conf
# Comment out or add this line to prefer IPv4
precedence ::ffff:0:0/96  100
```

This affects applications that use the system resolver via `getaddrinfo(3)`, not HAProxy's internal DNS resolver in a `resolvers` section. Also note that adding a `precedence` rule overrides the default precedence table in `gai.conf`, so review the rest of the file before using it as a system-wide fix.

## Fix 4: Return Only A Records from DNS

If you control the DNS server, return only A records for internal hostnames:

```bash
# Example: BIND zone file entry - no AAAA record for backend
backend-app1.internal.  IN  A  10.0.0.1
```

## Verifying the Fix

```bash
# Confirm HAProxy resolves to an IPv4 address
echo "show servers state" | socat stdio unix-connect:/var/run/haproxy/admin.sock

# Test direct connection to the backend IPv4 address
curl -4 http://10.0.0.1:8080/health

# Reload HAProxy after config changes
systemctl reload haproxy
```

## Key Takeaways

- Use IP addresses instead of hostnames in HAProxy backends when DNS is unreliable.
- Use `resolve-prefer ipv4` on `server` lines with a `resolvers` block.
- Edit `/etc/gai.conf` only when you need libc-based, system-wide IPv4 preference on the host.
- Always verify resolved addresses via `show servers state` on the HAProxy admin socket.
