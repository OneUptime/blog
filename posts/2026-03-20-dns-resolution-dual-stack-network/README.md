# How to Handle DNS Resolution in a Dual-Stack Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, IPv6, IPv4, Dual-Stack, Networking

Description: Learn how DNS resolution works in dual-stack IPv4/IPv6 environments and how to configure resolvers and clients to correctly prefer IPv6 where available.

## DNS in a Dual-Stack World

In a dual-stack network, DNS must return both A records (IPv4) and AAAA records (IPv6) for hosts that support both protocols. The client typically receives an ordered address list based on OS policy, and many applications then use Happy Eyeballs when attempting connections.

Understanding how this selection happens-and how to influence it-is key to stable dual-stack operation.

## Step 1: Verify Your DNS Server Returns AAAA Records

Use `dig` to confirm that DNS resolution returns AAAA records:

```bash
# Query for IPv6 address records

dig AAAA www.example.com

# Query both A and AAAA in one shot
dig www.example.com A www.example.com AAAA
```

If no AAAA record is returned for a host you expect to be dual-stack, update your DNS zone or the host's registration.

## Step 2: Configure BIND to Serve Both A and AAAA Records

In a BIND zone file, add both record types for dual-stack hosts:

```bash
; Zone file excerpt for example.com
; Dual-stack server with both IPv4 and IPv6
webserver    IN  A      203.0.113.10
webserver    IN  AAAA   2001:db8::10

; Mail server - IPv4 only (no AAAA intentional)
mail         IN  A      203.0.113.20
```

BIND listens on both IPv4 and IPv6 by default unless you restrict it. If you want to make that explicit in an `options` block:

```bash
# In an options block, allow queries over both protocols
options {
    listen-on     { any; };      # IPv4
    listen-on-v6  { any; };      # IPv6
};
```

## Step 3: Understand Address Selection on Linux

On glibc-based Linux systems, `/etc/gai.conf` can override the default `getaddrinfo()` sorting policy. By default, IPv6 destinations have higher precedence than IPv4-mapped addresses:

```bash
# View current address selection policy table
cat /etc/gai.conf

# The default precedence table gives IPv6 (::/0) a higher precedence than
# IPv4-mapped addresses (::ffff:0:0/96)
# To prefer IPv4, uncomment the default precedence table and change the
# ::ffff:0:0/96 entry to:
# precedence ::ffff:0:0/96  100
```

Modify this file carefully-changes affect all applications on the host.

## Step 4: Test DNS Resolution Behaviour

Use `getent` to see the resolved addresses in `getaddrinfo()` order on this host:

```bash
# Shows the address order returned by getaddrinfo() on this host
getent ahosts www.example.com

# Example output:
# 2001:db8::10     STREAM www.example.com
# 2001:db8::10     DGRAM
# 2001:db8::10     RAW
# 203.0.113.10     STREAM
# 203.0.113.10     DGRAM
```

The first entry is the first result returned by `getaddrinfo()`, but applications may still use Happy Eyeballs and try another address family.

## Step 5: Handle DNS64 for IPv6-Only Clients

If you have IPv6-only clients that need to reach IPv4-only servers, use DNS64 combined with NAT64. DNS64 synthesizes AAAA records from A records:

```bash
# In BIND named.conf, enable DNS64 for a specific prefix
options {
    dns64 64:ff9b::/96 {
        clients { any; };
    };
};
```

With this configuration, a query for an IPv4-only host returns a synthesized AAAA record in the `64:ff9b::/96` prefix, and NAT64 translates the packets at the network border.

## Troubleshooting Common Issues

| Problem | Cause | Fix |
|---|---|---|
| IPv6 preferred but unreachable | AAAA exists, no route | Remove AAAA or fix routing |
| Happy Eyeballs often falls back to IPv4 | Slow or failing IPv6 path | Fix IPv6 latency or remove AAAA |
| No AAAA record in response | DNS not configured | Add AAAA records to zone |
| DNS64 not synthesizing | dns64 config missing | Add dns64 block to BIND options |

## Conclusion

Handling DNS in a dual-stack network requires ensuring both A and AAAA records exist for dual-stack hosts, understanding OS address selection policy, and deploying DNS64/NAT64 for IPv6-only segments. Regular testing with `dig` and `getent` helps confirm resolution is working as intended.
