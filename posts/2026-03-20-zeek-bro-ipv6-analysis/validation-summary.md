# Validation Summary: How to Configure Zeek (Bro) for IPv6 Network Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Zeek (formerly Bro) network security monitor
- Zeek scripting language
- ICMPv6 / IPv6 protocol monitoring
- zeekctl deployment tool
- zeek-cut log parsing utility
- Ubuntu / Debian apt package management
- OpenSUSE Build Service APT repository

## Sources Consulted
- Zeek source — `src/packet_analysis/protocol/icmp/events.bif` (https://github.com/zeek/zeek/blob/master/src/packet_analysis/protocol/icmp/events.bif) for the authoritative `icmp_router_advertisement` event signature.
- Zeek source — `scripts/base/frameworks/notice/main.zeek` (https://github.com/zeek/zeek/blob/master/scripts/base/frameworks/notice/main.zeek) for Notice framework actions and types.
- Zeek documentation for Logging framework (`Log::create_stream` pattern).
- OpenSUSE Build Service Zeek project (`download.opensuse.org/repositories/security:/zeek/`) — confirmed current install repository for Ubuntu 22.04.
- RFC 4193 (ULA, `fc00::/7`, `fd00::/8`), RFC 3849 (documentation prefix `2001:db8::/32`), RFC 4291 (link-local `fe80::/10`).

## Issues Found

1. **Incorrect `icmp_router_advertisement` event signature.** The original script declared the event as `(p: pkt_hdr, is_router: bool, hop_limit: count, managed_addr: bool, other_config: bool, reachable_time: interval, retrans_timer: interval, options: icmp6_nd_options)`. The actual signature in Zeek's `events.bif` is `(c: connection, info: icmp_info, cur_hop_limit: count, managed: bool, other: bool, home_agent: bool, pref: count, proxy: bool, rsv: count, router_lifetime: interval, reachable_time: interval, retrans_timer: interval, options: icmp6_nd_options)`. This would have been a compile-time error. Replaced with the correct signature and switched `p$ip6$src` to `c$id$orig_h`.

2. **Invalid Notice value `Notice::Action_Notify`.** The `$note` field in a Notice requires a `Notice::Type` enum value, and `Action_Notify` is not a valid Zeek enum (Notice actions are uppercase `ACTION_LOG`, `ACTION_EMAIL`, `ACTION_ALARM`, etc., and live in the `$actions` field, not `$note`). Added a proper `module ICMPv6Monitor;` with `redef enum Notice::Type += { Router_Advertisement_Flood };` and used that type in the `$note` field.

3. **Missing `Log::create_stream` for the custom `IPv6Monitor::LOG` stream.** Without registering the stream, `Log::write(IPv6Monitor::LOG, info)` fails at runtime. Added a `zeek_init() &priority=5` handler that calls `Log::create_stream(IPv6Monitor::LOG, [$columns=Info, $path="ipv6_monitor"])`.

## Review Notes
- The OpenSUSE Build Service repo path for Ubuntu 22.04 (`xUbuntu_22.04`) is current, but readers on Ubuntu 24.04 will need to switch to `xUbuntu_24.04`.
- Mixing `gpg --dearmor` into `/etc/apt/trusted.gpg.d/` still works, but the modern Debian/Ubuntu convention is `Signed-By=/etc/apt/keyrings/...` in the sources list. Not wrong, just dated.
- `fd00::/8` is technically the locally-assigned subset of ULA (full ULA is `fc00::/7`). Acceptable for site networks but worth noting.
- The `cat(c$id$resp_p)` call stores the responder port string under a `proto` field; name is misleading but code is valid.
- Pipelines like `cat file | zeek-cut ...` are standard in Zeek community tutorials even though `zeek-cut < file` is simpler — kept as-is.
