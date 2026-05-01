# Validation Summary: How to Use DHCPv6 Relay Interface ID (Option 18)

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- DHCPv6 relay agents
- RFC 8415 Interface-ID option (Option 18)
- Cisco IOS XE DHCPv6 relay
- Juniper Junos DHCPv6 relay
- ISC DHCP `dhcrelay`
- ISC Kea DHCPv6 server
- `tcpdump`
- `tshark` / Wireshark
- Python

## Sources Consulted
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
- Cisco IOS XE 17.x, IPv6 Access Services: DHCPv6 Relay Agent: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-dhcp-rel-agent-xe-1.html
- Cisco IOS XE, DHCPv6 Relay Reload Persistent Interface ID Option: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-dhcp-rel-agent-xe-1.html
- Juniper DHCPv6 Relay Agent overview: https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-relay-agent.html
- Juniper CLI reference, `relay-agent-interface-id`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/relay-agent-interface-id-edit-forwarding-options.html
- Juniper CLI reference, `use-interface-description`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/use-interface-description-edit-forwarding-options.html
- ISC DHCP 4.4 manual page for `dhcrelay`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- Kea ARM, Client Classification: https://kea.readthedocs.io/en/latest/arm/classify.html
- Kea ARM, DHCPv6 server: https://kea.readthedocs.io/en/latest/arm/dhcp6-srv.html
- Wireshark Display Filter Reference for DHCPv6: https://www.wireshark.org/docs/dfref/d/dhcpv6.html
- Local `tcpdump --help` output for current CLI syntax

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8::dhcp-server`. These were replaced with valid documentation addresses.
- The Cisco section claimed a custom `ipv6 dhcp relay option interface-id ifname` command. Current Cisco IOS XE DHCPv6 relay documentation does not document that command; the section was corrected to show the supported relay configuration and the documented persistent short-form interface-ID behavior.
- The Juniper section used incorrect Junos syntax (`v6 group ... interface-id-option ...`). It was corrected to the documented `dhcpv6` and `relay-agent-interface-id` hierarchy and a valid optional formatting example.
- The Linux `dhcrelay -6` example was incorrect. ISC documents DHCPv6 relay with `-l` and `-u`, and `-I` is required to force Option 18 when there is only one downstream interface. The bogus positional server argument was removed and replaced with valid `address%interface` syntax.
- The Linux section incorrectly stated that `dhcrelay` automatically sends the interface name as Option 18. ISC documents only when Option 18 is sent, not that it is always sent or that the payload is the interface name, so the text was corrected.
- The Wireshark/TShark example used `dhcpv6.option.value`, which is obsolete in current Wireshark releases. It was updated to `dhcpv6.option.data` and the output fields were adjusted accordingly.
- The Kea example was updated to use current `client-classes` subnet syntax and to keep the example Interface-ID value consistent with the revised Cisco short-form interface name example.
- The explanation and conclusion overstated Option 18 as if it were always an interface name. RFC 8415 defines it as an opaque relay-supplied value, so the wording was corrected.

## Review Notes
- Kea examples in current documentation show `client-classes` in modern configurations; older examples may still use `client-class`.
- Wireshark field names are version-sensitive. The updated example matches the current display-filter reference, but older Wireshark versions may still expose `dhcpv6.option.value`.
- RFC 8415 requires servers and relays to treat Interface-ID as opaque. Operationally, many platforms encode interface names, VLAN identifiers, or structured relay-specific data, so exact values remain implementation-specific.
