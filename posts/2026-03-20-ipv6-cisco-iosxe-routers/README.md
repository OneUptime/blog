# How to Configure IPv6 on Cisco IOS-XE Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Cisco, IOS-XE, Router, Networking, Configuration

Description: Configure IPv6 on Cisco IOS-XE routers with modern features including segment routing, RDNSS in RA, and YANG/RESTCONF-based configuration.

## Introduction

Cisco IOS-XE builds on IOS with a modular architecture running on Cisco's hardware platforms (ASR, ISR 4000, Catalyst 8000). While most IPv6 commands are backward compatible with IOS, IOS-XE adds model-driven programmability and support for features such as RA-based DNS advertisement, DHCPv6 prefix delegation, and OSPFv3 address families.

## Step 1: Enable IPv6 and Basic Interface Configuration

```text
! Enable IPv6 unicast routing
Router(config)# ipv6 unicast-routing

! Configure LAN interface
Router(config)# interface GigabitEthernet0/0/0
Router(config-if)# description LAN Interface
Router(config-if)# ipv6 address 2001:db8:1:1::1/64
Router(config-if)# ipv6 enable
Router(config-if)# no shutdown

! Configure WAN interface
Router(config)# interface GigabitEthernet0/0/1
Router(config-if)# description WAN Interface - ISP
Router(config-if)# ipv6 address autoconfig   ! Or static if ISP provides one
Router(config-if)# no shutdown
```

## Step 2: Configure RA with RDNSS

Cisco IOS-XE supports RDNSS in IPv6 Router Advertisements (RA) on supported platforms:

```text
! Advertise DNS servers via RA on the LAN interface
Router(config)# interface GigabitEthernet0/0/0
Router(config-if)# ipv6 nd ra dns server 2001:db8:1:1::53 400
Router(config-if)# ipv6 nd ra dns server 2606:4700:4700::1111 400

! Verify
Router# show ipv6 nd ra dns server
```

## Step 3: Configure DHCPv6 with Prefix Delegation

IOS-XE handles DHCPv6-PD for both server and client roles:

```text
! DHCPv6 Pool for assigning prefixes to downstream routers
Router(config)# ipv6 dhcp pool PD-POOL
Router(config-dhcpv6)# prefix-delegation pool PD-PREFIXES lifetime 86400 14400
Router(config-dhcpv6)# dns-server 2001:db8:1:1::53
Router(config-dhcpv6)# domain-name example.com

! Create the prefix delegation pool
Router(config)# ipv6 local pool PD-PREFIXES 2001:db8::/48 56

! Apply to a downstream-facing interface (server mode)
Router(config)# interface GigabitEthernet0/0/0
Router(config-if)# ipv6 dhcp server PD-POOL

! Or configure the WAN interface as a DHCPv6-PD client (requesting a prefix from the ISP)
Router(config)# interface GigabitEthernet0/0/1
Router(config-if)# ipv6 dhcp client pd hint 2001:db8:100::/48
Router(config-if)# ipv6 dhcp client pd ISP-PREFIX
```

## Step 4: Configure OSPF v3 with Address Families (IOS-XE)

IOS-XE supports OSPFv3 with address family syntax (newer approach):

```text
! Modern OSPFv3 with address family
Router(config)# router ospfv3 1
Router(config-router)# router-id 1.1.1.1
Router(config-router)# address-family ipv6 unicast

! Enable on interfaces using the address-family syntax
Router(config)# interface GigabitEthernet0/0/0
Router(config-if)# ospfv3 1 ipv6 area 0
```

## Step 5: Configure Using RESTCONF (Model-Driven)

IOS-XE supports RESTCONF for programmatic configuration:

```bash
# Enable RESTCONF on the router

# Router(config)# restconf
# Router(config)# ip http secure-server

# Configure IPv6 address via RESTCONF (from a management host)
curl -sk -X PATCH \
    -H "Content-Type: application/yang-data+json" \
    -H "Accept: application/yang-data+json" \
    -u admin:password \
    "https://router/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0%2F0%2F0/ietf-ip:ipv6" \
    -d '{
        "ietf-ip:ipv6": {
            "enabled": true,
            "forwarding": true,
            "address": [{
                "ip": "2001:db8:1:1::1",
                "prefix-length": 64
            }]
        }
    }'
```

## Verification Commands

```text
! Show IPv6 interfaces and addresses
Router# show ipv6 interface brief

! Show IPv6 routing table
Router# show ipv6 route

! Show DHCPv6 bindings and pools
Router# show ipv6 dhcp pool
Router# show ipv6 dhcp binding

! Show RDNSS configuration
Router# show ipv6 nd ra dns server

! Show OSPFv3 status
Router# show ospfv3 neighbor
Router# show ospfv3 database

! Ping test
Router# ping ipv6 2001:db8:1:1::53 source GigabitEthernet0/0/0
```

## Conclusion

Cisco IOS-XE extends IOS IPv6 capabilities with features such as RDNSS in RA, DHCPv6 prefix delegation, OSPFv3 address families, and model-driven programmability via RESTCONF. The core IPv6 configuration syntax remains compatible with IOS, making migration straightforward. Use IOS-XE's RESTCONF interface for automated IPv6 provisioning in DevOps workflows.
