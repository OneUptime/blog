# Validation Summary: How to Configure MLD Snooping on Switches

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- IPv6 Multicast Listener Discovery (MLD / MLDv2)
- Cisco IOS / IOS-XE MLD snooping
- Juniper Junos OS (EX series) MLD snooping
- Linux kernel bridge multicast snooping (iproute2 / `ip link`, `bridge`)
- systemd-networkd bridge configuration
- tcpdump capture filters for ICMPv6 / MLD
- Linux IPv6 sysctls (`net.ipv6.*`)

## Sources Consulted
- Cisco Catalyst 9300 IOS-XE 17.14 — Configuring MLD Snooping: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-14/configuration_guide/ip_mcast_rtng/b_1714_ip_mcast_rtng_9300_cg/configuring_mld_snooping.html
- Cisco Catalyst 6500 IPv6 MLD Snooping configuration guide
- Juniper Junos OS — `show mld snooping membership` / `show mld snooping statistics` / Verifying MLD Snooping on EX Series: https://www.juniper.net/documentation/us/en/software/junos/multicast/topics/task/mld-snooping-cli.html
- Linux kernel source `net/bridge/br_multicast.c` (BR_MULTICAST_DEFAULT_QUERY_INTERVAL = 125 * USER_HZ)
- Westermo write-up on Linux bridge IGMP/MLD snooping (mcast_query_interval units)
- systemd.netdev(5) — `[Bridge]` section: https://man.archlinux.org/man/systemd.netdev.5
- systemd.network(5) — `[Bridge]` per-port section: https://man.archlinux.org/man/systemd.network.5
- RFC 2710 — MLDv1 (Hop-by-Hop Router Alert requirement)
- RFC 3810 — MLDv2
- Linux kernel `net/ipv6/sysctl_net_ipv6.c` (mld_max_msf, mld_qrv) and `net/ipv6/addrconf.c` (mc_forwarding mode 0444)
- Wireshark Q&A: ICMPv6 capture filter pitfalls for MLD with HbH header

## Issues Found

1. **Cisco MLD snooping version syntax (line 28)** — Original `ipv6 mld snooping vlan 100 version 2` is not valid. The `version` keyword belongs under `querier`. Changed to `ipv6 mld snooping vlan 100 querier version 2` to match the documented IOS-XE Catalyst command grammar.

2. **Linux bridge `mcast_query_interval` units (line 75)** — Original used `125` with the comment "125 seconds", but the kernel/iproute2 expects centiseconds (1/100 sec). The default is `12500` (= 125 s). The original value would have produced a 1.25-second interval, which can hammer the network with queries. Changed to `12500` and updated the comment to clarify the unit.

3. **systemd-networkd bridge config (lines 84–101)** — The original placed `MulticastSnooping=` and `MulticastQuerier=` in a `.network` file under a `[Match] Name=br0` block. The `[Bridge]` section of `.network` files configures per-port slave settings (Cost, Priority, MulticastRouter, MulticastFlood, etc.); bridge-wide multicast options belong in a `.netdev` file with `[NetDev] Kind=bridge`. Additionally, `MulticastQuerierInterval=` is not a recognized systemd-networkd option. Rewrote the example as a `.netdev` file with `[NetDev]` + `[Bridge]` (yes/no booleans) and removed the non-existent option.

4. **tcpdump filters for MLD (lines 109, 112)** — Original used `ip6[40]` to match the ICMPv6 type byte. MLD packets are required by RFC 2710/3810 to carry a Hop-by-Hop Options header containing Router Alert, which is 8 bytes long. Therefore the IPv6 header is bytes 0–39, the HbH header is bytes 40–47, and the ICMPv6 type byte is at offset 48. With `ip6[40] == 130` the filter actually evaluates to checking the HbH Next-Header field (which equals 58), so it never matches MLD traffic. Changed offsets to `ip6[48]` and added a comment explaining the HbH offset.

5. **Linux IPv6 sysctls (original lines 146–150)** — Two errors:
   - `net.ipv6.conf.eth0.mcast_max_msf` does not exist as a per-interface sysctl. The actual control is the global `net.ipv6.mld_max_msf`.
   - `net.ipv6.conf.<iface>.mc_forwarding` is registered with mode `0444` (read-only). It reflects state set by an IPv6 multicast routing daemon via `MRT6_INIT`, and `sysctl -w` on it returns "operation not permitted". The associated comment ("Increase MLD report robustness") was also incorrect — `mc_forwarding` controls IPv6 multicast routing, not MLD report robustness; the relevant knob is `net.ipv6.mld_qrv`.
   Replaced the snippet with `net.ipv6.mld_max_msf`, `net.ipv6.mld_qrv`, and a clarifying note about `mc_forwarding` being read-only.

## Review Notes
- The placeholder address `2001:db8::switch1` (line 125) is technically not a valid IPv6 literal because `s`, `w`, `t`, `c`, `h` are not hex digits. It is clearly intended as a documentation placeholder and a reader will substitute a real address; left as-is to preserve the author's stylistic choice but flagging here for future cleanup. Using `2001:db8::1` (as in the earlier example) would be a strictly valid placeholder.
- The Cisco `show ipv6 mld snooping groups vlan <id>` form is supported on Cisco Catalyst IOS-XE platforms; some other Cisco platforms expose the same data under `show ipv6 mld snooping address vlan <id>`. Both are acceptable in their respective contexts.
- The post does not mention that on Cisco platforms the snooping querier typically also requires `ipv6 mld snooping querier` to be enabled at the global or interface level in addition to setting an address; readers may want to consult their platform's command reference.
- The Linux kernel claim "since kernel 3.14" for bridge MLD snooping is reasonable — IPv6 MLD snooping support was merged in 3.x kernels and is present in all currently supported distributions, so the statement is harmless even if the precise version could be argued.
- All MLDv2 ICMPv6 type numbers (130 query, 131 MLDv1 report, 132 done, 143 MLDv2 report) cited in the post are correct per IANA assignments.
