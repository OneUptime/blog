# Validation Summary: How to Troubleshoot IPv6 Path MTU Discovery Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Path MTU Discovery (PMTUD)
- ICMPv6
- Linux networking tools (`ping`, `tracepath`, `ip`, `tcpdump`, `mtr`)
- Linux firewalling (`ip6tables`, `nftables`, `firewalld`)
- Python (`subprocess`)

## Sources Consulted
- RFC 8201, "Path MTU Discovery for IP version 6": https://www.rfc-editor.org/rfc/rfc8201.html
- RFC 4443, "ICMPv6 (ICMP for IPv6) Specification": https://www.rfc-editor.org/rfc/rfc4443
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls": https://www.rfc-editor.org/rfc/rfc4890
- `ping(8)` iputils manual: https://www.man7.org/linux/man-pages/man8/ping.8%40%40iputils.html
- `tracepath(8)` iputils manual: https://man7.org/linux/man-pages/man8/tracepath.8.html
- `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `iptables-extensions(8)` manual (`TCPMSS` target): https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- `pcap-filter(7)` manual for ICMPv6 filter syntax: https://www.manpagez.com/man/7/pcap-filter/
- Local command help/output checked for `ping -h`, `tracepath -h`, `ip -6 route help`, `mtr --help`, `ip6tables -j TCPMSS -h`, and `tcpdump` filter compilation

## Issues Found
- The post used invalid example IPv6 literals such as `2001:db8::server`. These were replaced with the valid documentation prefix example `2001:db8::1`.
- The post used older command aliases (`ping6`, `tracepath6`). Current iputils documentation documents `ping -6` and `tracepath -6`, and `ping6` is described as an old compatibility name, so the commands were updated.
- The symptom list said "Symmetric failure" while describing a one-direction problem. This was corrected to "Asymmetric failure".
- The key probe command omitted `-M do`, which is important for explicitly testing PMTU behavior with a full-size IPv6 probe. The command and explanation were corrected.
- The `tcpdump` examples matched ICMPv6 type 2 using a raw IPv6-header offset (`ip6[40] == 2`). They were updated to use the clearer `icmp6[icmp6type] == icmp6-packettoobig` filter supported by pcap-filter syntax.
- The PMTU cache diagnostic used `ip -6 route show cache | grep mtu` and implied that an empty result meant PTB was not received. This was corrected to `ip -6 route get <destination>` with a narrower explanation that `mtu N` in the output indicates Linux is applying an MTU limit on the route to that destination.
- The `tracepath` description overstated that it "shows MTU at each hop". It was corrected to say that it discovers path MTU and often shows where PMTU drops.
- The `mtr` step described `--report` as continuous PMTU analysis, which is inaccurate. It was corrected to describe `mtr` as additional latency/loss analysis and explicitly note that it is not PMTU-specific.
- The `firewall-cmd --list-rich-rules | grep icmpv6` check would miss ICMP block settings. It was corrected to `firewall-cmd --list-all` with guidance to inspect `icmp-blocks` and rich rules.
- The MSS clamping explanation said it works "without relying on PMTUD". The wording was corrected because `--clamp-mss-to-pmtu` uses kernel PMTU knowledge and is specifically a TCP workaround.
- The Python script had an unused `interface` parameter and over-diagnosed any failed large probe as a confirmed black hole. The script was updated to use modern `ping -6` syntax, remove the unused parameter, and distinguish between a route with an MTU limit and a suspected PMTU black hole.
- The conclusion overstated the cause and `tracepath` behavior. It was softened to align with RFC 8201 and iputils documentation.

## Review Notes
- The firewall examples are Linux-specific and use `ip6tables`, which remains valid but may sit on top of the nftables backend on modern systems.
- TCP MSS clamping is only a workaround for TCP traffic; it does not solve PMTU problems for UDP or other non-TCP protocols.
