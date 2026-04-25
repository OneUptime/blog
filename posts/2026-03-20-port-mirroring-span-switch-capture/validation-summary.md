# Validation Summary: How to Set Up Port Mirroring (SPAN) on a Switch for Packet Capture

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cisco IOS / IOS XE SPAN and RSPAN
- Arista EOS port mirroring
- Linux `tc` / iproute2 traffic mirroring
- `tcpdump`
- `ip link`
- Wireshark

## Sources Consulted
- Cisco Catalyst 9000 Management Configuration Guide, "Switched Port Analyzer (SPAN)": https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/mgmt/management-configuration-guide/span.html
- Cisco Catalyst 9400 IOS XE 17.3.x Configuration Guide, "Configuring SPAN and RSPAN": https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/17-3/configuration_guide/nmgmt/b_173_nmgmt_9400_cg/configuring_span_and_rspan.html
- Cisco IOS Configuration Fundamentals Command Reference (`monitor session` behavior and limits): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/command/cf_command_ref/monitor_event-trace_through_Q.html
- Arista EOS Data Transfer manual (`monitor session source`, `monitor session destination`, `show monitor session`): https://www.arista.com/en/um-eos/eos-data-transfer
- `tc-mirred(8)` Linux man page: https://man7.org/linux/man-pages/man8/tc-mirred.8.html
- `tc-u32(8)` Linux man page: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- `ip-link(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `tcpdump(8)` Linux man page: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Local command help/man pages: `tc -help`, `tc filter help`, `man tc-mirred`, `man tcpdump`, `man ip-link`

## Issues Found
- The Cisco section incorrectly showed source interfaces and source VLANs being combined in one SPAN session. Cisco documents that a session can monitor ports or VLANs, but not both at once. I replaced that example with an explicit note.
- The Cisco VLAN mirroring comment claimed it mirrored "all traffic in VLAN 100". Cisco documents VLAN SPAN more narrowly as traffic entering or leaving source VLANs, so I corrected the wording.
- The Linux `tc` example used a root `prio` qdisc to catch egress traffic. I updated it to a `clsact`-based example with `ingress` and `egress` filters, which aligns with current `tc` documentation and avoids replacing the root qdisc just to mirror traffic.
- The Arista EOS section used a monitor-session submode and `no shutdown` sequence that does not match the documented EOS mirroring CLI. I replaced it with the documented global-configuration commands and adjusted the verification output accordingly.
- The capture section stated that the NIC "must" be put into promiscuous mode manually. `tcpdump` enables promiscuous mode by default unless `-p` is used, so I corrected that explanation while keeping the explicit `ip link` example.
- The best-practices section overstated typical SPAN session limits and implied that multiple capture ports inherently mean multi-threading. I replaced both with platform-accurate guidance.

## Review Notes
- Cisco SPAN, RSPAN, and filtered mirroring capabilities vary by platform and IOS/IOS XE release; the post is now accurate at a general IOS/IOS XE level, but readers should still confirm feature support on their exact switch model.
- Arista EOS mirroring behavior can vary by ASIC family; for example, some platforms have direction-specific limits or tag mirrored egress frames differently.
- On Linux, the mirrored capture interface still needs to be prepared appropriately on the host, but capture tools such as `tcpdump` usually handle promiscuous-mode enablement automatically.
