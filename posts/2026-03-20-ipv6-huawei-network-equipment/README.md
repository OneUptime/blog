# How to Configure IPv6 on Huawei Network Equipment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Huawei, VRP, Router, Switch, Networking

Description: Configure IPv6 on Huawei routers and switches running VRP (Versatile Routing Platform) including addressing, OSPFv3, BGP, and RA configuration.

## Introduction

Huawei network equipment runs VRP (Versatile Routing Platform), which powers routers (NE series, AR series) and switches (CE series, S series). VRP has a configuration syntax distinct from Cisco IOS but follows similar logical structures.

## Step 1: Enable IPv6 Routing

```bash
# Enter system view

<Huawei> system-view

# Enable IPv6 routing
[Huawei] ipv6

# Verify IPv6 is enabled
[Huawei] display ipv6 interface brief
```

## Step 2: Configure IPv6 on an Interface

```bash
# Configure a physical interface
[Huawei] interface GigabitEthernet 0/0/0
[Huawei-GigabitEthernet0/0/0] ipv6 enable
[Huawei-GigabitEthernet0/0/0] ipv6 address 2001:db8:1:1::1 64
[Huawei-GigabitEthernet0/0/0] undo shutdown
[Huawei-GigabitEthernet0/0/0] quit

# Configure a VLANIF interface (SVI equivalent)
[Huawei] interface Vlanif 100
[Huawei-Vlanif100] ipv6 enable
[Huawei-Vlanif100] ipv6 address 2001:db8:1:100::1 64
[Huawei-Vlanif100] quit

# Configure loopback
[Huawei] interface LoopBack 0
[Huawei-LoopBack0] ipv6 enable
[Huawei-LoopBack0] ipv6 address 2001:db8::1 128
[Huawei-LoopBack0] quit
```

## Step 3: Configure Static IPv6 Routes

```bash
# Default route
[Huawei] ipv6 route-static :: 0 GigabitEthernet 0/0/1 2001:db8:0:ff::1

# Specific route
[Huawei] ipv6 route-static 2001:db8:2:: 48 2001:db8:0:1::2

# Verify routing table
[Huawei] display ipv6 routing-table
```

## Step 4: Configure Router Advertisements

```bash
# Enable RA on the interface
[Huawei] interface Vlanif 100
[Huawei-Vlanif100] undo ipv6 nd ra halt
[Huawei-Vlanif100] ipv6 nd ra max-interval 100
[Huawei-Vlanif100] ipv6 nd ra min-interval 33
[Huawei-Vlanif100] ipv6 nd ra router-lifetime 1800

# Configure the prefix to advertise
[Huawei-Vlanif100] ipv6 nd ra prefix 2001:db8:1:100:: 64 86400 14400

# Set M and O flags to off for SLAAC
[Huawei-Vlanif100] undo ipv6 nd autoconfig managed-address-flag
[Huawei-Vlanif100] undo ipv6 nd autoconfig other-flag

# Set DNS server in RA (RDNSS)
[Huawei-Vlanif100] ipv6 nd ra dns-server 2001:db8:1:100::53 600
[Huawei-Vlanif100] quit
```

## Step 5: Configure OSPFv3

```bash
# Configure OSPFv3 process
[Huawei] ospfv3 1
[Huawei-ospfv3-1] router-id 1.1.1.1
[Huawei-ospfv3-1] quit

# Enable on interfaces
[Huawei] interface Vlanif 100
[Huawei-Vlanif100] ospfv3 1 area 0
[Huawei-Vlanif100] quit

[Huawei] interface GigabitEthernet 0/0/0
[Huawei-GigabitEthernet0/0/0] ospfv3 1 area 0
[Huawei-GigabitEthernet0/0/0] quit

# Verify
[Huawei] display ospfv3 peer
```

## Step 6: Configure BGP with IPv6

```bash
# Configure BGP
[Huawei] bgp 65001
[Huawei-bgp] router-id 10.0.0.1

# Configure IPv6 peer
[Huawei-bgp] peer 2001:db8:0:1::2 as-number 65002

# Enable IPv6 address family
[Huawei-bgp] ipv6-family unicast
[Huawei-bgp-af-ipv6] peer 2001:db8:0:1::2 enable
[Huawei-bgp-af-ipv6] network 2001:db8::1 128
[Huawei-bgp-af-ipv6] quit
[Huawei-bgp] quit
```

## Step 7: Configure IPv6 ACL

```bash
# Create an IPv6 ACL
[Huawei] acl ipv6 number 2000
[Huawei-acl6-basic-2000] rule 10 permit source 2001:db8:1:1:: 64
[Huawei-acl6-basic-2000] rule 20 deny source any
[Huawei-acl6-basic-2000] quit
```

## Verification Commands

```bash
# Show IPv6 interface details
display ipv6 interface GigabitEthernet 0/0/0

# Show IPv6 routing table
display ipv6 routing-table

# Show OSPFv3 peers
display ospfv3 peer

# Show BGP IPv6 peers
display bgp ipv6 peer

# Show IPv6 neighbor cache
display ipv6 neighbors

# Ping test
ping ipv6 -c 3 2606:4700:4700::1111
```

## Conclusion

Huawei VRP provides full IPv6 capabilities with syntax that differs from Cisco IOS in key areas: `ipv6 address` uses space instead of `/` for prefix notation, interface IPv6 must be explicitly enabled with `ipv6 enable`, and routing processes use slightly different command structures. Once the VRP syntax patterns are learned, IPv6 deployment on Huawei equipment follows the same logical steps as other enterprise platforms.
