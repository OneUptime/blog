# Validation Summary: How to Configure DHCP Option 82 (Relay Agent Information)

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP
- DHCP Option 82 / Relay Agent Information Option
- Cisco IOS DHCP relay
- ISC DHCP (`dhcpd`)
- dnsmasq
- `tcpdump`
- `tshark` / Wireshark

## Sources Consulted
- RFC 3046, DHCP Relay Agent Information Option: https://datatracker.ietf.org/doc/html/rfc3046
- Cisco IOS DHCP Relay Agent guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/15-sy/dhcp-15-sy-book/dhcp-relay-agent.html
- Cisco DHCP Snooping guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/dhcp-snooping.pdf
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- dnsmasq man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Wireshark display filter reference for BOOTP/DHCP: https://www.wireshark.org/docs/dfref/b/bootp.html
- ISC DHCP end-of-life notice: https://kb.isc.org/docs/isc-dhcp-eol-dates

## Issues Found
- The post described Remote-ID as identifying the relay agent itself. RFC 3046 defines Remote-ID as a globally unique identifier for the remote host end of the circuit or another relay-defined opaque identifier. I corrected that description.
- The dnsmasq section claimed that `log-dhcp` logs Option 82 data with a `relay-agent-info` tag. I could not verify that behavior in the official dnsmasq documentation. I replaced the section with supported dnsmasq behavior: matching relay agent data with `dhcp-circuitid` and `dhcp-remoteid`, plus the documented `DNSMASQ_CIRCUIT_ID` and `DNSMASQ_REMOTE_ID` script environment variables.
- The `tshark` example used incorrect Wireshark field names (`bootp.option.agent_info_circuit_id` and `bootp.option.agent_info_remote_id`). I replaced them with the documented field names `bootp.option.agent_information_option.agent_circuit_id` and `bootp.option.agent_information_option.agent_remote_id`.
- The DHCP snooping bullet said switches insert Option 82 on trusted uplinks. That is misleading. Cisco documentation distinguishes client-facing/untrusted access traffic from trusted infrastructure links. I corrected the statement to reflect that access switches insert Option 82 for client-facing traffic and upstream DHCP infrastructure can then validate or use it.
- The key takeaways summarized Remote-ID as “switch” metadata. I adjusted that wording to avoid repeating the incorrect Remote-ID interpretation.

## Review Notes
- The Cisco IOS relay configuration shown is valid for enabling Option 82 insertion globally and trusting relay information on a specific interface.
- The ISC DHCP policy syntax shown is valid, but ISC DHCP itself is end-of-life according to ISC. The example remains useful for legacy environments, but new deployments should generally prefer Kea or another actively maintained DHCP server.
