# How to Configure BGP IPv6 on Linux with BIRD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, BIRD, Linux, Routing

Description: Learn how to configure BGP IPv6 routing on Linux using the BIRD routing daemon with eBGP and iBGP setup examples.

## Overview

BIRD2 (version 2.x) provides a unified configuration for BGP IPv6. It is lightweight, widely used in IXP and hosting environments, and supports BGP features including communities and filtering.

## Basic eBGP IPv6 Configuration

```bash
# /etc/bird/bird.conf

router id 1.1.1.1;
log syslog all;

protocol device { scan time 10; }
protocol direct { ipv6; }

protocol kernel {
    ipv6 {
        export all;
        import all;
    };
}

# BGP eBGP peer

protocol bgp EBGP_PEER {
    local 2001:db8:0:1::1 as 65001;
    neighbor 2001:db8:0:1::2 as 65002;
    ipv6 {
        import all;
        export where proto = "static_v6";
    };
}

# Static route to advertise via BGP
protocol static static_v6 {
    ipv6;
    route 2001:db8:1::/48 blackhole;  # Null route to originate prefix
}
```

## eBGP over Link-Local Address

```bash
# Peer using link-local address (interface must be specified)
protocol bgp EBGP_LL {
    local as 65001;
    neighbor fe80::2%eth0 as 65002;  # % specifies interface
    ipv6 {
        import all;
        export where proto = "static_v6";
    };
}
```

## iBGP Configuration

```bash
# iBGP with next-hop-self
protocol bgp IBGP_PEER {
    local 2001:db8::1 as 65001;
    neighbor 2001:db8::2 as 65001;
    ipv6 {
        next hop self;    # Replace external next hop for iBGP
        import all;
        export all;
    };
}
```

## Filtering with Prefix Sets (BIRD filter language)

```python
# Define a filter for inbound routes from peer
filter ACCEPT_PEER_ROUTES {
    # Accept only specific prefixes from the peer
    if net ~ [ 2001:db8:200::/48{48,64} ] then accept;
    reject;
}

filter EXPORT_OWN_ROUTES {
    # Export only our own prefix
    if net = 2001:db8:1::/48 then accept;
    reject;
}

protocol bgp EBGP_PEER {
    local 2001:db8:0:1::1 as 65001;
    neighbor 2001:db8:0:1::2 as 65002;
    ipv6 {
        import filter ACCEPT_PEER_ROUTES;
        export filter EXPORT_OWN_ROUTES;
    };
}
```

## Adding BGP Communities

```text
# Set a community on exported routes
filter EXPORT_WITH_COMMUNITY {
    if net = 2001:db8:1::/48 then {
        bgp_community.add((65001, 100));
        accept;
    }
    reject;
}
```

## Starting and Reloading BIRD

```bash
sudo systemctl enable --now bird

# Reload configuration
sudo birdc configure

# Check for syntax errors
sudo bird -p -c /etc/bird/bird.conf
```

## Verification with birdc

```bash
sudo birdc

# Show BGP session summary
show protocols all EBGP_PEER

# Show accepted routes received from a peer
show route protocol EBGP_PEER

# Show advertised routes to a peer
show route export EBGP_PEER

# Show specific route
show route 2001:db8:200::/48
```

## Summary

BIRD2 BGP IPv6 uses the `protocol bgp` block with `ipv6 { import ...; export ...; }`. Use `fe80::<addr>%<iface>` notation for link-local peers, `next hop self` inside the `ipv6 {}` channel for iBGP, and BIRD's filter language for prefix-based filtering. Reload configuration with `birdc configure` and verify with `show protocols all`.
