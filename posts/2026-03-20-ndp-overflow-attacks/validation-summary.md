# Validation Summary: How to Prevent NDP Cache Overflow Attacks on IPv6

## Status
validated

## Post Type
Tutorial / Defensive configuration guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP / RFC 4861)
- IPv6 Neighbor Cache Exhaustion / NDP cache overflow (RFC 6583)
- Linux IPv6 neighbor table (`ip -6 neigh`, `net.ipv6.neigh.*` sysctls)
- nftables (`meter` / per-source rate limiting on ICMPv6)
- ip6tables (`-m state`, `-m hashlimit`, FORWARD-chain prefix filtering)
- tcpdump BPF filtering for ICMPv6 type 135 (Neighbor Solicitation)
- `mpstat` / `/proc/softirqs` for measuring NET_RX softirq load
- Cisco IOS / IOS-XE IPv6 First Hop Security (`ipv6 nd inspection policy`, `ipv6 nd cache`)

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)
- RFC 6583 — Operational Neighbor Discovery Problems (the canonical description of NDP cache exhaustion)
- Linux kernel `Documentation/networking/ip-sysctl.rst` — semantics and defaults of `net.ipv6.neigh.*` (`ucast_solicit`, `mcast_solicit`, `retrans_time_ms`, `gc_interval`, `gc_stale_time`)
- Verified Linux defaults on a running system: `ucast_solicit=3`, `mcast_solicit=3`, `retrans_time_ms=1000`
- nftables wiki — Meters: https://wiki.nftables.org/wiki-nftables/index.php/Meters (per-source `meter` + `limit rate ... burst N packets` syntax)
- iptables-extensions(8) — `hashlimit`, `state` modules
- pcap-filter(7) — `ip6[40]` byte-offset semantics for ICMPv6 type matching
- Cisco IOS IPv6 Command Reference — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html (`ipv6 nd inspection`, `ipv6 nd cache interface-limit`, `ipv6 nd cache expire`)
- Cisco IPv6 First-Hop Security Configuration Guide — `ipv6 nd inspection policy` sub-commands (`device-role`, `drop-unsecure`, `limit address-count`, `sec-level minimum`, `tracking`, `trusted-port`, `validate source-mac`)

## Issues Found

1. **Cisco IOS `validate address` is not a documented sub-command** of `ipv6 nd inspection policy`. The supported `validate` sub-command in that policy is `validate source-mac` only. Removed the `validate address` line.

2. **Cisco IOS `ipv6 neighbor max-attempts 2` does not exist.** The post used this to "limit neighbor discovery cache". The actual command for limiting NDP cache size on Cisco IOS is `ipv6 nd cache interface-limit <count>` (per-interface NDP cache cap). Replaced with `ipv6 nd cache interface-limit 1024`.

3. **Cisco IOS `ipv6 neighbor sync-period 5` does not exist.** The closest documented command for tuning NDP cache entry lifetime is `ipv6 nd cache expire <seconds> [refresh]`. Replaced with `ipv6 nd cache expire 60`.

4. **`top -b -n 1 | grep softirq` does not produce useful output.** `top` prints the softirq value as `si` in the `%Cpu(s)` header, not the literal string "softirq" (it would only incidentally match `ksoftirqd` process names). Replaced with `mpstat -P ALL 1 1` (which has a `%soft` column) and `cat /proc/softirqs` (per-CPU `NET_RX` counters), which are the canonical ways to observe softirq load from NDP processing.

## Review Notes

- RFC 6583 framing is correct: the attack works by causing the router to issue NS for many off-link addresses inside an on-link /64 and exhaust the neighbor table with INCOMPLETE entries.
- Linux sysctl defaults stated in the post (3 multicast solicits at 1000 ms each ≈ 3 s before FAILED) are accurate. Calling those 3 attempts "3 retries" is a minor wording imprecision but the arithmetic and intent are right; left untouched.
- The `tcpdump` filter `'icmp6 and ip6[40]==135'` is correct: byte 40 is the first byte after the fixed IPv6 header, which is the ICMPv6 type field (135 = Neighbor Solicitation). It will miss NS carried behind extension headers, but that is atypical for NDP on the link.
- The nftables `meter ndp_rate { ip6 saddr limit rate 10/second burst 20 packets } accept` syntax is the documented per-source rate-limit form. The follow-up unconditional `drop` rule for nd-neighbor-solicit fires only when the meter does not match (i.e. over rate), which produces the intended rate-limit-then-drop behavior.
- Defense 3's `ip6tables -A FORWARD -d 2001:db8:1::/64 ... -j LOG` is logging only — the inline comment "Block traffic to unallocated parts of prefix" is aspirational; an explicit `-j DROP` rule would be needed to actually block. Left as written because the rule itself is syntactically correct and the post's intent (visibility before enforcement) is a legitimate operator pattern.
- `-m state --state INVALID` still works on current kernels but is the older xt_state match; `-m conntrack --ctstate INVALID` is the modern replacement. Not changed since both forms are supported.
- The Defense 5 math (limiting effective hosts to /96 cuts the attack surface from 2^64 to 2^32) is correct, though 2^32 is still a very large attack surface — the post is honest in calling it "manageable" rather than "small".
- The `ipv6 nd inspection` family of commands is older syntax; modern IOS-XE images on Catalyst 9000 platforms generally surface this functionality through the `ipv6 snooping policy` / SISF framework. The post's older form remains accepted on classic IOS and on IOS-XE images that retain the legacy CLI, so it is not factually wrong.
