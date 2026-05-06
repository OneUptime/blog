# How to Configure BIND to Listen on IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, BIND, Network Configuration, Named

Description: Learn how to configure BIND (named) to accept DNS queries over IPv6 by setting the listen-on-v6 directive and verifying IPv6 connectivity.

## Default BIND Behavior

On current BIND releases, `named` listens for standard DNS queries on port 53 of all IPv6 interfaces by default. On BIND versions prior to 9.10, you must explicitly configure `listen-on-v6 { any; };` to accept DNS queries from IPv6 clients.

## Configuring listen-on-v6

Edit `/etc/named.conf` or `/etc/bind/named.conf.options` and add or modify the `listen-on-v6` directive if you want to make IPv6 listening explicit or restrict it to specific addresses:

```named
// /etc/named.conf or /etc/bind/named.conf.options

options {
    // Listen on all IPv4 addresses (default)
    listen-on { any; };

    // Listen on all IPv6 addresses
    listen-on-v6 { any; };

    // Or listen on specific IPv6 addresses only
    // listen-on-v6 { 2001:db8::53; ::1; };

    // Allow queries from IPv6 clients
    allow-query { 192.168.0.0/16; 2001:db8::/32; ::1; };

    // Allow recursion from trusted networks (including IPv6)
    allow-recursion { 192.168.0.0/16; 2001:db8::/32; };
};
```

## Listening on Specific IPv6 Addresses

For a server with multiple IPv6 addresses, you can restrict BIND to specific ones:

```named
options {
    // Only listen on specific addresses
    listen-on { 203.0.113.1; 127.0.0.1; };
    listen-on-v6 { 2001:db8::1; ::1; };

    // If you want to listen on ALL interfaces (including any future ones)
    // listen-on { any; };
    // listen-on-v6 { any; };
};
```

## Verifying IPv6 is Available on the System

Before configuring BIND, ensure the host has a working IPv6 address:

```bash
# Check for global IPv6 addresses (not just link-local)

ip -6 addr show | grep -E 'inet6.*global'

# Verify IPv6 is not disabled
sysctl net.ipv6.conf.all.disable_ipv6
# Should return: 0 (IPv6 enabled)
```

## Applying Configuration and Checking

```bash
# Validate the BIND configuration syntax
named-checkconf /etc/named.conf
# or
named-checkconf /etc/bind/named.conf

# Apply listen-on-v6 changes
rndc reconfig
# or
rndc reload

# Verify BIND is listening on IPv6
ss -6 -tlnp | grep named
# Expected output:
# LISTEN  0  10  [::]:53  *:*  users:(("named", ...))
# LISTEN  0  10  [::1]:53  *:*  users:(("named", ...))
```

## Allowing Queries from IPv6 Clients

If `allow-query` is restricted, you also need to include the IPv6 client addresses you want to serve:

```named
options {
    listen-on-v6 { any; };

    // Allow queries from any address
    allow-query { any; };

    // Or restrict to specific IPv6 subnets
    allow-query {
        127.0.0.1;          // localhost IPv4
        ::1;                 // localhost IPv6
        192.168.0.0/16;     // RFC 1918
        10.0.0.0/8;         // RFC 1918
        2001:db8::/32;      // your IPv6 prefix
    };
};
```

## Testing IPv6 DNS Queries

```bash
# Test querying BIND over IPv6 from localhost
dig A example.com @::1

# Test from a specific IPv6 address
dig A example.com @2001:db8::53

# Test AAAA record retrieval over IPv6
dig AAAA google.com @::1

# Verify the response comes from an IPv6 address
dig A example.com @::1 +all | grep "SERVER:"
# Expected: SERVER: ::1#53(::1)
```

## Troubleshooting listen-on-v6 Issues

**Issue: BIND refuses to start after adding listen-on-v6**
- Verify IPv6 is enabled on the host: `sysctl net.ipv6.conf.all.disable_ipv6`
- Check BIND logs: `journalctl -u named`

**Issue: IPv6 listen works but queries time out**
- Verify firewall allows UDP/TCP port 53 for IPv6: `ip6tables -L -n | grep 53`
- Add firewall rule if missing:

```bash
# Allow DNS over IPv6
ip6tables -A INPUT -p udp --dport 53 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 53 -j ACCEPT
```

**Issue: BIND listens on IPv6 but not all addresses**
- Ensure the `listen-on-v6` address match list includes the IPv6 addresses you want BIND to bind to, for example `listen-on-v6 { any; };`

## Summary

On current BIND releases, BIND already listens on IPv6 by default. Use `listen-on-v6` when you want to make that explicit or restrict which IPv6 addresses `named` binds to, ensure `allow-query` includes the IPv6 client ranges you want to serve when it is restricted, and apply the change with `rndc reconfig` or `rndc reload`. Verify with `ss -6 -tlnp | grep named` and test with `dig A example.com @::1`.
