# Validation Summary: How to Configure DHCPv6 Relay on Juniper

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos
- DHCPv6 relay
- IPv6 Router Advertisements
- Juniper MX Series
- Juniper EX Series
- VRFs / routing-instances

## Sources Consulted
- Juniper DHCPv6 Relay Agent: https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-relay-agent.html
- Juniper CLI reference for `dhcpv6` under `forwarding-options dhcp-relay`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/dhcpv6-edit-forwarding-options.html
- Juniper CLI reference for `relay-agent-interface-id`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/relay-agent-interface-id-edit-forwarding-options.html
- Juniper DHCPv6 monitoring and management commands: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcpv6-monitoring-and-management.html
- Juniper common DHCP group/server-group configuration: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcp-common-config-interface-group.html
- Juniper router advertisement CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-advertisement-edit-protocols.html
- Juniper VLAN `l3-interface` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/l3-interface-edit-vlans-qfx-series.html
- Juniper `ping` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 8415, DHCP for IPv6: https://www.rfc-editor.org/rfc/rfc8415

## Issues Found
- The post used the wrong Junos DHCPv6 relay hierarchy (`dhcp-relay v6`) and mixed in DHCPv4/BOOTP helper syntax. I corrected the examples to use the documented `forwarding-options dhcp-relay dhcpv6` hierarchy only.
- Several example IPv6 server addresses were invalid placeholders such as `2001:db8::dhcp-server`, `2001:db8::dhcp1`, and `2001:db8::dhcp2`. I replaced them with valid documentation-prefix IPv6 addresses.
- The Option 18 example used `interface-id-option include`, which is not the documented Junos knob for DHCPv6 relay. I changed it to `relay-agent-interface-id`, which is the correct Junos statement for inserting DHCPv6 Interface-ID.
- The VRF example repeated the same incorrect `v6` hierarchy. I corrected the routing-instance example to `routing-instances <name> forwarding-options dhcp-relay dhcpv6 ...`.
- The router advertisement section omitted a prefix, which Junos requires for RA prefix advertisement and for a practical client-facing RA configuration. I added a prefix line so the example is operationally complete.
- The EX switch example created a VLAN and IRB address but did not bind the VLAN to the IRB. I added `set vlans CLIENTS-VLAN l3-interface irb.100`, which is required to associate the routed VLAN interface with the VLAN.
- The verification and troubleshooting sections used incorrect DHCPv6 operational commands such as `show dhcp v6 relay statistics`, `show dhcp v6 relay binding`, and `clear dhcp v6 relay statistics all`. I corrected them to the documented `show dhcpv6 relay ...` and `clear dhcpv6 relay statistics` forms.
- The post referenced non-documented operational commands like `show dhcp v6 relay server-group` and `show dhcp v6 relay group`. I replaced them with configuration inspection commands that are valid Junos CLI commands for verifying configured DHCPv6 relay server groups and interface groups.
- The troubleshooting example used `routing-instance default` with `ping`, which is incorrect for Junos because the default/master routing instance is not named `default` in CLI usage. I replaced it with a plain reachability check against a valid IPv6 address.
- The tracing example used an unrelated override and an incomplete `system tracing destination-override syslog` statement. I replaced it with a valid DHCPv6 relay interface trace statement under the documented hierarchy.
- The introduction and conclusion incorrectly described DHCPv6 relay as using `dhcp-local-server` or `dhcp-relay v6`. I corrected both to the documented relay hierarchy and clarified that RA is still needed so hosts learn the prefix and default gateway.

## Review Notes
- The Juniper documentation is clear that DHCPv6 relay configuration lives under `forwarding-options dhcp-relay dhcpv6`, while DHCPv6 local server configuration is a separate feature and hierarchy.
- Router Advertisements remain necessary in IPv6 deployments even when clients use DHCPv6, because hosts still learn the default gateway and related link information from RA.
- EX Series support for DHCPv6-related features can vary by model and release, so future revisions should consider adding a short platform/release caveat or pointing readers to Juniper Feature Explorer.
