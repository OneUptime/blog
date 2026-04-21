# Validation Summary: How to Transition from Flat IPv4 Addressing to a Structured Subnet Design

## Status
validated

## Post Type
Technical guide / migration tutorial

## Technologies Covered
- IPv4 private addressing and subnetting
- VLAN segmentation and native VLAN behavior
- Cisco-style Layer 3 switch SVI configuration
- DHCP relay and DHCP options
- Nmap host discovery and port scanning
- Linux iproute2 VLAN and address commands
- tcpdump/pcap capture filters
- NetworkManager nmcli
- Windows ipconfig

## Sources Consulted
- Nmap Reference Guide: Host Discovery, Port Specification, and Output formats: https://nmap.org/book/man-host-discovery.html, https://nmap.org/book/man-port-specification.html, https://nmap.org/book/man-output.html
- RFC 1918, Address Allocation for Private Internets: https://datatracker.ietf.org/doc/html/rfc1918
- Cisco Catalyst VLAN trunk documentation: https://www.cisco.com/en/US/docs/switches/lan/catalyst3850/software/release/3.2_0_se/multibook/configuration_guide/b_consolidated_config_guide_3850_chapter_0100010.html
- Cisco IOS DHCP relay documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/15-mt/dhcp-15-mt-book/config-dhcp-relay-agent.html
- Cisco Catalyst IP addressing command documentation: https://www.cisco.com/c/en/us/td/docs/switches/campus-lan-switches-access/Catalyst-1200-and-1300-Switches/cli/C1300-cli/ip-addressing-commands.html
- Cisco IOS Telephony Services DHCP option 150 documentation: https://www.cisco.com/c/en/us/td/docs/ios/12_2/12_2x/12_2xt/feature/guide/ipkey2.html
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://datatracker.ietf.org/doc/html/rfc2132
- iproute2 ip-link and ip-address man pages: https://manpages.debian.org/testing/iproute2/ip-link.8.en.html, https://manpages.debian.org/testing/iproute2/ip-address.8.en.html
- pcap-filter man page for tcpdump filter syntax: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- NetworkManager nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Microsoft ipconfig documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- ISC DHCP lifecycle notice: https://www.isc.org/dhcp/

## Issues Found
- The Nmap examples used deprecated grepable output (`-oG`). Replaced them with current normal output (`-oN`) examples and updated the parsing commands and grep patterns accordingly.
- The discovery command claimed to find "all active devices." Nmap host discovery only identifies hosts that respond to its probes, so the wording now says "responding devices."
- The target design used `10.1.x.x` subnets while the old network example was `10.0.0.0/8`. That overlaps the old on-link prefix and can break phased routing/DNS cutover for unmigrated clients. Updated the structured example to use non-overlapping RFC 1918 `172.16.x.x` subnets during migration.
- The summary line said all new networks were `10.1.X.0/24` even though the design included `/28` and `/27` networks. Updated it to "right-sized prefixes."
- The IoT VLAN label said "isolated, no internet" without noting that VLANs alone do not enforce that. Clarified that isolation requires ACL/firewall policy.
- The native VLAN label described "untagged management traffic," conflicting with the separate management VLAN. Changed it to an unused native VLAN for untagged trunk traffic.
- The configuration comment mixed router-on-a-stick and SVI configuration, but the snippet uses `interface Vlan...` SVIs. Updated the comment to "Layer 3 switch SVIs."
- The server migration example added a new subnet address directly to `eth0`, which is not sufficient when the new subnet is on a separate VLAN. Updated the example to create a tagged VLAN interface (`eth0.20`), add the new IP there, and keep the old flat-network IP during transition.
- Added `sudo` where Linux networking changes and tcpdump capture normally require elevated privileges, and made the tcpdump filters explicit with `dst host`.
- Replaced the ISC `dhclient` client-renewal example with a NetworkManager `nmcli device disconnect/connect` example because ISC DHCP client is no longer maintained for production use.

## Review Notes
The examples still use placeholder interfaces such as `eth0` and `wlan0`; real deployments should substitute the correct interface names and validate switch trunking, DHCP relay, ACL/firewall policy, DNS TTLs, and rollback paths before cutover. Scanning an entire `/8` with Nmap is syntactically valid but operationally expensive and should be scoped carefully.
