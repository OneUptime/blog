# Validation Summary: How to Configure Site-to-Site IPv6 VPN with IPsec

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6
- IPsec and IKEv2
- strongSwan with swanctl
- Linux XFRM policy routing
- systemd
- ip6tables
- tcpdump

## Sources Consulted
- strongSwan swanctl.conf reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan algorithm proposals reference: https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan swanctl command reference: https://docs.strongswan.org/docs/latest/swanctl/swanctl.html
- strongSwan swanctl --initiate reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlInitiate.html
- strongSwan Linux routing notes: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan route-based VPN and XFRM interface notes: https://docs.strongswan.org/docs/5.9/features/routeBasedVpn.html
- strongSwan Debian/Ubuntu installation guidance: https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan charon-systemd documentation: https://docs.strongswan.org/docs/latest/daemons/charon-systemd.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- Linux ip-xfrm(8) manual: https://man7.org/linux/man-pages/man8/ip-xfrm.8.html
- tcpdump(1) manual: https://man7.org/linux/man-pages/man1/tcpdump.1.html
- Ubuntu package metadata checked locally with `apt-cache` for `charon-systemd`, `strongswan-swanctl`, `strongswan`, and `libcharon-extra-plugins`

## Issues Found
- The original example IPv6 addresses used non-hex placeholders such as `site1`, `site2`, `net`, and `gw1` inside addresses. Replaced them with valid RFC 3849 documentation-prefix examples such as `2001:db8:1::/48`, `2001:db8:2::/48`, and `2001:db8:100::1`.
- The package/service instructions mixed the legacy `strongswan` metapackage with a swanctl-based setup. Changed the install command to use `charon-systemd` with `strongswan-swanctl`, matching strongSwan's Debian/Ubuntu guidance and the `strongswan.service` unit name.
- The PSK example used `secret = "$(openssl rand -base64 32)"`, which would be read literally from the config file rather than shell-expanded. Added an explicit `openssl rand -base64 32` generation step and changed both gateway configs to use the same replacement placeholder.
- The ESP proposal included `prfsha256` in `esp_proposals`. Replaced it with `aes256gcm16-ecp256`, matching strongSwan's ESP proposal format for AES-GCM with PFS.
- Removed `dpd_timeout` from the IKEv2 connection example because strongSwan documents that it has no effect for IKEv2 connections.
- Corrected the routing verification section. The original expected a route on an XFRM interface, but the post did not configure route-based XFRM interfaces; strongSwan's default policy-based routes are installed in table `220`.
- Corrected `swanctl --initiate child:site1-site2-traffic` to the documented `swanctl --initiate --child site1-site2-traffic` form.
- Replaced `ping6` with current `ping -6` syntax.
- Moved `tcpdump` options before the capture filter for portable command syntax.
- Updated all firewall, ping, route, and expected-output examples to use the corrected IPv6 prefixes.

## Review Notes
- The `ip6tables` examples are syntactically valid, but nftables is often preferred on newer Linux distributions.
- The tcpdump ESP filter is appropriate for native ESP traffic. If ESP is UDP-encapsulated, operators may also need to inspect UDP port `4500`.
