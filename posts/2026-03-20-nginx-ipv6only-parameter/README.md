# How to Use the ipv6only Parameter in Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Nginx, Ipv6only, Web Server, Dual-Stack

Description: A detailed explanation of the Nginx ipv6only listen parameter - what it does, when to use it, and how it interacts with the Linux kernel's bindv6only sysctl.

## What is ipv6only?

The `ipv6only` parameter on a `listen [::]:PORT` directive controls whether the socket accepts only IPv6 connections or also IPv4-mapped IPv6 connections (which allow one socket to handle both protocols). Since nginx 1.3.4, `ipv6only=on` is the default:

```nginx
# ipv6only=on: only accept pure IPv6 connections (default since nginx 1.3.4)

listen [::]:80 ipv6only=on;

# ipv6only=off: accept both IPv6 and IPv4-mapped IPv6
listen [::]:80 ipv6only=off;

# When ipv6only=off, a single listen [::]:80 handles BOTH
# IPv4 (as ::ffff:192.168.1.1) and IPv6 connections
```

## The Linux bindv6only Kernel Setting

```bash
# Check the system-wide default
cat /proc/sys/net/ipv6/bindv6only

# 0 = IPv6 sockets can receive IPv4 connections (IPv4-mapped) - Linux default
# 1 = IPv6 sockets are IPv6-only

# Note: bindv6only is the kernel default for sockets that don't explicitly
# set IPV6_V6ONLY. Nginx always sets this option per-socket via the ipv6only
# parameter (default `on` since 1.3.4), so it overrides the kernel default.
sysctl net.ipv6.bindv6only

# Change system default
sysctl -w net.ipv6.bindv6only=1

# Persist
echo 'net.ipv6.bindv6only=1' >> /etc/sysctl.d/60-nginx-ipv6.conf
```

## ipv6only=on (Recommended for Dual-Stack)

```nginx
server {
    # Explicit dual-stack: separate sockets for each version
    listen 0.0.0.0:80;        # IPv4 only
    listen [::]:80 ipv6only=on;  # IPv6 only

    server_name example.com;
}
```

Benefits:
- Clear separation of IPv4 and IPv6 traffic
- No ambiguity in $remote_addr (real IP, not IPv4-mapped)
- Avoids "already in use" errors
- Works consistently across different OS settings

## ipv6only=off (IPv4+IPv6 on Single Socket)

```nginx
server {
    # Single socket handles both IPv4 and IPv6
    listen [::]:80 ipv6only=off;
    # Note: Do NOT also add listen 80; - it would conflict

    server_name example.com;
}
```

When using `ipv6only=off`:
- IPv4 clients appear in logs as `::ffff:192.168.1.1` (IPv4-mapped)
- Cannot also use a separate `listen 0.0.0.0:80`
- Must be set explicitly, since `ipv6only=on` is the default in nginx 1.3.4+

## Common Error with ipv6only

```nginx
# In nginx pre-1.3.4, or when ipv6only=off is set explicitly with bindv6only=0,
# this causes "Address already in use":
server {
    listen 80;                  # Binds to 0.0.0.0:80
    listen [::]:80 ipv6only=off; # Also binds to *:80 (overlaps with 0.0.0.0)

    server_name example.com;
}

# Fix: Use ipv6only=on (the default since nginx 1.3.4)
server {
    listen 80;
    listen [::]:80 ipv6only=on;
}
```

```bash
# Check for the error in nginx logs
nginx -t 2>&1 | grep -i 'already in use\|bind'
# nginx: [emerg] bind() to [::]:80 failed (98: Address already in use)
```

## When to Use Each Value

| Scenario | Recommended Setting |
|----------|---------------------|
| Dual-stack (separate IPv4/IPv6) | `ipv6only=on` (default) |
| IPv6-only server | `ipv6only=on` (no IPv4 listen) |
| Single-socket both versions | `ipv6only=off` (must be explicit) |

## Summary

The `ipv6only` parameter controls whether a `listen [::]:PORT` socket accepts only IPv6 or also IPv4-mapped connections. Use `ipv6only=on` for explicit dual-stack (with a separate `listen 0.0.0.0:PORT` for IPv4) - this is the recommended approach and the default since nginx 1.3.4. Nginx sets the `IPV6_V6ONLY` socket option explicitly per-socket, so it overrides the kernel-level `net.ipv6.bindv6only` sysctl default.
