# Validation Summary: How to Configure IPv6 for Fiber (GPON) Networks

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- GPON / fiber access networks
- OLT / ONT architecture
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- Router Advertisements (RA) / SLAAC
- Huawei OLT CLI
- Nokia SR OS DHCPv6 relay CLI
- WIDE DHCPv6 (`dhcp6s`, `dhcp6ctl`)
- Bash
- Python `ipaddress`

## Sources Consulted
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 6177, IPv6 Address Assignment to End Sites: https://www.rfc-editor.org/rfc/rfc6177.html
- RFC 7084, Basic Requirements for IPv6 Customer Edge Routers: https://www.rfc-editor.org/rfc/rfc7084
- Huawei `dhcpv6 relay destination` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/17/resources/cli/esap_dhcpv6_relay_destination.html
- Huawei `ipv6 nd ra` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/18/resources/cli_vrp/ipv6_nd_ra.html
- Huawei `ipv6 nd ra prefix` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/18/resources/cli_vrp/ipv6_nd_ra_prefix.html
- Huawei `ipv6 nd autoconfig managed-address-flag` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/18/resources/cli_vrp/ipv6_nd_autoconfig_managed-address-flag.html
- Huawei DHCPv6 relay configuration guide: https://support.huawei.com/enterprise/en/doc/EDOC1100468595/9bcb7026/configuring-the-dhcpv6-relay-function
- Nokia IES IPv6 / DHCPv6 relay documentation: https://documentation.nokia.com/html/0_add-h-f/93-0076-10-01/7750_SR_OS_Services_Guide/Service-IES-CLI.html
- Nokia DHCPv6 relay command reference (`server`, `source-address`): https://documentation.nokia.com/sr/23-10-1/cli-books/classic-cli-command-reference/classic-s-commands.html
- Debian `dhcp6s.conf(5)` man page for WIDE DHCPv6 server syntax: https://manpages.debian.org/unstable/wide-dhcpv6-server/dhcp6s.conf.5.en.html
- Debian `dhcp6s(8)` man page: https://manpages.debian.org/testing/wide-dhcpv6-server/dhcp6s.8.en.html
- Debian `dhcp6ctl(8)` man page: https://manpages.debian.org/trixie/wide-dhcpv6-client/dhcp6ctl.8.en.html

## Issues Found
1. Invalid IPv6 example literals appeared throughout the post, including addresses like `2001:db8:mgmt::olt1/64`, `2001:db8:gpon::1/64`, and `2001:db8:home::/40`. These are not valid IPv6 syntax because the hextets contain non-hexadecimal text. I replaced them with valid documentation-prefix examples.
2. The Huawei OLT example used incorrect DHCPv6 relay and RA commands. I corrected `ipv6 dhcp relay destination` to `dhcpv6 relay destination`, added the required `dhcp enable` / `ipv6` / `ipv6 enable` context, replaced the non-existent `ipv6 nd ra-prefix-interval` with `ipv6 nd ra max-interval`, and corrected `ipv6 nd prefix` to `ipv6 nd ra prefix`.
3. The Huawei section implied DHCPv6 relay without the RA stateful-address signal. I added `ipv6 nd autoconfig managed-address-flag` so the example matches the post’s description of DHCPv6-based WAN addressing.
4. The Nokia section used unverified CLI for a “7360 ISAM” example and included the non-existent `server-address` subcommand. I replaced it with a Nokia SR OS DHCPv6 relay example that matches official Nokia command references (`dhcp6-relay`, `server`, and `source-address`).
5. The `wide-dhcpv6` server example used incorrect `dhcp6s.conf` grammar: `server-preference`, `pool6`, `range6`, and `prefix6` are not valid in `dhcp6s.conf`. I rewrote the example using the documented `preference`, `address-pool`, `pool`, `range ... to ...`, and `prefix` syntax.
6. The original `wide-dhcpv6` example showed a dynamic PD pool that is not represented by the documented `dhcp6s.conf` syntax. I changed the example to a valid DUID-based static delegated prefix example, which is consistent with the post’s concluding guidance.
7. The provisioning script attempted to build a DUID from `get_ont_mac`, which was undefined and also conflated a DHCPv6 client DUID with an ONT MAC address. I changed the script to accept the subscriber CPE’s DUID as an argument and to write a valid `prefix ... infinity;` host entry.
8. The provisioning script reloaded the server using a distribution-specific `systemctl reload wide-dhcpv6-server` command. I replaced it with `dhcp6ctl -S reload`, which is the documented control mechanism for `dhcp6s`.
9. The monitoring section referenced an undocumented `/var/lib/dhcpv6/dhcp6s.leases` file and counted “ONT registrations” with `ip -6 neigh`, which actually counts IPv6 neighbor entries on an interface. I replaced those commands with process/socket checks and accurate neighbor/log inspection commands.
10. The architecture and conclusion text overstated the relay’s role by saying the CPE gets its address and prefix “from OLT’s DHCP relay.” I corrected the wording so the DHCPv6 server is the assigning entity and the OLT is the relay.

## Review Notes
- The WIDE DHCPv6 server is still packaged and documented, but its man page identifies it as old software and notes protocol limitations. The corrected examples are valid for `dhcp6s`, but many production broadband deployments use newer DHCPv6 platforms or DHCPv6 functionality integrated into the BNG/edge.
- The Nokia example is now explicitly SR OS-based because that is the official Nokia CLI documentation I could verify directly. The original “7360 ISAM” label was too specific for the command syntax shown.
- The post’s use of `/56` for residential prefix delegation is reasonable and consistent with RFC 6177 guidance that encourages end sites to receive more than a single `/64`.
