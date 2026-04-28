# How to Understand Router Discovery in NDP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Router Discovery, Router Advertisement, IPv6, Default Gateway

Description: Understand how IPv6 hosts discover routers and default gateways using NDP Router Solicitation and Router Advertisement, and manage the default router list.

## Introduction

IPv6 Router Discovery, part of NDP (RFC 4861), allows hosts to automatically discover routers on the local link and maintain a Default Router List. Unlike IPv4 where default gateway configuration is manual or via DHCP, IPv6 hosts use Router Advertisements to dynamically discover and track multiple potential default routers, with automatic failover when a router becomes unavailable.

## Router Discovery Process

```text
Router Discovery Flow:

1. On interface startup: Host sends Router Solicitation to ff02::2
   → Requests immediate RA from any router on the link
   → Avoids waiting up to MaxRtrAdvInterval (default 600s) for periodic RA

2. Router responds with Router Advertisement:
   → Sends to ff02::1 (or unicast reply to RS sender)
   → Includes Router Lifetime, prefixes, MTU, hop limit

3. Host processes RA:
   → Adds router's link-local address to Default Router List
     (lifetime = Router Lifetime field in RA)
   → Updates Prefix List with on-link prefixes
   → Updates MTU and Hop Limit parameters

4. Router sends periodic RAs:
   → Interval: between MinRtrAdvInterval and MaxRtrAdvInterval
   → Refresh the Router Lifetime timer
   → If host doesn't receive RA within Router Lifetime: remove router

5. Router sends RA with Router Lifetime = 0:
   → Signals "I'm no longer a router"
   → Host removes this router from Default Router List immediately
```

## Default Router List Management

```bash
# View the default router list (shown as IPv6 default routes)

ip -6 route show default

# Example with multiple routers:
# default via fe80::1 dev eth0 proto ra metric 100 expires 1790sec
# default via fe80::2 dev eth0 proto ra metric 200 expires 1790sec
# "expires" shows remaining Router Lifetime from RA

# Show detailed route information for default routes
ip -6 route show default detail

# The kernel selects the router with lowest metric
# When the primary router expires: falls over to secondary

# Check router preference from RA flags
# Prf field in RA: High=0b01, Medium=0b00, Low=0b11
# Affects the route metric assigned to each router
```

## Configuring Multiple Routers for Redundancy

```bash
# Router 1 (primary) radvd.conf
sudo tee /etc/radvd.conf << 'EOF'
interface eth0 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 30;     # RA every 10-30 seconds (fast refresh)
    MinRtrAdvInterval 10;
    AdvDefaultLifetime 90;    # Router Lifetime = 90s (3x MaxRtrAdvInterval)
    AdvDefaultPreference high; # This router preferred over others

    prefix 2001:db8::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 2592000;
        AdvPreferredLifetime 604800;
    };
};
EOF

# Router 2 (backup) radvd.conf
sudo tee /etc/radvd.conf << 'EOF'
interface eth0 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 30;
    MinRtrAdvInterval 10;
    AdvDefaultLifetime 90;
    AdvDefaultPreference low;  # Backup router, lower preference

    prefix 2001:db8::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 2592000;
        AdvPreferredLifetime 604800;
    };
};
EOF
```

## Monitoring Router Discovery

```bash
# Watch for RA messages (router discovery in action)
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 134"

# Check Router Lifetime from received RA (bytes at offset 46-47 of IPv6+ICMPv6)
# Router Lifetime is 2 bytes at offset 6 of the RA body (after Type+Code+Chk+HL)
# Offsets in raw bytes: IPv6(40)+ICMPv6_type(1)+code(1)+chk(2)+HL(1)+flags(1)=46
# Router Lifetime at bytes 46-47
sudo tcpdump -i eth0 "icmp6 and ip6[40] == 134" -v 2>&1 | \
    grep "router lifetime"

# Monitor default router list changes
watch -n 5 'ip -6 route show default'

# Test router failover: bring down primary router and watch failover
# ip link set eth0 down  (on router)
# Watch host's default route change from fe80::1 to fe80::2
```

## Router Discovery Issues

```bash
# Issue 1: No default route (router not sending RAs)
ip -6 route show default
# Empty: no default route received

# Check for RA messages
sudo tcpdump -i eth0 "icmp6 and ip6[40] == 134" -c 5 &
# If no RAs seen: router is not advertising or RAs are blocked

# Issue 2: Default route expires quickly
ip -6 route show default
# "expires 5sec" → Router Lifetime in RA is too short

# Issue 3: Wrong router selected (metric)
ip -6 route show default
# Both routes have same metric → non-deterministic router selection

# Solution: Set AdvDefaultPreference high/medium/low in radvd
# High priority → lower route metric → selected first
```

## Conclusion

IPv6 Router Discovery provides automatic default gateway discovery and management without manual configuration or DHCP. The Default Router List is maintained based on Router Advertisement Router Lifetime values, with automatic removal when the lifetime expires. Multiple routers can be deployed with different preferences for load balancing and failover. The `ip -6 route show default` command shows the current default router list with expiry times. Router Lifetime should be set to at least 3 times the MaxRtrAdvInterval to avoid gaps in coverage.
