# Validation Summary: Port Mirroring, SPAN, and Packet Capture

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco SPAN, RSPAN, and ERSPAN
- Cisco IOS XE switch configuration
- Linux Traffic Control (`tc`)
- Linux `iptables` TEE target
- `tcpdump`
- Wireshark display filters and packet analysis

## Sources Consulted
- Cisco IOS XE: Configuring SPAN and RSPAN: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-2/configuration_guide/nmgmt/b_172_nmgmt_9300_cg/configuring_span_and_rspan.html
- Cisco IOS XE: Configuring ERSPAN: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/17-1/configuration_guide/nmgmt/b_171_nmgmt_9500_cg/configuring_erspan.html
- Cisco Support: Verify SPAN and ERSPAN on Catalyst 9000 Series Switches: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9500-series-switches/218111-verify-span-and-erspan-on-catalyst-9000.html
- `tc-mirred(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-mirred.8.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Wireshark User’s Guide, Open Capture Files: https://www.wireshark.org/docs/wsug_html_chunked/ChIOOpenSection.html
- Wireshark Display Filter Reference, TCP: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark Display Filter Reference, HTTP: https://www.wireshark.org/docs/dfref/h/http.html
- Wireshark Display Filter Reference, DNS: https://www.wireshark.org/docs/dfref/d/dns.html
- Wireshark Display Filter Reference, IPv4: https://www.wireshark.org/docs/dfref/i/ip.html
- Local `tcpdump(8)` manual and `tcpdump --help` output on the review environment
- Local `iptables -j TEE -h` output on the review environment

## Issues Found
- The RSPAN example defined the remote-span VLAN only on the source switch. Cisco’s RSPAN documentation requires the RSPAN VLAN to be configured consistently on participating switches, so I added the `vlan 999` and `remote-span` lines on `Switch-B`.
- The Linux `tc` example text said it mirrored "all traffic" on `eth0`, but the configured ingress qdisc and filter mirror ingress traffic only. I corrected the wording to match the actual behavior of the commands.
- The `tcpdump` example claimed "timestamp and verbose output" while also using `-w`. With `-w`, `tcpdump` writes raw packets to a file instead of printing decoded verbose output, so I removed `-w` from that specific example.
- The ERSPAN snippet placed `no shutdown` in ERSPAN destination submode and omitted the source `origin ip address`. Cisco’s ERSPAN source examples configure the origin IP in destination submode, then return to ERSPAN source mode before `no shutdown`, so I corrected the command sequence.

## Review Notes
- Exact SPAN and ERSPAN CLI details vary by Cisco platform and software family. The corrected examples align with Cisco IOS XE/Catalyst documentation and verification examples, but equivalent NX-OS syntax can differ.
- The `iptables` TEE example is technically valid, but on newer Linux systems `nftables` is often preferred operationally even when `iptables` compatibility commands are still available.
