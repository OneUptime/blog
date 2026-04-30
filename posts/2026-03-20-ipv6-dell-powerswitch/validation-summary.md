# Validation Summary: How to Configure IPv6 on Dell PowerSwitch

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dell PowerSwitch
- SmartFabric OS10 / Dell OS10
- IPv6 addressing and static routing
- IPv6 Neighbor Discovery and Router Advertisements
- OSPFv3
- BGP IPv6 unicast
- IPv6 ACLs

## Sources Consulted
- Dell EMC SmartFabric OS10 User Guide Release 10.5.2, "IPv6 routing" - https://www.dell.com/support/manuals/en-in/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-2-6/ipv6-routing?guid=guid-991df0fa-9ea8-429d-92ca-7335544508f9&lang=en-us
- Dell EMC SmartFabric OS10 User Guide Release 10.5.1, "ipv6 address" - https://www.dell.com/support/manuals/en-tc/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-1/ipv6-address?guid=guid-7bdc318b-2175-48f1-a225-d3e7b28fe043&lang=en-us
- Dell EMC SmartFabric OS10 User Guide Release 10.5.1, "ipv6 nd send-ra" - https://www.dell.com/support/manuals/en-us/networking-n3200-on/smartfabric-os-user-guide-10-5-1/ipv6-nd-send-ra?guid=guid-c30cfc6a-317e-4f0d-81f4-47a848cbce5e&lang=en-us
- Dell SmartFabric OS10 User Guide Release 10.5.4, "ipv6 nd max-ra-interval" - https://www.dell.com/support/manuals/en-to/smartfabric-os10-emp-partner/smartfabric-os-user-guide-10-5-4/ipv6-nd-max-ra-interval?guid=guid-d2c24cfc-39f2-4c45-b2cb-bc92207956d4&lang=en-us
- Dell EMC SmartFabric OS10 User Guide Release 10.5.0, "ipv6 nd ra-lifetime" - https://www.dell.com/support/manuals/en-us/networking-mx7116n/smartfabric-os-user-guide-10-5-0/ipv6-nd-ra-lifetime?guid=guid-69f2b383-2e4b-4eac-a2ee-d2b7d9e0ac04&lang=en-us
- Dell EMC SmartFabric OS10 User Guide Release 10.5.0, "ipv6 nd prefix" - https://www.dell.com/support/manuals/en-uk/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-0/ipv6-nd-prefix?guid=guid-4d659d72-4f66-4e9e-9596-c01a07a8f538&lang=en-us
- Dell EMC SmartFabric OS10 User Guide Release 10.5.2, "router-id" and "ipv6 ospf area" - https://www.dell.com/support/manuals/en-ai/smartfabric-os10-emp-partner/smartfabric-os-user-guide-10-5-2/router-id?guid=guid-87cdd091-b415-4dff-8be4-d7656a011614&lang=en-us ; https://www.dell.com/support/manuals/en-bz/smartfabric-os10-emp-partner/smartfabric-os-user-guide-10-5-2/ipv6-ospf-area?guid=guid-37a3f03a-c93d-4a66-bb0a-58986968bab0&lang=en-us
- Dell EMC SmartFabric OS10 User Guide Release 10.5.1/10.5.4/10.6.0, BGP neighbor and AF commands - https://www.dell.com/support/manuals/en-aw/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-1/neighbor?guid=guid-9f5496a8-66b6-4d54-9ef9-ce0850e642fa&lang=en-us ; https://www.dell.com/support/manuals/en-uk/smartfabric-os10-emp-partner/smartfabric-os-user-guide-10-5-4/address-family?guid=guid-56cd8719-ce99-469b-b3d2-95e6d3266df5&lang=en-us ; https://www.dell.com/support/manuals/en-us/smartfabric-os10-emp-partner/smartfabric-os-user-guide-10-6-0-x/activate?guid=guid-727a7dac-f50c-4fe3-a954-2a7a19ac1662&lang=en-us ; https://www.dell.com/support/manuals/en-us/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-0/show-ip-bgp-ipv6-unicast?guid=guid-c92c1646-5068-4629-a0b6-cf1d73a320c3&lang=en-us
- Dell EMC SmartFabric OS10 User Guide Release 10.5.1, IPv6 ACL syntax - https://www.dell.com/support/manuals/en-hk/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-1/seq-permit-icmp-ipv6?guid=guid-123d6233-28bf-4be8-8603-fabaa90517af&lang=en-us ; https://www.dell.com/support/manuals/en-aw/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-1/seq-permit-tcp-ipv6?guid=guid-27d9a53b-e999-4554-a363-aa93d2e009cf&lang=en-us ; https://www.dell.com/support/manuals/en-us/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-0/ipv6-access-group?guid=guid-36a67fe3-3d31-4307-a1ff-edaae9bd5ffb&lang=en-us
- Dell EMC SmartFabric OS10 User Guide Release 10.5.0/10.5.2, verification commands - https://www.dell.com/support/manuals/en-us/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-1/test-network-connectivity?guid=guid-f2af1c26-97a8-4db7-963b-c3a28c6d3167&lang=en-us ; https://www.dell.com/support/manuals/en-ca/smartfabric-os10-emp-partner/smartfabric-os-user-guide-10-5-2/show-ipv6-interface-brief?guid=guid-10ffdf72-4ad8-4895-a502-20e1d7517782&lang=en-us ; https://www.dell.com/support/manuals/en-in/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-0/show-ipv6-ospf-neighbor?guid=guid-fe664a8f-1463-4b80-a3c0-5885912a0533&lang=en-us ; https://www.dell.com/support/manuals/en-us/dell-emc-smartfabric-os10/smartfabric-os-user-guide-10-5-0/show-ipv6-neighbors?guid=guid-9c09e866-b3fe-447f-aaa1-a995eac1ed56&lang=en-us

