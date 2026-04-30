# How to Configure IPv6 on Extreme Networks Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Extreme Networks, ExtremeXOS, Switch, Networking, Campus

Description: Configure IPv6 on Extreme Networks switches running ExtremeXOS including VLAN routing, OSPFv3, and Router Advertisements for campus network deployments.

## Introduction

Extreme Networks switches running ExtremeXOS support IPv6 with a configuration syntax that differs from Cisco IOS. This guide covers the key IPv6 commands for ExtremeXOS-based switches (X Series, ExtremeSwitching).

## Step 1: Enable IPv6 Forwarding

```bash
# Enable IPv6 unicast routing

enable ipforwarding ipv6

# Verify
show ipconfig ipv6
```

## Step 2: Configure IPv6 on a VLAN

Unlike Cisco, Extreme uses VLAN names as the primary identifier:

```bash
# Create VLAN and assign IPv6 address
create vlan "employee-vlan" tag 100
configure vlan "employee-vlan" ipaddress 192.168.100.1/24   # IPv4
configure vlan "employee-vlan" ipaddress 2001:db8:1:100::1/64

# Enable IPv6 on the VLAN
enable ipforwarding ipv6 vlan "employee-vlan"

# Verify
show ipconfig ipv6 vlan "employee-vlan"
```

## Step 3: Configure Router Advertisements

```bash
# Enable RA on the VLAN
enable router-discovery ipv6 vlan "employee-vlan"

# Set RA intervals
configure vlan "employee-vlan" router-discovery ipv6 max-interval 100
configure vlan "employee-vlan" router-discovery ipv6 min-interval 33

# Set router lifetime
configure vlan "employee-vlan" router-discovery ipv6 default-lifetime 1800

# Configure the prefix to advertise
configure vlan "employee-vlan" router-discovery ipv6 add prefix 2001:db8:1:100::/64
configure vlan "employee-vlan" router-discovery ipv6 set prefix 2001:db8:1:100::/64 \
    valid-lifetime 86400 preferred-lifetime 14400 autonomous-flag on onlink-flag on

# Set M and O flags (off for SLAAC)
configure vlan "employee-vlan" router-discovery ipv6 managed-config-flag off
configure vlan "employee-vlan" router-discovery ipv6 other-config-flag off
```

## Step 4: Configure Static IPv6 Routes

```bash
# Add a static IPv6 route
configure iproute add default 2001:db8:0:ff::1 vr "VR-Default"

# Add a specific route
configure iproute add 2001:db8:2::/48 2001:db8:0:1::2 vr "VR-Default"

# Verify routing table
show iproute ipv6
```

## Step 5: Configure OSPFv3

```bash
# Configure OSPFv3
configure ospfv3 routerid 1.1.1.1

# Add interfaces to OSPFv3 area 0
configure ospfv3 add vlan "employee-vlan" area 0.0.0.0
configure ospfv3 add vlan "uplink-vlan" area 0.0.0.0

# Enable OSPFv3
enable ospfv3

# Verify
show ospfv3 neighbor
show ospfv3 route
```

## Step 6: Configure IPv6 Access Lists

```bash
# Create an IPv6 access list
create access-list ipv6_protect "protocol icmpv6" "permit"

# Block specific traffic
create access-list ipv6_deny_ssh "source-address 2001:db8:bad::/48;protocol tcp;destination-port 22" "deny"

# Apply to VLAN ingress
configure access-list add ipv6_deny_ssh first vlan "employee-vlan" ingress
configure access-list add ipv6_protect last vlan "employee-vlan" ingress
```

## Step 7: Configure DHCPv6 Prefix Delegation Snooping

```bash
# Add the DHCPv6 relay destination
configure bootprelay ipv6 add 2001:db8:0:200::10 vr "VR-Default"

# Enable DHCPv6 relay on the VLAN
enable bootprelay ipv6 vlan "employee-vlan"

# Enable prefix delegation snooping on the VLAN
configure bootprelay ipv6 prefix-delegation snooping on vlan "employee-vlan"
```

## Step 8: Save Configuration

```bash
# Save configuration
save configuration
```

## Verification Commands

```bash
# Show all IPv6 addresses
show ipconfig ipv6

# Show IPv6 routing table
show iproute ipv6

# Show IPv6 neighbor table
show neighbor-discovery cache ipv6

# Show OSPFv3 neighbors
show ospfv3 neighbor

# Show RA configuration
show router-discovery ipv6 vlan "employee-vlan"

# Ping test
ping vr VR-Default ipv6 2606:4700:4700::1111
```

## Conclusion

ExtremeXOS IPv6 configuration uses VLAN-centric syntax rather than interface-based syntax, reflecting Extreme's network philosophy. Once familiar with the `configure vlan ... ipaddress`, `enable ipforwarding ipv6`, and `configure vlan ... router-discovery ...` patterns, the remaining features (static routes, OSPFv3, ACLs) follow logically. The `show iproute ipv6` and `show neighbor-discovery cache ipv6` commands provide the primary verification views for IPv6 connectivity.
