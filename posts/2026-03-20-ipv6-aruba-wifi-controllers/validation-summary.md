# Validation Summary: How to Configure IPv6 on Aruba Wi-Fi Controllers

## Status
validated

## Post Type
Guide

## Technologies Covered
- ArubaOS 8.x wireless controllers
- Aruba Instant (IAP)
- IPv6
- Router Advertisements (RA)
- SLAAC
- DHCPv6
- RADIUS / ClearPass

## Sources Consulted
- HPE Aruba Networking AOS-8.x CLI Bank: `ipv6 enable` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/ipv6-enable.htm
- HPE Aruba Networking AOS-8.x CLI Bank: `interface vlan` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/interface-vlan.htm
- HPE Aruba Networking AOS-8.x CLI Bank: `interface mgmt` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/interface-mgmt.htm
- HPE Aruba Networking AOS-8.x CLI Bank: `ipv6 dhcp pool` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/ipv6-dhcp-pool.htm
- HPE Aruba Networking ArubaOS 8.x User Guide: DHCPv6 server and RA configuration - https://arubanetworking.hpe.com/techdocs/ArubaOS-8.x-Books/810/ArubaOS-8.10.0.0-User-Guide.pdf
- HPE Aruba Networking AOS-8.x CLI Bank: `ip access-list session` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/ip-acc-list-sess.htm
- HPE Aruba Networking AOS-8.x CLI Bank: `show ipv6 interface` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/sh-v6-interface.htm
- HPE Aruba Networking AOS-8.x CLI Bank: `show ipv6` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/sh-ipv6.htm
- HPE Aruba Networking AOS-8.x CLI Bank: `show ipv6 dhcp` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/sh-ipv6-dhcp.htm
- HPE Aruba Networking AOS-8.x CLI Bank: `show ipv6 ra` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/sh-v6-ra.htm
- HPE Aruba Networking AOS-8.x CLI Bank: `ping` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/ping.htm
- HPE Aruba Networking AOS-8.x CLI Bank: `show ipv6 user-table` - https://arubanetworking.hpe.com/techdocs/CLI-Bank/Content/aos8/sh-v6-usr-tab.htm
- HPE Aruba Networking ArubaOS 8.x archived help: Debugging IPv6 (`tracepath`) - https://arubanetworking.hpe.com/techdocs/Archived/AOS-8/ArubaOS_85_Web_Help/Content/arubaos-solutions/ipv6/debugv6.htm
- HPE Aruba Networking ArubaOS 8.x archived help: Working with IPv6 RAs - https://arubanetworking.hpe.com/techdocs/Archived/AOS-8/ArubaOS_81_Web_Help/Content/ArubaFrameStyles/IPv6/IPv6_Router_Advertisemen.htm
- HPE Aruba Networking Instant AOS 8.12 User Guide: IPv6 support and `virtual-controller-ipv6` - https://arubanetworking.hpe.com/techdocs/Aruba-Instant-8.x-Books/812/Aruba-Instant-8.12.0.0-User-Guide.pdf
- HPE Aruba Networking Instant archived help: enabling IPv6 support - https://arubanetworking.hpe.com/techdocs/Archived/Instant-AOS-8/Instant_85_WebHelp/Content/instant-ug/ipv6/enabling-ipv6.htm
- RFC 3162: RADIUS and IPv6 - https://www.rfc-editor.org/rfc/rfc3162
- RFC 6911: RADIUS Attributes for IPv6 Access Networks - https://www.rfc-editor.org/rfc/rfc6911

## Issues Found
- The sample IPv6 addresses `2001:db8::controller`, `2001:db8::mgmt`, `2001:db8:wifi::1`, `2001:db8::gateway`, and `2001:db8::dhcp-server` were not valid IPv6 literals. I replaced them with syntactically valid documentation-prefix examples.
- The post used interface-level `ipv6 enable` commands that do not match ArubaOS 8 controller syntax. I corrected this to the global `ipv6 enable` command and kept IPv6 addressing on the VLAN and management interfaces.
- The out-of-band management example used `interface gigabitethernet 0/0/0`, which is not the ArubaOS 8 management-interface configuration syntax. I replaced it with `interface mgmt`, which is the documented command for supported 7000 Series controllers.
- The default route example used `ipv6 route ::/0 ...` for the controller management path. I corrected it to the documented `ipv6 default-gateway` form used in ArubaOS 8 documentation.
- The DHCPv6 pool example used an incorrect lease format and an unsupported `address prefix` subcommand. I corrected the lease syntax to four fields and replaced the pool definition with the documented `network` subcommand.
- The DHCPv6 interface example set RA-related flags with the wrong command form and did not explicitly enable RA. I corrected the syntax to `ipv6 nd ra ...` and enabled RA so stateful DHCPv6 still advertises the default router properly.
- The SLAAC section used non-Aruba command forms such as `ipv6 nd prefix`, `ipv6 nd ra-interval`, `ipv6 nd ra-lifetime`, and `ipv6 nd dns-server`. I replaced them with the documented ArubaOS 8 forms `ipv6 nd ra prefix`, `ipv6 nd ra interval`, `ipv6 nd ra life-time`, and `ipv6 nd ra dns`.
- The SLAAC example claimed "DNS via RA" while also setting the DHCPv6 other-config flag. I removed the RA flags in that SLAAC-only example so the explanation matches the configuration.
- The firewall ACL rules used invalid or non-idiomatic Aruba service syntax, including incorrect DHCPv6 ports. I replaced them with Aruba session-ACL service objects such as `svc-v6-icmp`, `svc-v6-dhcp`, `svc-http`, `svc-https`, and `svc-dns`.
- The ClearPass section included an unverified filesystem log-path example. I replaced it with Access Tracker verification steps that are documented and align with how ClearPass exposes accounting attributes.
- Several verification commands were wrong for ArubaOS 8, including `show ipv6 nd interface vlan 10`, `show ipv6 nd statistics`, `ping6`, and `traceroute6`. I replaced them with documented ArubaOS 8 commands such as `show ipv6 ra status`, `ping ipv6`, and `tracepath`.
- The Instant AP section used controller-style IPv6 VLAN and DHCPv6 relay commands that are not documented for Instant AOS 8. I replaced that block with the documented Instant flow using `ip-mode v4-prefer`, `virtual-controller-ipv6`, and `commit apply`.
- The opening and closing explanations overstated controller centralization for all Aruba WLAN deployments. I narrowed both statements to tunnel-forwarded deployments so they are accurate for Aruba forwarding modes.

## Review Notes
- On ArubaOS 8 7000/7200 controllers, enabling IPv6 globally requires a reboot before IPv6 features become operational.
- The `interface mgmt` example is specific to supported out-of-band management hardware; many controller deployments use in-band VLAN interfaces instead.
- The Instant example now covers documented IPv6 management configuration for the virtual controller. It does not imply that Instant uses the same controller-side DHCPv6 or RA CLI as ArubaOS 8 controllers.
