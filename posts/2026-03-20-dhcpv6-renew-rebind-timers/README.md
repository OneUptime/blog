# How to Understand DHCPv6 Renew and Rebind Timers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Networking, DHCP, Address Management

Description: A practical guide to understanding how DHCPv6 T1 and T2 timers control the address renewal and rebind lifecycle for IPv6 clients.

## Overview

DHCPv6 uses two timers - **T1 (Renew)** and **T2 (Rebind)** - to manage the lifecycle of leased addresses and prefixes. Understanding these timers is critical for maintaining stable IPv6 connectivity and avoiding address expiration.

## The DHCPv6 Lease Lifecycle

When a DHCPv6 client receives an address or prefix, the server includes timing information inside an **IA (Identity Association)**. The lifecycle follows this flow:

```mermaid
sequenceDiagram
    participant Client
    participant Server1 as Primary DHCPv6 Server
    participant Server2 as Any DHCPv6 Server

    Client->>Server1: Solicit
    Server1->>Client: Advertise (T1, T2, Valid Lifetime, Preferred Lifetime)
    Client->>Server1: Request
    Server1->>Client: Reply (lease granted)
    Note over Client: Wait until T1 expires
    Client->>Server1: Renew
    Server1->>Client: Reply (lease extended)
    Note over Client: If no reply, wait until T2 expires
    Client->>Server2: Rebind (multicast ff02::1:2)
    Server2->>Client: Reply (lease extended by any server)
```

Under current DHCPv6 rules in RFC 9915, clients send DHCPv6 messages to `ff02::1:2`; Renew is still tied to the original server by the Server Identifier option, while Rebind can be answered by any available server.

## Timer Definitions

| Timer | Typical Recommendation | Purpose |
|-------|---------|---------|
| **T1** | Server-selected; often 0.5 × shortest preferred lifetime | Time after which client sends Renew to the original server |
| **T2** | Server-selected; often 0.8 × shortest preferred lifetime | Time after which client sends Rebind to any server |
| **Preferred Lifetime** | - | After this, address becomes deprecated (still usable but new connections avoided) |
| **Valid Lifetime** | - | After this, address is fully expired and removed |

## Viewing Lifetimes and Lease Timers on Linux

The `ip` command shows IPv6 address lifetimes. T1 and T2 are tracked by the DHCPv6 client rather than exposed by `ip` itself.

```bash
# Show IPv6 address details including preferred and valid lifetimes

ip -6 addr show dev eth0

# Example output:
# inet6 2001:db8::1/64 scope global dynamic
#    valid_lft 3600sec preferred_lft 1800sec
```

If you're using ISC `dhclient`, inspect its lease file. The exact path depends on the distribution and the `-lf` setting:

```bash
# Example lease file path on some systems
cat /var/lib/dhclient/dhclient6.leases

# Fields of interest:
# renew <date>;   -> When the client will send Renew
# rebind <date>;  -> When the client will send Rebind
# expire <date>;  -> When the lease fully expires
```

## Configuring T1 and T2 on ISC DHCP Server

On the server side, you can explicitly set T1 and T2 per subnet or globally:

```bash
# /etc/dhcp/dhcpd6.conf

# Global defaults
default-lease-time 3600;       # Valid lifetime = 3600s
preferred-lifetime 2700;       # Preferred lifetime = 2700s

subnet6 2001:db8::/64 {
    range6 2001:db8::100 2001:db8::200;

    # T1: 1350s (50% of the 2700s preferred lifetime)
    # T2: 2160s (80% of the 2700s preferred lifetime)
    option dhcp-renewal-time 1350;
    option dhcp-rebinding-time 2160;
}
```

## What Happens When T2 Expires Without Reply

If neither the original server nor any other server responds before the valid lifetime expires, the client must stop using the address or prefix. If it still needs configuration, it then starts a new SARR (Solicit-Advertise-Request-Reply) exchange to obtain fresh addresses or prefixes.

## Best Practices

- **Set T1 to about 50% of the shortest preferred lifetime** - This is the RFC 9915 recommendation and provides ample time for renewal before expiry.
- **Set T2 to about 80% of the shortest preferred lifetime** - Gives the client a window to try any available server before the lease expires.
- **Keep valid lifetime longer than preferred lifetime** - This allows for graceful deprecation without abrupt disconnection.
- **Monitor renewal failures** - If clients are consistently hitting T2 before renewing, your primary DHCPv6 server may be unreachable or overloaded.

## Summary

DHCPv6 T1 and T2 timers provide a two-stage safety net for lease renewal. T1 initiates renewal with the original server, and T2 triggers a rebind that can be answered by any available server. Proper timer configuration ensures address stability and smooth failover behavior in production IPv6 networks.
