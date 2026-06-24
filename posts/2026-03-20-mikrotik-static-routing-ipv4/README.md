# How to Configure Static Routing for IPv4 on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, RouterOS, Static Routing, IPv4, Networking

Description: Configure static IPv4 routes on MikroTik RouterOS including default gateway, specific network routes, floating static routes with distance, and recursive next-hops.

## Introduction

Static routing on MikroTik RouterOS is configured with `/ip route add`. Routes are selected based on longest prefix match and lowest distance. Floating static routes with higher distance values provide backup paths when primary routes fail.

## Default Gateway

```mikrotik
# Add default route

/ip route add dst-address=0.0.0.0/0 gateway=203.0.113.1 comment="Default via ISP"

# Verify
/ip route print where dst-address=0.0.0.0/0
```

## Static Route to Specific Network

```mikrotik
# Route to remote LAN
/ip route add dst-address=10.2.0.0/16 gateway=192.168.1.254 comment="Remote site"

# Route to single host
/ip route add dst-address=172.16.5.10/32 gateway=10.1.0.1 comment="Static host"
```

## Floating Static Route (Backup)

```mikrotik
# Primary route via main ISP (default distance=1)
/ip route add dst-address=0.0.0.0/0 gateway=203.0.113.1 distance=1 comment="Primary ISP"

# Backup route via secondary ISP (higher distance - only used if primary fails)
/ip route add dst-address=0.0.0.0/0 gateway=198.51.100.1 distance=5 comment="Backup ISP"
```

## Route with Check Gateway

```mikrotik
# Automatic failover - removes route if gateway is unreachable
/ip route add \
  dst-address=0.0.0.0/0 \
  gateway=203.0.113.1 \
  check-gateway=ping \
  comment="Primary ISP with health check"
```

## Policy Routing (Routing Mark)

```mikrotik
# Route specific source traffic through a different gateway
# Step 1: Create routing table (must exist before being referenced)
/routing table add name=ISP2 fib

# Step 2: Add route into the new table
/ip route add \
  dst-address=0.0.0.0/0 \
  gateway=198.51.100.1 \
  routing-table=ISP2 \
  comment="ISP2 for VLAN2 traffic"

# Step 3: Mangle - mark traffic with the routing mark
/ip firewall mangle add \
  chain=prerouting \
  src-address=192.168.2.0/24 \
  action=mark-routing \
  new-routing-mark=ISP2 \
  passthrough=yes
```

## Blackhole and Unreachable Routes

```mikrotik
# Drop traffic to a specific range (blackhole)
/ip route add dst-address=192.0.2.0/24 type=blackhole comment="RFC5737 test range"

# Return ICMP unreachable
/ip route add dst-address=198.51.100.0/24 type=unreachable
```

## Verify Routes

```mikrotik
# Show routing table
/ip route print

# Show only active routes
/ip route print where active=yes

# Check which route would be used for a destination (RouterOS v7)
/ip route print where 8.8.8.8 in dst-address active=yes

# Show route details
/ip route print detail
```

## Conclusion

MikroTik static routing is clean and minimal. Use `distance` for floating backup routes, `check-gateway=ping` for automatic failover, and routing marks with mangle rules for policy-based routing. Always verify active routes with `/ip route print where active=yes` after configuration changes.
