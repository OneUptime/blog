# How to Configure IPv6 RA with Multiple Prefixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Router Advertisement, Radvd, Multi-Prefix, SLAAC, Networking

Description: Configure IPv6 Router Advertisements to advertise multiple prefixes from different providers or network segments, enabling multi-homed IPv6 client configurations.

## Introduction

A single router can advertise multiple IPv6 prefixes in its Router Advertisements. This is common in multi-homed environments (dual ISP), during network renumbering, or when you want clients to have addresses from multiple prefix allocations for different traffic policies.

## Why Advertise Multiple Prefixes

- **Dual ISP / Multi-homing**: Clients get addresses from each ISP, and source address selection rules (RFC 6724) help choose an appropriate source address for outbound connections
- **Network renumbering**: Old and new prefixes are advertised simultaneously during the transition
- **VPN split-tunneling**: Different prefixes for internal vs. external traffic
- **Provider Independent + Provider Assigned**: Clients have both a PI and PA address

## Basic Multiple Prefix Configuration in radvd

```text
# /etc/radvd.conf

# Advertise two prefixes on the same interface

interface eth1 {
    AdvSendAdvert on;
    AdvManagedFlag off;
    AdvOtherConfigFlag off;
    MinRtrAdvInterval 30;
    MaxRtrAdvInterval 100;

    # Primary prefix - from ISP 1
    prefix 2001:db8:1:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };

    # Secondary prefix - from ISP 2
    prefix 2001:db8:2:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };
};
```

After this configuration, each client will autoconfigure at least one global IPv6 address from each prefix.

## Adding Route Information for Multi-Homing

If clients need more-specific routes to off-link IPv6 prefixes reachable through this router, advertise route information options. These options complement router selection, but they do not by themselves control return traffic:

```text
interface eth1 {
    AdvSendAdvert on;

    prefix 2001:db8:1:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };

    prefix 2001:db8:2:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };

    # Remote network reachable via ISP1 uplink
    route 2001:db8:100::/48 {
        AdvRouteLifetime 1800;
        AdvRoutePreference high;
    };

    # Remote network reachable via ISP2 uplink
    route 2001:db8:200::/48 {
        AdvRouteLifetime 1800;
        AdvRoutePreference high;
    };
};
```

## Network Renumbering with Multiple Prefixes

When transitioning from an old prefix to a new one:

```text
interface eth1 {
    AdvSendAdvert on;

    # New prefix - fully preferred
    prefix 2001:db8:20:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };

    # Old prefix - being phased out
    # Set preferred lifetime to 0 so hosts deprecate it for new connections
    prefix 2001:db8:10:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 7200;    # Existing clients keep it valid for up to 2 more hours
        AdvPreferredLifetime 0;   # Deprecated immediately for new connections
    };
};
```

## Cisco IOS Multi-Prefix RA

```text
! Advertise multiple prefixes on Cisco IOS
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 address 2001:db8:1:1::1/64
Router(config-if)# ipv6 address 2001:db8:2:1::1/64
Router(config-if)# ipv6 nd prefix 2001:db8:1:1::/64 86400 14400
Router(config-if)# ipv6 nd prefix 2001:db8:2:1::/64 86400 14400
```

## Verifying Multiple Addresses on Clients

```bash
# On a client that received the multi-prefix RA
ip -6 addr show scope global

# Example output (exact flags and number of addresses vary by OS and privacy settings):
# inet6 2001:db8:1:1:1234:5678:9abc:def0/64 scope global dynamic
# inet6 2001:db8:2:1:abcd:ef01:2345:6789/64 scope global dynamic
```

## Source Address Selection with Multiple Prefixes

Linux uses RFC 6724 rules to select the source address for outbound connections:

```bash
# Check which source address is selected for a specific destination
ip -6 route get 2001:db8:1::1
# Expected: 2001:db8:1::1 ... src 2001:db8:1:1::yyy

# For ISP2 destination:
ip -6 route get 2001:db8:2::1
# Expected: src 2001:db8:2:1::yyy
```

## Conclusion

Advertising multiple IPv6 prefixes via Router Advertisements is a standard technique for multi-homed environments and network renumbering. Clients automatically configure addresses from all advertised prefixes and use RFC 6724 source address selection to choose an appropriate source for each destination. Combine multiple prefix advertisements with correct upstream routing and, where needed, route information options or router preferences.