## Issues Found
- The post used Cisco-style physical interface syntax such as `interface ethernet1/1/1`. OS10 documentation uses `interface ethernet 1/1/1`, so the interface commands were corrected.
- The Router Advertisement section used non-OS10 keywords: `ipv6 nd ra interval`, `ipv6 nd ra lifetime`, and `valid-lft/preferred-lft`. These were corrected to OS10 syntax: `ipv6 nd send-ra`, `ipv6 nd max-ra-interval`, `ipv6 nd ra-lifetime`, and `ipv6 nd prefix ... lifetime valid-lifetime ... preferred-lifetime ...`.
- The default-route examples used invalid IPv6 literals, `2001:db8:isp::1` and `2001:db8:isp2::1`. These were replaced with valid documentation-prefix IPv6 addresses.
- The OSPFv3 process was configured with `ipv6 router ospf 1`, which does not match current OS10 syntax. This was corrected to `router ospfv3 1`, and an `exit` was added before returning to interface configuration mode.
- The IPv6 ACL example used `icmpv6` and the Cisco-style `established` keyword. OS10 IPv6 ACL syntax uses `icmp` for ICMPv6 in IPv6 ACL context, and it supports TCP flag matches such as `ack` instead of `established`. The ACL example was corrected accordingly, and an `exit` was added before returning to interface configuration mode.
- The BGP peer example used inline Cisco-style neighbor configuration. Current OS10 documentation shows neighbor submode configuration (`neighbor ...`, then `remote-as`, then neighbor address-family `activate`), so the example was updated to match OS10.
- The verification section used `show bgp ipv6 unicast summary` and `ping ipv6 ...`, which do not match OS10’s documented commands. These were corrected to `show ip bgp ipv6 unicast summary` and `ping6`.
- The description line referred to "SmartFabric OS or Dell OS10" as if they were separate products. This was corrected to "SmartFabric OS10 (Dell OS10)" for naming accuracy.

## Review Notes
- The Neighbor Discovery and Router Advertisement commands shown here are documented in OS10 10.4.0E(R1) and later. Older OS10 releases may differ.
- Dell documentation shows some release- and mode-specific differences around VLAN creation in SmartFabric Services mode. The `interface vlan 100` example is valid for OS10 CLI, but SmartFabric mode behavior may vary by release.
