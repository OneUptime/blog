# Validation Summary: How to Use ICMP Timestamp Messages

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMP Timestamp Request/Reply (IPv4)
- RFC 792 / RFC 1122
- `hping3`
- `tcpdump` / libpcap filter syntax
- Python `socket` and `struct`
- `iptables`
- `nmap` host discovery

## Sources Consulted
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1122, Requirements for Internet Hosts -- Communication Layers: https://www.ietf.org/rfc/rfc1122.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Nmap host discovery reference: https://nmap.org/man/man-host-discovery.html
- Nmap host discovery techniques guide: https://nmap.org/book/host-discovery-techniques.html
- Nping reference guide for ICMP timestamp field semantics: https://nmap.org/book/nping-man.html
- `hping3` man page (Debian): https://manpages.debian.org/buster/hping3/hping3.8.en.html
- `raw(7)` Linux man page: https://man7.org/linux/man-pages/man7/raw.7.html
- `pcap-filter(7)` Linux man page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `iptables-extensions(8)` Linux man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The post overstated ICMP timestamps as directly measuring one-way delay. RFC 792 and RFC 1122 support clock offset and transit-time use, but one-way delay estimation depends on synchronized clocks. I corrected the description, introduction, and conclusion to reflect that.
- The `hping3` example used `--icmp-type`, which is not the documented long option in the `hping3` man page. I changed it to `--icmptype 13`.
- The Python example assumed a fixed 20-byte IPv4 header and unpacked the reply imprecisely. On Linux raw ICMP sockets, the IP header is included on receive. I updated the code to parse the IPv4 header length dynamically and to validate the reply type, code, identifier, and sequence fields.
- The Python example did not mention the privilege requirement for raw sockets. I added a note that root or `CAP_NET_RAW` is required on Linux.
- The command examples required elevated privileges but did not show that requirement. I added `sudo` to the `apt`, `hping3`, `tcpdump`, `iptables`, and `nmap` examples.
- The `nmap --script icmp-timestamp` example did not match Nmap’s official documentation; there is no official `icmp-timestamp` NSE script in the current docs. I replaced it with `nmap -sn -PP --send-ip` and corrected the explanation to state that a Type 14 reply indicates the host answered the timestamp probe.

## Review Notes
- The `tcpdump` capture filter `icmp[0]=13 or icmp[0]=14` is valid libpcap syntax for matching ICMP Timestamp Request and Reply packets.
- The `iptables` type names `timestamp-request` and `timestamp-reply` are valid ICMP type names.
- `nmap -PP` uses ICMP timestamp requests for host discovery, and `--send-ip` is important on local Ethernet networks so Nmap does not substitute ARP discovery instead of sending the ICMP probe.
