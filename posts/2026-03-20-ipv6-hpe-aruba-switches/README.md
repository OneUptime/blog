# How to Configure IPv6 on HPE/Aruba Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HPE, Aruba, Switch, ArubaOS, Networking

Description: Configure IPv6 on HPE/Aruba switches including VLAN SVIs, OSPFv3, and IPv6 access control lists for enterprise campus and datacenter deployments.

## Introduction

HPE/Aruba switches running ArubaOS-CX (modern) or ArubaOS-Switch/ProVision (legacy) support full IPv6. This guide focuses on ArubaOS-CX (used in Aruba CX 6xxx, 8xxx, and 10xxx series) as it represents the current platform.

## ArubaOS-CX IPv6 Configuration

### Step 1: Enter Configuration Mode

```bash
# ArubaOS-CX does not require a separate global IPv6 routing enable command.
# Enter configuration mode and configure IPv6 on the SVI or routed interface.

switch# configure terminal
```

### Step 2: Configure IPv6 on a VLAN Interface (SVI)

```bash
# Configure VLAN 100 with IPv6
switch(config)# interface vlan 100
switch(config-if-vlan)# ipv6 address 2001:db8:1:100::1/64
switch(config-if-vlan)# no shutdown
```

### Step 3: Configure IPv6 on a Routed Port

```bash
# Convert a port to routed mode and assign IPv6
switch(config)# interface 1/1/1
switch(config-if)# routing
switch(config-if)# ipv6 address 2001:db8:0:1::1/64
switch(config-if)# no shutdown
```

### Step 4: Configure Router Advertisements

```bash
# Enable RA on a VLAN interface
switch(config)# interface vlan 100
switch(config-if-vlan)# no ipv6 nd suppress-ra
switch(config-if-vlan)# ipv6 nd ra min-interval 30
switch(config-if-vlan)# ipv6 nd ra max-interval 100
switch(config-if-vlan)# ipv6 nd ra lifetime 1800

# Configure prefix advertisement
switch(config-if-vlan)# ipv6 nd prefix 2001:db8:1:100::/64 valid 86400 preferred 14400
switch(config-if-vlan)# no ipv6 nd ra managed-config-flag
switch(config-if-vlan)# no ipv6 nd ra other-config-flag

# Advertise DNS via RDNSS
switch(config-if-vlan)# ipv6 nd ra dns server 2001:db8:1:100::53 lifetime 600
```

### Step 5: Configure Static Routes

```bash
# Static route
switch(config)# ipv6 route 2001:db8:2::/48 2001:db8:0:1::2

# Default route
switch(config)# ipv6 route ::/0 2001:db8:ffff::1
```

### Step 6: Configure OSPFv3

```bash
# Configure OSPFv3
switch(config)# router ospfv3 1
switch(config-ospfv3-1)# router-id 1.1.1.1

# Enable on interfaces
switch(config)# interface vlan 100
switch(config-if-vlan)# ipv6 ospfv3 1 area 0

switch(config)# interface 1/1/1
switch(config-if)# ipv6 ospfv3 1 area 0
```

### Step 7: Configure IPv6 ACL

```bash
# Create an IPv6 access control list
switch(config)# access-list ipv6 IPV6-FILTER

# Permit ICMPv6 (required for Neighbor Discovery)
switch(config-acl-ipv6)# permit icmpv6 any any

# Permit established TCP
switch(config-acl-ipv6)# permit tcp any any established

# Deny everything else
switch(config-acl-ipv6)# deny any any any

# Apply to interface
switch(config)# interface 1/1/1
switch(config-if)# apply access-list ipv6 IPV6-FILTER in
```

## Legacy HPE ArubaOS-Switch / ProVision IPv6

For older HPE switches (5400, 3800 series):

```bash
# Enable IPv6 routing
switch(config)# ipv6 unicast-routing

# Configure a VLAN with IPv6
switch(config)# vlan 100
switch(vlan-100)# ipv6 address 2001:db8:1:100::1/64

# Add a static route
switch(config)# ipv6 route ::/0 2001:db8:ffff::1
```

## Verification Commands (ArubaOS-CX)

```bash
# Show IPv6 interface addresses
switch# show ipv6 interface 1/1/1

# Show IPv6 routing table
switch# show ipv6 route

# Show OSPFv3 neighbors
switch# show ipv6 ospfv3 neighbors

# Show IPv6 neighbor discovery cache
switch# show ipv6 neighbors

# Show RA configuration
switch# show ipv6 nd interface vlan 100

# Ping test
switch# ping6 2606:4700:4700::1111
```

## Conclusion

HPE/Aruba ArubaOS-CX switches provide comprehensive IPv6 support through a CLI structure that closely resembles Cisco IOS. Key differences include the `routing` command to convert a physical interface into a routed port, `no ipv6 nd suppress-ra` to enable Router Advertisements on an interface, and the `ipv6 ospfv3` syntax for OSPFv3. The switch can serve as a default gateway for IPv6 VLAN segments with integrated RA support, eliminating the need for a separate radvd server.
