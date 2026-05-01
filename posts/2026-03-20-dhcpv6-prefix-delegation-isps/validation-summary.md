# Validation Summary: How to Configure DHCPv6 Prefix Delegation for ISPs

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DHCPv6
- DHCPv6 Prefix Delegation (`IA_PD`)
- ISC Kea DHCPv6
- Cisco IOS XE DHCPv6
- Juniper MX / Junos DHCPv6
- Linux `iproute2`
- RADIUS

## Sources Consulted
- ISC Kea DHCPv6 server docs: https://kea.readthedocs.io/en/kea-2.7.7/arm/dhcp6-srv.html
- ISC Kea API Reference: https://kea.readthedocs.io/en/kea-2.2.1/api.html
- ISC Kea hook libraries docs: https://kea.readthedocs.io/en/stable/arm/hooks.html
- Cisco IOS XE "Implementing DHCP for IPv6": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/xe-3s/ipv6-xe-36s-book/ip6-dhcp.html
- Juniper DHCPv6 server docs: https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-server.html
- Juniper subscriber LAN addressing with DHCPv6 prefix delegation: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcpv6-prefix-delegation-lan-addressing.html
- Juniper WAN and LAN addressing using DHCPv6 IA_NA and DHCPv6 prefix delegation: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcpv6-iana-prefix-delegation-addressing.html
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415
- RFC 7084, Basic Requirements for IPv6 Customer Edge Routers: https://www.rfc-editor.org/rfc/rfc7084
- RFC 6177, IPv6 Address Assignment to End Sites: https://www.rfc-editor.org/rfc/rfc6177
- RIPE-690, Best Current Operational Practice for Operators: IPv6 prefix assignment for end-users: https://www.ripe.net/publications/docs/ripe-690/
- ARIN Number Resource Policy Manual: https://www.arin.net/participate/policy/nrpm/
- Local `ip -6 route help` output from `iproute2`

## Issues Found
- The Kea example used the ISP aggregate `2001:db8::/32` as the `subnet6` value. In Kea, the subnet identifies the access link or served subnet, while the delegated prefixes come from `pd-pools` and may be from a different prefix. I changed the access subnet to a `/64` and moved the example IA_NA pool into that same access-link subnet.
- The Kea snippet's inline comment said the PD pool delegated from a `/32`, but the configured pool was actually a `/36` (`prefix-len: 36`). I corrected the comment to match the configuration.
- The Cisco example assigned `2001:db8::1/32` to the subscriber-facing interface, which is not an appropriate on-link prefix length for that access interface. I changed it to a `/64`, added `ipv6 unicast-routing`, and changed the RA flag to `ipv6 nd other-config-flag` so the snippet matches Cisco's documented DHCPv6 patterns more closely for PD plus other DHCPv6 information.
- The Juniper example used `prefix-length 56` directly under the pool, but Junos documents delegated-prefix sizing under a named `range ... prefix-length` entry, and the DHCPv6 local server also needs a `delegated-pool` override to use that pool for PD. I corrected the pool syntax and added the delegated-pool binding.
- The post claimed that ARIN and RIPE both recommend at minimum `/56` for residential customers. That overstates ARIN policy. I replaced it with wording that matches the sources: RIPE-690 recommends `/56` for residential and `/48` for business customers, while ARIN's NRPM uses a recommended `/48` provider-assignment unit for IPv6 end sites.
- The Linux route example called a `/56` route a "host route" and used `fe80::cpemac` as a next hop, which is not valid IPv6 route syntax. I changed it to a prefix-route example using a normal link-local next hop and retained the required `dev` parameter.
- The Kea monitoring example parsed the `lease6-get-all` response incorrectly. Kea returns leases inside `arguments.leases`, not as a flat top-level array. I corrected the `jq` filter and noted that `lease6-get-all` requires the `lease_cmds` hook library.
- The note that "Kea can automate this with the radius or run-script hooks" was too broad. Kea's documented open source mechanism here is the run-script hook library, while RADIUS is used to supply policy and attributes rather than to install Linux routes directly. I narrowed the wording to external route automation triggered by Kea hook scripts.

## Review Notes
- No remaining technical inaccuracies were found after the fixes above.
- Kea's API docs note that `lease6-get-all` can return very large responses; for large ISP lease sets, `lease6-get-page` is a better operational choice for monitoring pipelines.
- The Cisco and Juniper snippets are intentionally minimal local-pool examples. Production BNG deployments commonly layer subscriber policy, relay functions, and AAA/RADIUS attributes on top of these basics.
