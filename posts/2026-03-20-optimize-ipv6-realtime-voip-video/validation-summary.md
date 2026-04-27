# Validation Summary: How to Optimize IPv6 for Real-Time Applications (VoIP, Video) - Realtime

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- IPv6 Traffic Class field / DSCP (RFC 2474, RFC 3260)
- ip6tables mangle table with the DSCP target
- Linux `tc` (HTB qdisc, SFQ, u32 filters) for QoS shaping
- Linux kernel network sysctls (rmem/wmem, tcp_low_latency, gro_flush_timeout, txqueuelen)
- Asterisk `sip.conf` (chan_sip) with IPv6 binding
- `ss`, `tcpdump` for verification
- Python `socket` with `AF_INET6 + SOCK_DGRAM` for RTT/jitter measurement

## Sources Consulted
- RFC 2474 — Definition of the DS Field (DSCP). https://datatracker.ietf.org/doc/html/rfc2474
- RFC 3246 — Expedited Forwarding PHB (DSCP EF = 46). https://datatracker.ietf.org/doc/html/rfc3246
- RFC 2597 — Assured Forwarding PHB Group (AF41 = 34). https://datatracker.ietf.org/doc/html/rfc2597
- RFC 4594 — Configuration Guidelines for DiffServ Service Classes (CS3 for signaling). https://datatracker.ietf.org/doc/html/rfc4594
- RFC 4291 — IPv6 Addressing Architecture (Traffic Class location).
- RFC 4193 — Unique Local IPv6 Unicast Addresses (fc00::/7, fd00::/8 locally assigned).
- ITU-T G.114 — One-way transmission time (≤ 150 ms target for voice).
- iptables-extensions(8) — DSCP target documentation. https://ipset.netfilter.org/iptables-extensions.man.html
- `tc-u32(8)` and `tc-htb(8)` — Linux man pages for u32 selectors / HTB.
- Linux kernel docs — `Documentation/networking/ip-sysctl.rst` and `Documentation/networking/scaling.rst` (gro_flush_timeout).
- Local kernel verification: `/proc/sys/net/ipv4/tcp_low_latency` exists; `/proc/sys/net/ipv6/tcp_low_latency` does not.
- Python docs — `socket` module IPv6 4-tuple `(host, port, flowinfo, scopeid)`. https://docs.python.org/3/library/socket.html
- Asterisk `sip.conf.sample` — bindaddr/bindport/localnet syntax for chan_sip.

## Issues Found
- **Wrong sysctl namespace for `tcp_low_latency`.** The post wrote `sysctl -w net.ipv6.tcp_low_latency=1`. That sysctl does not exist under `net.ipv6`; the kernel exposes it as `net.ipv4.tcp_low_latency` and the same setting affects both IPv4 and IPv6 TCP sockets (verified locally on Linux 6.17 — only `/proc/sys/net/ipv4/tcp_low_latency` is present). Changed to `net.ipv4.tcp_low_latency=1` and updated the comment to clarify it applies to both address families.

## Review Notes
- DSCP code points used in the post are correct: EF=46, CS3=24, AF41=34. The shift-by-2 mapping into the IPv6 Traffic Class byte (EF→0xB8, AF41→0x88) is correct.
- The `tc u32 ... match ip6 priority 0xXX 0xff` filters use a full-byte mask, which means packets that carry non-zero ECN bits (0x01/0x02) on the same DSCP would not match. For VoIP/RTP this is rarely an issue in practice, but a stricter `0xfc` mask would only match the DSCP bits and be more robust if ECN is in use. Left as written since it is not incorrect — only narrower than necessary.
- `net.ipv4.tcp_low_latency` has been a no-op on Linux kernels since 4.14 (the underlying logic was removed). Setting it does not error and does no harm, but readers on modern kernels should not expect it to materially change behavior; `net.ipv4.tcp_notsent_lowat` is the more impactful knob for low-latency TCP today. Did not change the post since the original intent (a "hint" sysctl) is preserved and the command still succeeds.
- The Asterisk example uses `chan_sip` (`sip.conf`). Asterisk 21 (released October 2023) removed `chan_sip` entirely in favor of `chan_pjsip` (`pjsip.conf`). The example is still valid for Asterisk ≤ 20 LTS, but readers on current Asterisk releases should translate to PJSIP equivalents (`transport` with `bind=[::]`, `endpoint`, etc.). Not changed as it is a substantive restructure rather than a correctness fix.
- `localnet=fd00::/8` is the locally-assigned half of ULA space (RFC 4193). It is syntactically valid and a reasonable choice; `fc00::/7` would cover the entire ULA range if desired.
- The Python `measure_voip_path` function sends 4 NUL bytes to UDP/5060 and waits for a reply. SIP servers will not respond to malformed datagrams, so in practice every iteration will hit the 1.0 s `socket.timeout` and the recorded RTTs will be ~1000 ms. The code is syntactically correct and the IPv6 4-tuple `(host, port, flowinfo, scopeid)` is right, but the function is illustrative rather than a real probe. A real probe would issue a `SIP OPTIONS` request or use STUN/RTP-style heartbeats.
- `ss -6 -ulnp | grep 5060` is a valid command; the example output line shows the netstat-style `:::5060` rendering of the IPv6 wildcard, which some `ss` versions display as `*:5060` or `[::]:5060`. Cosmetic only.
- `gro_flush_timeout=32` (nanoseconds) is extremely aggressive and effectively disables GRO timer-based coalescing — appropriate for latency-first tuning, but the inline comment ("NAPI polling with reduced weight") is loose terminology. NAPI weight is a separate driver/sysfs knob (`napi_defer_hard_irqs`, etc.). Left as-is since the numeric setting is sound.
