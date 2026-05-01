# Validation Summary: How to Configure DHCPv6 Relay to Multiple Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- DHCPv6 relay agents
- ISC DHCP `dhcrelay`
- ISC DHCP `dhclient`
- Cisco IOS DHCPv6 relay
- Junos DHCPv6 relay
- ISC Kea DHCPv6 HA
- MikroTik RouterOS DHCPv6 relay

## Sources Consulted
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415
- ISC DHCP 4.4 `dhcrelay` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- ISC DHCP 4.4 `dhclient` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- Cisco IOS `ipv6 dhcp relay destination` command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Juniper `active-server-group` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/active-server-group-edit-forwarding-options.html
- Juniper `server-group` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/server-group-edit-forwarding-options.html
- Juniper DHCP relay group/server-group configuration guide: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcp-common-config-interface-group.html
- Kea Administrator Reference Manual, HA hook library: https://kea.readthedocs.io/en/stable/arm/hooks.html
- MikroTik RouterOS DHCP documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/24805500/DHCP

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8::dhcp1`. These were replaced with valid documentation addresses so the examples are syntactically correct.
- The DHCPv6 client-selection explanation was inaccurate. RFC 8415 says clients collect valid ADVERTISE messages and select based on preference and advertised parameters, rather than simply using the first ADVERTISE received. The prose, diagram labels, and conclusion were corrected.
- The Linux `dhcrelay -6` example used DHCPv4-style positional server arguments. ISC documents DHCPv6 relay destinations with repeated `-u [address%]ifname` arguments, so the command was corrected.
- The Junos example used the wrong DHCPv6 hierarchy (`v6` instead of `dhcpv6`) and included a `backup-server-group` example that is not documented for this relay configuration. It was replaced with a valid DHCPv6 server-group and interface-group example.
- The Kea HA snippet was missing the `libdhcp_lease_cmds.so` hook library required by HA operation. It was added, and the peer URLs were corrected to valid IPv6 literals.
- The MikroTik section incorrectly claimed RouterOS lacks native support for multiple DHCPv6 relay targets. Current RouterOS documentation shows `/ipv6 dhcp-relay` accepts a list of DHCPv6 server addresses, so the section was replaced with a native multi-target example using `link-address`.
- The test example was tightened by switching to `ping -6` with valid addresses and `dhclient -6 -1 -v` for a single-attempt DHCPv6 test.

## Review Notes
- Multi-server relay by itself does not synchronize lease state between servers. True failover behavior for renew/rebind flows depends on server-side HA or other lease-state coordination.
- The Kea HA snippet is only the DHCPv6 server-side fragment for one peer. A production deployment also needs the matching peer configuration and reachable control endpoints for both servers.
