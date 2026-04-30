# Validation Summary: How to Test IPv6 Duplicate Address Detection Attacks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Duplicate Address Detection (DAD)
- Neighbor Discovery Protocol (NDP)
- THC-IPv6 toolkit (`dos-new-ip6`, `fake_advertise6`, `detect-new-ip6`)
- SI6 Networks IPv6 Toolkit (`na6`)
- Linux IPv6 monitoring and sysctl interfaces (`tcpdump`, `journalctl`, `/proc/net/snmp6`, `/proc/sys/net/ipv6/conf/*`)

## Sources Consulted
- RFC 4862, *IPv6 Stateless Address Autoconfiguration*: https://www.rfc-editor.org/rfc/rfc4862
- RFC 4861, *Neighbor Discovery for IP version 6 (IPv6)*: https://www.rfc-editor.org/rfc/rfc4861
- RFC 3971, *SEcure Neighbor Discovery (SEND)*: https://www.rfc-editor.org/rfc/rfc3971.html
- RFC 7527, *Enhanced Duplicate Address Detection*: https://www.rfc-editor.org/rfc/rfc7527
- Linux kernel documentation, *IP Sysctl*: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- THC-IPv6 `dos-new-ip6(8)` man page (current packaged documentation): https://man.archlinux.org/man/extra/thc-ipv6/dos-new-ip6.8.en
- THC-IPv6 `detect-new-ip6(8)` man page (current packaged documentation): https://man.archlinux.org/man/extra/thc-ipv6/detect-new-ip6.8.en
- THC-IPv6 `fake_advertise6(8)` man page: https://www.mankier.com/8/fake_advertise6
- SI6 Networks `na6(1)` man page: https://www.mankier.com/1/na6
- `pcap-filter(7)` Linux man page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local validation with installed `tcpdump` 4.99.4 using `tcpdump -d` to verify that `src == ::` is invalid and `src host ::` compiles correctly

## Issues Found
- The DAD explanation implied that only a Neighbor Advertisement indicates a duplicate. I corrected it to reflect RFC 4862: a conflicting Neighbor Solicitation or a valid Neighbor Advertisement for the tentative address can cause DAD to fail.
- The DAD walkthrough oversimplified the packet details. I updated it to show the tentative address, the unspecified source address (`::`), and that the wait is the interface RetransTimer rather than a fixed one-second rule.
- `dos-new-ip6 eth0 2001:db8::/64` was not valid current syntax. I replaced it with the documented `-S` mode, which is the supported alternate behavior.
- `fake_advertise6 -i eth0 2001:db8::10` used an invalid option. I replaced it with a documented `-n 1` example and clarified what the command is doing.
- The `detect-new-ip6` pipeline depended on undocumented output parsing. I replaced it with the documented script-execution mode, where the detected IPv6 address and interface are passed as arguments to a handler script.
- The `tcpdump` filters used `src == ::`, which is invalid BPF syntax. I changed them to `src host ::`, which correctly filters DAD probes with the unspecified source address.
- The `na6` example had invalid shell line continuations, used a non-existent `--solicited-flag` option, and showed the wrong Neighbor Advertisement semantics for DAD. I rewrote it as a valid `na6` command that multicasts to `ff02::1`, keeps the Solicited flag clear, and includes a target link-layer address option.
- The `/proc/net/snmp6` example looked for `dad` and `duplicate` strings that are not the normal Linux counter names. I replaced it with a grep for the actual ICMPv6 Neighbor Solicitation and Neighbor Advertisement counters.
- The defense table conflated SEND with a separate "Secure DAD (SeND)" concept and overstated what that row protected. I corrected the table to distinguish SEND (RFC 3971), Enhanced DAD (RFC 7527), and switch-side ND inspection / first-hop security.

## Review Notes
- Some Debian-based packages install THC-IPv6 binaries with an `atk6-` prefix. The post uses the upstream command names, which are still technically correct, but readers on Debian-derived systems may need the packaged names instead.
- Enhanced DAD (RFC 7527) helps with looped-back DAD NS handling, but it does not stop an on-link attacker from forging Neighbor Advertisements. The post now reflects that limitation.
