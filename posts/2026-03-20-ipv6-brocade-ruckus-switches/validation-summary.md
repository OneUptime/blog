# Validation Summary: How to Configure IPv6 on Brocade/Ruckus Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- RUCKUS/Brocade FastIron OS
- IPv6 interface addressing and static routing
- VE (Virtual Ethernet) VLAN interfaces
- IPv6 Neighbor Discovery and Router Advertisements
- OSPFv3
- IPv6 ACLs

## Sources Consulted
- RUCKUS FastIron Command Reference Guide, 10.0.10 bundle metadata: https://docs-be.vistancenetworks.com/api/bundle/fastiron-10010-commandref
- RUCKUS FastIron Command Reference Guide, 10.0.10 support page: https://support.ruckuswireless.com/documents/4460-fastiron-10-0-10-ga-command-reference-guide
- `ipv6 unicast-routing`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-78E203E1-AE2D-45C2-8CDA-D7492F9C72DB.html
- `interface ve`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-8165FDC3-AEC2-465E-9D91-30E1354D8D53.html
- `vlan`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-6486E07E-29CD-4A59-8561-6AF57E96BA75.html
- `ipv6 nd prefix-advertisement`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-293154A6-D56C-40A4-B71E-7F0151AD291E.html
- `ipv6 router ospf`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-E1FACAE3-0B0E-4F6F-BEF4-3AE2F5EE6299.html
- `ipv6 ospf area`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-A3A7028B-6EA2-405C-A758-4293F820FB90.html
- `area (OSPFv3)`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-55B91C1A-D0E4-479B-B282-910BBB38C59D.html
- `ipv6 access-list`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-91441808-8143-4F4B-85FC-9CD0AABDDAE2.html
- `sequence (permit | deny in IPv6 ACLs)`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-B8BD6243-92AA-46CE-817A-D0BAE845C4D5.html
- `ipv6 access-group`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-C383111A-7BB7-44CB-980F-CBD4F93DCB45.html
- `show ipv6 interface`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-97DE6276-5162-463D-8D6E-32124290C36E.html
- `show ipv6 neighbor`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-16E34A14-3FB0-4828-8966-239DC473016C.html
- `show ipv6 access-list`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-3D809E61-FBB0-42FA-ABAD-57DB21DB28FE.html
- `show ipv6 ospf neighbor`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-59C51AC3-FA33-42B6-A0D8-0183969C7385.html
- `ping`: https://docs-be.vistancenetworks.com/bundle/fastiron-10010-commandref/page/GUID-B1E8FC7E-5D6F-4C17-860C-F0B6F6A3F1E1.html

## Issues Found
- Removed `ipv6 cef`. It is not documented in the FastIron 10.0.10 command reference, so the post was claiming an unsupported command.
- Fixed the VLAN/VE configuration order. FastIron requires the VLAN to exist before creating `interface ve 100`, so the VE example was moved to the VLAN step.
- Corrected the example so `ethernet 1/1/1` is not both a routed IPv6 interface and an untagged VLAN member. The VLAN access-port range now starts at `1/1/2`, and OSPFv3 on the physical interface now uses the routed port `1/1/1` instead of the tagged VLAN trunk.
- Replaced the Router Advertisement prefix command with the documented `ipv6 nd prefix-advertisement` syntax and lifetime arguments.
- Fixed the default static-route example from the invalid address `2001:db8:isp::1` to valid IPv6 next-hop addresses.
- Corrected the OSPFv3 router-mode prompt from `config-ipv6-ospf-router` to the documented `config-ospf6-router`.
- Corrected IPv6 ACL creation from `ipv6 access-list extended ...` to the documented `ipv6 access-list ...` syntax and updated the submode prompt accordingly.
- Corrected verification commands from `show ipv6 interface brief`, `show ipv6 neighbors`, and `show access-list ipv6 ...` to the documented `show ipv6 interface`, `show ipv6 neighbor`, and `show ipv6 access-list ...` forms.
- Updated the conclusion to refer to FastIron's IPv6 ACL format instead of the IPv4-style `extended` ACL terminology.

## Review Notes
- The vendor documentation for `ipv6 nd prefix-advertisement` is internally inconsistent: the syntax block shows `auto-config`, while the embedded example line shows `autoconfig`. The post was updated to match the syntax form shown in the command reference.
- Validation was performed against the current RUCKUS FastIron 10.0.10 command reference bundle available on April 30, 2026. No hands-on device execution was performed during review.
