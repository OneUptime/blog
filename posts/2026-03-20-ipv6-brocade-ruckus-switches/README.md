# How to Configure IPv6 on Brocade/Ruckus Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Brocade, Ruckus, FastIron, Switch, Networking

Description: Configure IPv6 on Brocade/Ruckus FastIron switches including ICX series with address assignment, OSPFv3, and IPv6 ACLs for campus network deployments.

## Introduction

Brocade switches (now Ruckus/CommScope) running FastIron OS (FI) support full IPv6 including routing, OSPFv3, BGP, and security features. The Ruckus ICX series is the primary campus switching platform and uses a similar syntax to Brocade's original designs.

## Step 1: Enable IPv6 Routing

```bash
# Enable IPv6 unicast routing globally

Switch(config)# ipv6 unicast-routing
```

## Step 2: Configure IPv6 on Interfaces

```bash
# Physical interface
Switch(config)# interface ethernet 1/1/1
Switch(config-if-e1000-1/1/1)# ipv6 address 2001:db8:0:1::1/64
Switch(config-if-e1000-1/1/1)# no shutdown

# Loopback
Switch(config)# interface loopback 1
Switch(config-lbif-1)# ipv6 address 2001:db8::1/128
```

## Step 3: Assign Ports to VLANs

```bash
# Create VLAN and assign ports
Switch(config)# vlan 100 name "employee"
Switch(config-vlan-100)# untagged ethernet 1/1/2 to 1/1/24
Switch(config-vlan-100)# tagged ethernet 1/1/48
Switch(config-vlan-100)# interface ve 100
Switch(config-vif-100)# ipv6 address 2001:db8:1:100::1/64
Switch(config-vif-100)# no shutdown

# Verify
Switch# show vlan 100
```

## Step 4: Configure Router Advertisements

FastIron supports Router Advertisements on VE (Virtual Ethernet) interfaces:

```bash
# Configure RA on VE 100 (VLAN 100)
Switch(config)# interface ve 100
Switch(config-vif-100)# ipv6 nd ra-interval 100
Switch(config-vif-100)# ipv6 nd ra-lifetime 1800
Switch(config-vif-100)# ipv6 nd prefix-advertisement 2001:db8:1:100::/64 86400 14400 auto-config onlink
Switch(config-vif-100)# no ipv6 nd managed-config-flag
Switch(config-vif-100)# no ipv6 nd other-config-flag
```

## Step 5: Configure Static Routes

```bash
# Default IPv6 route
Switch(config)# ipv6 route ::/0 2001:db8:0:1::2

# Specific static route
Switch(config)# ipv6 route 2001:db8:2::/48 2001:db8:0:1::3

# Check the routing table
Switch# show ipv6 route
```

## Step 6: Configure OSPFv3

```bash
# Configure OSPFv3
Switch(config)# ipv6 router ospf
Switch(config-ospf6-router)# area 0
Switch(config-ospf6-router)# router-id 1.1.1.1

# Enable on interfaces
Switch(config)# interface ve 100
Switch(config-vif-100)# ipv6 ospf area 0

Switch(config)# interface ethernet 1/1/1
Switch(config-if-e1000-1/1/1)# ipv6 ospf area 0

# Verify
Switch# show ipv6 ospf neighbor
```

## Step 7: Configure IPv6 ACL

```bash
# Create IPv6 ACL
Switch(config)# ipv6 access-list IPV6-PROTECT
Switch(config-ipv6-access-list IPV6-PROTECT)# permit icmp any any
Switch(config-ipv6-access-list IPV6-PROTECT)# permit tcp any any established
Switch(config-ipv6-access-list IPV6-PROTECT)# deny ipv6 any any log

# Apply to interface
Switch(config)# interface ethernet 1/1/1
Switch(config-if-e1000-1/1/1)# ipv6 access-group IPV6-PROTECT in
```

## Verification Commands

```bash
# Show IPv6 interface information
Switch# show ipv6 interface

# Show IPv6 routing table
Switch# show ipv6 route

# Show OSPFv3 neighbors
Switch# show ipv6 ospf neighbor

# Show IPv6 neighbor cache
Switch# show ipv6 neighbor

# Show IPv6 ACL
Switch# show ipv6 access-list IPV6-PROTECT

# Ping test
Switch# ping ipv6 2606:4700:4700::1111
```

## Conclusion

Ruckus/Brocade FastIron switches provide IPv6 capabilities with a CLI syntax that blends IOS-like conventions with FastIron-specific elements like VE (Virtual Ethernet) interfaces for VLAN routing. The VE interfaces replace the standard `interface vlan` concept found on other platforms. OSPFv3 and static routing provide flexibility for different network topologies, and IPv6 ACLs provide access control using the platform's IPv6 ACL format.
