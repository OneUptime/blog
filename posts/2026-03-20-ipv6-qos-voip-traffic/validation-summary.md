# Validation Summary: How to Configure IPv6 QoS for VoIP Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- QoS / DiffServ / DSCP
- VoIP
- SIP
- RTP / RTCP
- nftables
- Linux traffic control (`tc`)
- Asterisk
- Cisco IOS QoS
- `ping`
- `tcpdump`
- `iperf3`

## Sources Consulted
- ITU-T Recommendation G.114 summary: https://www.itu.int/dms_pubrec/itu-t/rec/g/T-REC-G.114-200305-I%21%21SUM-HTM-E.htm
- RFC 4594, Configuration Guidelines for DiffServ Service Classes: https://datatracker.ietf.org/doc/rfc4594/
- RFC 3550, RTP: A Transport Protocol for Real-Time Applications: https://datatracker.ietf.org/doc/html/rfc3550.html
- nftables quick reference: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- nftables man page: https://www.netfilter.org/projects/nftables/manpage.html
- Asterisk IP Quality of Service documentation: https://docs.asterisk.org/Configuration/Channel-Drivers/IP-Quality-of-Service/
- Asterisk PJSIP IPv6 configuration: https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/Configuring-res_pjsip-for-IPv6/
- Asterisk `pjsip.conf.sample`: https://github.com/asterisk/asterisk/blob/master/configs/samples/pjsip.conf.sample
- Asterisk `rtp.conf.sample`: https://github.com/asterisk/asterisk/blob/master/configs/samples/rtp.conf.sample
- `tc-u32(8)` manual: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- `tc-flower(8)` manual: https://man7.org/linux/man-pages/man8/tc-flower.8.html
- `ping(8)` manual: https://www.man7.org/linux/man-pages/man8/ping.8.html
- iperf3 documentation: https://software.es.net/iperf/invoking.html
- Cisco IPv6 QoS documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/xe-2/ipv6-xe-2-book/ip6-qos.html

## Issues Found
- The QoS requirements block attributed jitter and packet-loss guidance to ITU-T G.114, but G.114 is specifically about one-way transmission time. I changed the wording so only delay is attributed to G.114.
- The DSCP recommendation line listed `AF31` as an alternative for SIP signaling. RFC 4594 explicitly recommends `CS5` for peer-to-peer SIP/H.323 signaling, so I normalized the recommendation to `CS5`.
- The nftables example used an invalid IPv6 prefix (`2001:db8:voip:phones::/64`) and matched port `5061` as both UDP and TCP even though SIP over TLS uses TCP. I replaced the prefix with a valid documentation subnet and narrowed the TLS rule to TCP.
- The Asterisk section placed QoS options in `rtp.conf` and used legacy `sip.conf` settings. Current Asterisk documentation puts RTP port range in `rtp.conf`, while SIP/RTP QoS settings belong in `pjsip.conf` transport/endpoint sections. I rewrote that snippet accordingly.
- The `tc` example matched the IPv6 Traffic Class field with `u32 match u8 ... at 1`, which does not correctly express the IPv6 traffic-class match. I replaced it with `u32 match ip6 priority ...`, which is the documented IPv6 Traffic Class selector.
- The HTB/PFIFO comments overstated behavior by calling it "strict priority" and "no buffering." I corrected the comments to describe the actual configuration.
- The test commands used invalid IPv6 example destinations such as `2001:db8::pbx` and `2001:db8::remote`. I replaced them with valid documentation addresses.
- The `tcpdump` example had the filter expression and `-v` option in the wrong order for a reliable shell command. I rewrote it with a quoted BPF expression and valid option placement.
- The G.711 iperf3 comment said "80 byte packets" while the command uses `-l 160`. I corrected the comment to match the actual payload length.

## Review Notes
- The post is technically relevant and salvageable; no sections needed removal.
- The Cisco QoS example is syntactically plausible as a generic MQC example, but exact support can vary by IOS/XE platform and feature set.
- The nftables example marks traffic in `prerouting`, which is appropriate for transit/ingress classification. Locally generated PBX traffic is handled separately in the Asterisk QoS section.
