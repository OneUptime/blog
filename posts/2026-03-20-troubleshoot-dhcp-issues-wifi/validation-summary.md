# Validation Summary: How to Troubleshoot DHCP Issues on WiFi Networks

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- DHCPv4 and the DORA lease process
- WiFi DHCP client troubleshooting
- ISC dhclient
- ISC DHCPD / isc-dhcp-server
- NetworkManager and journald
- Windows DHCP Client events and ipconfig
- macOS ipconfig and Wireless Diagnostics logging
- dnsmasq
- Cisco IOS DHCP server commands
- tcpdump / packet capture filters
- iptables firewall rules

## Sources Consulted
- RFC 2131: Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- RFC 3927: Dynamic Configuration of IPv4 Link-Local Addresses: https://datatracker.ietf.org/doc/html/rfc3927
- ISC DHCP 4.4 dhclient manual page: https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 dhcpd.conf manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 dhcpd.leases manual page: https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpdleases
- Ubuntu Server DHCP documentation: https://ubuntu.com/server/docs/explanation/networking/about-dhcp/
- dnsmasq manual page: https://dnsmasq.org/docs/dnsmasq-man.html
- Microsoft Learn DHCP client troubleshooting: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/troubleshoot-problems-dhcp-client
- Cisco IOS IP Addressing Services Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-r1.html
- tcpdump(8) manual page: https://man.bsd.lv/tcpdump.8
- iptables-extensions(8) manual page: https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html
- macOS wdutil(8) manual page mirror: https://manp.gs/mac/8/wdutil
- macOS ipconfig(8) manual page mirror: https://www.manpagez.com/man/8/ipconfig/osx-10.6.php

## Issues Found
- The Linux dhclient example used `sudo dhclient -v -i wlan0`. In ISC dhclient, `-i` enables RFC4361-style DHCPv4 client IDs and does not select the interface. Changed it to `sudo dhclient -v wlan0`.
- The APIPA statement was too absolute for non-Windows clients. Changed it to say DHCP failure can leave the client without a DHCP lease or with an IPv4 link-local fallback address.
- The Windows DHCP event log path pointed to Windows Logs > System. Microsoft documents DHCP client events under Applications and Services Logs, so the Event Viewer path was updated.
- The macOS logging instruction pointed to `/var/log/system.log`. Updated it to use `wdutil log +dhcp` and `wdutil dump` around the `ipconfig` DHCP reset commands.
- The ISC DHCPD lease command was described as showing active leases, but `dhcpd.leases` is log-structured and can contain older declarations. Changed the wording to "inspect raw lease entries."
- The Cisco IOS command `show ip dhcp statistics` was incorrect for DHCP server statistics. Changed it to `show ip dhcp server statistics`.
- The ISC DHCPD interface example mixed older `INTERFACES` wording with current `INTERFACESv4` usage. Updated the example comment to `INTERFACESv4="eth0"`.
- The `dhclient -1` example was labeled as forcing a renewal. The option means "try once" and exit on failure, so the comment was corrected.
- The tcpdump filters matched any protocol using ports 67/68 and placed `-vv` after the filter expression. Updated them to `tcpdump -i wlan0 -n -vv 'udp and (port 67 or port 68)'` and the matching pcap command.
- The packet-capture interpretation was too definitive. Updated the comments to account for blocked replies as well as server rejection.
- The lease-clearing example truncated the ISC lease database while the server was running and without a backup. Replaced it with a stop, backup, truncate, and start sequence, with a warning that the server forgets active leases.
- The iptables example allowed inbound destination port 68 on a DHCP server. Updated it to allow inbound client requests to UDP/67 and outbound server replies from UDP/67 to UDP/68.

## Review Notes
ISC DHCP is EOL upstream and deprecated/unsupported for new Ubuntu 24.04+ deployments; the post now labels ISC DHCPD as legacy, but the commands remain useful for existing installations. Interface names such as `wlan0`, `en0`, and `eth0` are examples and may differ by system. The `grep "no free leases" /var/log/syslog` example is distribution-dependent; systems using journald may need equivalent journal queries.
