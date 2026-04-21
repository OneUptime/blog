# Validation Summary: How to Troubleshoot DHCP Relay Agent Not Forwarding Requests

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- DHCPv4
- DHCP relay agents
- Cisco IOS `ip helper-address`
- Cisco IOS DHCP troubleshooting commands
- ISC DHCP Server (`dhcpd`)
- ISC DHCP Relay (`dhcrelay`)
- Linux routing and firewall tools
- `tcpdump` / libpcap filters
- Windows `ipconfig`

## Sources Consulted
- RFC 2131: Dynamic Host Configuration Protocol - https://www.rfc-editor.org/rfc/rfc2131
- Cisco IOS DHCP Relay Agent configuration guide - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/12-4/dhcp-12-4-book/config-dhcp-relay-agent.html
- Cisco IOS IP Addressing Services Command Reference for `show ip dhcp server statistics` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-r1.html
- ISC DHCP 4.4 `dhcrelay` manual page - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- ISC DHCP 4.4 `dhclient` manual page - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 `dhcpd.conf` manual page - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- Red Hat Enterprise Linux 9 DHCP relay documentation - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/providing-dhcp-services_networking-infrastructure-services
- Microsoft `ipconfig` command documentation - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- iproute2 `ip-route(8)` manual page - https://man7.org/linux/man-pages/man8/ip-route.8.html
- systemd `journalctl` manual page - https://www.freedesktop.org/software/systemd/man/254/journalctl.html
- libpcap `pcap-filter(7)` manual page - https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `iptables-extensions(8)` manual page - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The diagram used DHCP server `192.168.1.1`, while the rest of the post used `192.168.1.100`. Updated the diagram and helper-address note to `192.168.1.100` for consistency.
- The relay-to-client offer and acknowledge messages were described as always broadcast. RFC 2131 allows relay agents to broadcast or unicast to the client depending on the broadcast flag and client capability, so the wording was corrected.
- The client diagnostic note implied that `No DHCPOFFERS received` proves the relay is not forwarding. That symptom can also be caused by DHCP server, routing, firewall, or scope problems, so the wording now says the DHCP path is failing.
- The VLAN comparison note was too narrow because a single failing VLAN can indicate relay, routing, firewall, or DHCP scope issues. It now refers to the VLAN 10 path/config.
- Replaced `show ip dhcp relay information statistics` with the documented Cisco IOS `show ip dhcp server statistics` command for DHCP message counters.
- Marked ISC DHCPD as legacy/EOL based on ISC documentation, while keeping the existing ISC-focused troubleshooting example intact.
- Corrected Linux relay firewall examples. `dhcrelay` processes relay traffic locally, so the example now allows inbound UDP destination port 67 and outbound UDP destination ports 67 and 68 instead of using FORWARD-chain rules.
- Updated the RHEL/CentOS install command from the older `yum install dhcp` form to the current `dnf install dhcp-relay` package and added the correct `dhcrelay.service` service-name caveat.
- Quoted the `tcpdump` filter expression and changed the capture walkthrough from an absolute expected flow to a typical broadcast flow, with a note that replies to the client can be unicast.

## Review Notes
ISC DHCP is end-of-life upstream; the post is still useful for existing ISC DHCP deployments, but future updates should consider Kea DHCP or distribution-supported relay alternatives. The iptables commands are valid examples for legacy iptables systems, but many current Linux distributions use nftables or firewalld as the primary firewall interface.
