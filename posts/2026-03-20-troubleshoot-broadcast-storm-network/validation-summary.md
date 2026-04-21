# Validation Summary: How to Troubleshoot Broadcast Storm Issues on a Network

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Ethernet switching and Layer 2 broadcast storms
- Spanning Tree Protocol (STP), PortFast, and BPDU Guard
- Cisco IOS / IOS XE switch show and configuration commands
- tcpdump and libpcap capture filters
- Linux iproute2 `ip` and `tc`

## Sources Consulted
- Cisco, "Understand the Spanning Tree PortFast BPDU Guard Enhancement": https://www.cisco.com/c/en/us/support/docs/lan-switching/spanning-tree-protocol/10586-65.html
- Cisco Catalyst 3750 Software Configuration Guide, "Configuring Port-Based Traffic Control": https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3750/software/release/15-0_2_se/configuration/guide/scg3750/swtrafc.html
- Cisco IOS / IOS XE `storm-control` command reference: https://www.cisco.com/en/US/docs/ios-xml/ios/lanswitch/command/lsw-se-s2.html
- Cisco Catalyst command reference for `show spanning-tree detail` output: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst1000/software/releases/15_2_7_e/command_reference/b_1527e_1000_cr/layer_2_commands.html
- Cisco IOS XE CLI search and filtering documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/configuration/xe-16-12/fundamentals-xe-16-12-book/cf-cli-search.html
- Cisco IOS XE `show interfaces counters` command reference: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/17-12/command_reference/b_1712_9500_cr/interface_and_hardware_commands.html
- tcpdump man page: https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap-filter man page: https://www.tcpdump.org/manpages/pcap-filter.7.html
- Linux iproute2 `tc-police(8)` man page: https://man7.org/linux/man-pages/man8/tc-police.8.html
- Linux iproute2 `tc-u32(8)` man page: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- Local CLI/man-page checks for `tcpdump 4.99.4`, `iproute2 6.1.0`, `ip link`, `tc filter`, `tc-u32(8)`, and `tc-police(8)`.

## Issues Found
- The Cisco interface counter example used `show interfaces counters | include Broadcast`, but common Cisco output exposes broadcast packet columns as `InBcastPkts` and `OutBcastPkts`, and IOS XE also has specific counter keywords. Replaced it with `show interfaces counters` and added `show interfaces counters errors`.
- The symptoms listed rapidly incrementing `broadcast/error` counts. Broadcast storms do not necessarily create physical or frame errors, so this was changed to `broadcast or discard` counts.
- The tcpdump examples did not print link-layer headers, so they could not identify source MAC addresses as described. Added `-e` and changed the pipelines to count the source MAC field.
- The first tcpdump pipeline sorted full packet lines, which include timestamps and do not reliably group repeated sources. It now extracts source MAC addresses before sorting.
- The long-running tcpdump sender command piped into `sort` without a capture limit, so it would not produce a useful top-sender list until the pipeline ended. Added `-c 1000` to collect a finite sample.
- The Cisco STP output filter escaped alternation characters (`\|`), which would search for literal pipe characters instead of alternatives in IOS regular expressions. Replaced it with `BLK|LIS|LRN|FWD` and made the topology filter case-aware with `[Tt]opology`.
- The storm-control text described throttling only, but the Cisco configuration uses `storm-control action shutdown`. Reworded it to say the switch suppresses broadcast traffic and shuts the port when a storm is detected.
- The Linux `tc` example configured a root egress qdisc and matched only IPv4 limited broadcast (`255.255.255.255`), which did not match the stated goal of limiting received Layer 2 broadcast traffic. Replaced it with an ingress policer matching Ethernet destination `ff:ff:ff:ff:ff:ff`.
- The PortFast example said to apply the configuration to all access ports. Tightened the comment to end-host access ports, matching Cisco guidance that PortFast should be used on ports connected to end stations.
- The BPDU Guard explanation implied it would break any rogue-switch loop. Clarified that the protection triggers when the rogue switch sends BPDUs.

## Review Notes
The post is technically relevant and accurate after the fixes. The Cisco examples are broadly IOS/IOS XE oriented; exact interface names and some newer PortFast syntax variants can differ by platform and software release.
