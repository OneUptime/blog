# Validation Summary: How to Troubleshoot IPv6 Connectivity Issues on RHEL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- IPv6 addressing, routing, Router Advertisements, Neighbor Discovery, and Path MTU Discovery
- NetworkManager and nmcli
- iproute2 commands
- iputils ping/ping6
- tcpdump packet capture filters
- firewalld ICMP type inspection
- DNS AAAA resolution

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld icmptype documentation: https://firewalld.org/documentation/icmptype/
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- RFC 4861, Neighbor Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 8200, Internet Protocol, Version 6 Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201
- Google Public DNS documentation: https://developers.google.com/speed/public-dns/docs/using
- Cloudflare 1.1.1.1 IP address documentation: https://developers.cloudflare.com/1.1.1.1/ip-addresses/
- iputils ping manual/help output for `-6`, `-c`, and `-s`
- tcpdump command help output and pcap filter syntax

## Issues Found
- The tcpdump Router Advertisement command placed `-c 3` after the capture filter expression. This can be parsed as part of the filter instead of as a tcpdump option, so it was changed to put `-c 3` before the quoted filter.
- The external connectivity test used `2600::` as a "well-known" IPv6 address. That address is not a suitable public diagnostic target, so it was replaced with Cloudflare's documented public resolver address `2606:4700:4700::1111`.
- The DNS troubleshooting explanation implied that IPv4 DNS servers might not support AAAA lookups. DNS transport address family is independent of record type, so the text was corrected to focus on AAAA filtering or DNS servers being unreachable from the current network.
- The Path MTU example used `ping6 -s 1500`, but `-s` specifies ICMP payload bytes. On a 1500-byte path, 1452 bytes of payload plus the 40-byte IPv6 header and 8-byte ICMPv6 header produces a 1500-byte packet, so the example was changed to `-s 1452`.

## Review Notes
The remaining commands and explanations are technically sound for a RHEL 9 troubleshooting guide. The post uses `ping6`, which is commonly still available as an alias or compatibility command on RHEL-like systems, though `ping -6` is also supported by modern iputils.
