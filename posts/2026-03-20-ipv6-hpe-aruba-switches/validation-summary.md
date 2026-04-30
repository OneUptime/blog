# Validation Summary: How to Configure IPv6 on HPE/Aruba Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- ArubaOS-CX
- ArubaOS-Switch / ProVision
- IPv6 addressing and routing
- IPv6 Router Advertisements and Neighbor Discovery
- OSPFv3
- IPv6 ACLs

## Sources Consulted
- ArubaOS-CX 10.11 Fundamentals Guide (routing on physical interfaces): https://www.arubanetworks.com/techdocs/AOS-CX/10.11/PDF/fundamentals_6300-6400.pdf
- ArubaOS-CX 10.13 IP Services Guide (RA, ND, RDNSS commands): https://www.arubanetworks.com/techdocs/AOS-CX/10.13/PDF/ip_services_6300-6400.pdf
- ArubaOS-CX 10.07 IP Services Guide for 6100 Switches (`show ipv6 nd interface`, `ipv6 nd ra dns server` examples): https://www.arubanetworks.com/techdocs/AOS-CX/10.07/PDF/5200-7860.pdf
- ArubaOS-CX 10.13 IP Routing Guide (OSPFv3 interface syntax and neighbor verification): https://www.arubanetworks.com/techdocs/AOS-CX/10.13/PDF/ip_route_4100i-6000-6100-6200.pdf
- ArubaOS-CX 10.11 IP Routing Guide (IPv6 static routes and route table verification): https://www.arubanetworks.com/techdocs/AOS-CX/10.11/PDF/ip_route_6300-6400-83xx-9300-10000.pdf
- ArubaOS-CX 10.13 ACLs and Classifier Policies Guide (IPv6 ACL creation syntax): https://www.arubanetworks.com/techdocs/AOS-CX/10.13/PDF/acls_6200.pdf
- ArubaOS-CX 10.14 ACLs and Classifier Policies Guide (ACL application examples on interfaces): https://www.arubanetworks.com/techdocs/AOS-CX/10.14/PDF/acls_832x-9300-10000.pdf
- ArubaOS-CX 10.10 Diagnostics and Supportability Guide (`ping6` syntax): https://www.arubanetworks.com/techdocs/AOS-CX/10.10/PDF/diagnostics_6300-6400.pdf
- Aruba 3810 / 5400R IPv6 Configuration Guide for ArubaOS-Switch 16.08 (legacy IPv6 routing and addressing): https://www.arubanetworks.com/techdocs/AOS-Switch/16.08/IPV6/Aruba%203810%20%265400R%20IPv6%20Configuration%20Guide%20for%20AOS-S%20Switch%2016.08.pdf
- Aruba 2930F / 2930M IPv6 Configuration Guide for ArubaOS-Switch 16.11 (legacy default-route syntax and routing behavior): https://www.arubanetworks.com/techdocs/AOS-Switch/16.11/Aruba%202930F%262930M%20IPv6%20Configuration%20Guide%20for%20AOS-S%20Switch%2016.11.pdf

## Issues Found
- The ArubaOS-CX post used Cisco-style routed-port syntax (`no switchport`). I changed it to `routing`, which is the documented AOS-CX command for converting a physical interface into a Layer 3 interface.
- The post claimed ArubaOS-CX uses a global `ipv6 unicast-routing` command and a per-interface `ipv6 enable` command. I removed those because the current AOS-CX command guides document IPv6 configuration on SVIs and routed ports without those commands.
- The Router Advertisement section used multiple incorrect AOS-CX commands: `ipv6 nd ra interval`, `valid-lifetime`, `preferred-lifetime`, `m-flag disable`, `o-flag disable`, and `ipv6 nd ra dns-server`. I replaced them with the documented AOS-CX syntax: `no ipv6 nd suppress-ra`, `ipv6 nd ra min-interval`, `ipv6 nd ra max-interval`, `ipv6 nd prefix ... valid ... preferred ...`, `no ipv6 nd ra managed-config-flag`, `no ipv6 nd ra other-config-flag`, and `ipv6 nd ra dns server`.
- The IPv6 ACL section used incorrect AOS-CX commands and prompts. I changed `ipv6 access-list` to `access-list ipv6`, corrected the ACL submode prompt to `config-acl-ipv6`, and replaced `ipv6 access-group` with `apply access-list ipv6 ... in`, which matches official AOS-CX ACL documentation.
- The verification section contained invalid or outdated commands. I changed `show ipv6 ospf neighbor` to `show ipv6 ospfv3 neighbors`, replaced `show ipv6 nd` with `show ipv6 nd interface vlan 100`, and used a documented `show ipv6 interface` form.
- The example default-route next hop `2001:db8:isp::1` was not a syntactically valid IPv6 address. I replaced it with the valid documentation-prefix example `2001:db8:ffff::1` in both modern and legacy sections.
- The legacy section used `ipv6 routing`, which is not the documented ArubaOS-Switch command. I corrected it to `ipv6 unicast-routing` and kept the rest of the legacy example aligned with ArubaOS-Switch IPv6 guides.

## Review Notes
- Command syntax varies slightly across AOS-CX hardware families and software releases, especially for ACL application on VLAN interfaces versus routed physical interfaces. The corrected ACL example is valid for a routed physical interface as written in the post.
- The legacy section is still useful, but ArubaOS-Switch and ArubaOS-CX have materially different CLIs. Readers should not assume commands are portable between the two platforms.
