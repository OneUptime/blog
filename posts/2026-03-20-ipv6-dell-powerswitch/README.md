# How to Configure IPv6 on Dell PowerSwitch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Dell, PowerSwitch, SmartFabric, Networking, Datacenter

Description: Configure IPv6 on Dell PowerSwitch (S-series, Z-series) running SmartFabric OS or Dell OS10 for campus and datacenter IPv6 deployments.

## Introduction

Dell PowerSwitch series (S3248, S5248, Z9xxx) runs Dell OS10 (SmartFabric OS10), which is based on Linux and provides comprehensive IPv6 support. Configuration syntax is similar to Cisco IOS, making it accessible for network engineers with Cisco experience.

## Step 1: Enable IPv6 Routing

```bash
# Enter configuration mode

switch# configure terminal

# Enable IPv6 unicast routing
switch(config)# ipv6 unicast-routing
```

## Step 2: Configure IPv6 on Physical Interface

```bash
# Configure a routed interface
switch(config)# interface ethernet 1/1/1
switch(conf-if-eth1/1/1)# no switchport
switch(conf-if-eth1/1/1)# ipv6 address 2001:db8:0:1::1/64
switch(conf-if-eth1/1/1)# no shutdown
```

## Step 3: Configure IPv6 on VLAN Interface

```bash
# Create VLAN
switch(config)# interface vlan 100

# Add IPv6 address to VLAN interface (SVI)
switch(conf-if-vl-100)# ipv6 address 2001:db8:1:100::1/64
switch(conf-if-vl-100)# no shutdown
```

## Step 4: Configure Router Advertisements

```bash
# Enable RA and configure on VLAN 100
switch(conf-if-vl-100)# ipv6 nd send-ra
switch(conf-if-vl-100)# ipv6 nd max-ra-interval 100
switch(conf-if-vl-100)# ipv6 nd ra-lifetime 1800
switch(conf-if-vl-100)# ipv6 nd managed-config-flag
# Remove managed flag for pure SLAAC:
switch(conf-if-vl-100)# no ipv6 nd managed-config-flag

# Add prefix to advertise
switch(conf-if-vl-100)# ipv6 nd prefix 2001:db8:1:100::/64 lifetime valid-lifetime 86400 preferred-lifetime 14400
```

## Step 5: Configure Static and Default Routes

```bash
# Static route to a remote network
switch(config)# ipv6 route 2001:db8:2::/48 2001:db8:0:1::2

# Default IPv6 route
switch(config)# ipv6 route ::/0 2001:db8:0:ff::1

# Floating static (backup route with higher administrative distance)
switch(config)# ipv6 route ::/0 2001:db8:0:fe::1 200
```

## Step 6: Configure OSPFv3

```bash
# Configure OSPFv3 process
switch(config)# router ospfv3 1
switch(config-router-ospfv3-1)# router-id 1.1.1.1
switch(config-router-ospfv3-1)# exit

# Enable OSPFv3 on interfaces
switch(config)# interface vlan 100
switch(conf-if-vl-100)# ipv6 ospf 1 area 0

switch(config)# interface ethernet 1/1/1
switch(conf-if-eth1/1/1)# ipv6 ospf 1 area 0
```

## Step 7: Configure IPv6 ACL

```bash
# Create IPv6 access list
switch(config)# ipv6 access-list IPV6-PROTECT

# Permit ICMPv6 (required for Neighbor Discovery)
switch(conf-ipv6-acl)# seq 10 permit icmp any any

# Permit TCP packets with the ACK bit set
switch(conf-ipv6-acl)# seq 20 permit tcp any any ack

# Implicit deny at the end
switch(conf-ipv6-acl)# seq 30 deny ipv6 any any count
switch(conf-ipv6-acl)# exit

# Apply to interface
switch(config)# interface ethernet 1/1/1
switch(conf-if-eth1/1/1)# ipv6 access-group IPV6-PROTECT in
```

## Step 8: Configure BGP with IPv6 (for Datacenter)

```bash
# Configure BGP for IPv6
switch(config)# router bgp 65001
switch(config-router-bgp-65001)# router-id 10.0.0.1
switch(config-router-bgp-65001)# address-family ipv6 unicast
switch(config-router-bgpv6-af)# network 2001:db8::/48
switch(config-router-bgpv6-af)# exit

# Configure BGP peer
switch(config-router-bgp-65001)# neighbor 2001:db8:0:1::2
switch(config-router-neighbor)# remote-as 65002
switch(config-router-neighbor)# address-family ipv6 unicast
switch(config-router-bgp-neighbor-af)# activate
```

## Verification Commands

```bash
# Show IPv6 interface brief
switch# show ipv6 interface brief

# Show IPv6 routing table
switch# show ipv6 route

# Show OSPFv3 neighbor table
switch# show ipv6 ospf neighbor

# Show BGP IPv6 summary
switch# show ip bgp ipv6 unicast summary

# Show IPv6 neighbor table
switch# show ipv6 neighbors

# Ping with IPv6
switch# ping6 2606:4700:4700::1111
```

## Conclusion

Dell PowerSwitch with OS10 provides enterprise-grade IPv6 capabilities with a familiar Cisco-like CLI syntax. The platform supports all key IPv6 features for campus and datacenter deployments: static and dynamic routing (OSPFv3, BGP), Router Advertisements, IPv6 ACLs, and VLAN SVI routing. The Linux foundation of OS10 also enables shell access for advanced troubleshooting and automation scripting.
