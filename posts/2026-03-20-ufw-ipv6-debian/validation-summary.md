# Validation Summary: How to Configure UFW for IPv6 on Debian

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- ip6tables / iptables
- IPv6 networking
- ICMPv6 / NDP / MLD
- Debian (apt package management)
- systemd / journalctl
- Routing Header Type 0 (RH0) mitigations

## Sources Consulted
- Local `man ufw(8)` (May 2023 build) — verified command-line syntax, direction keywords (`incoming|outgoing|routed`), logging levels, and rule syntax.
- UFW source behavior on `/etc/default/ufw` and `IPV6=yes` (Debian/Ubuntu defaults).
- Default `/etc/ufw/before6.rules` structure (ICMPv6 accepts: destination-unreachable, packet-too-big, time-exceeded, parameter-problem, echo-request, router/neighbor solicitation/advertisement, MLD).
- ip6tables `rt` match (routing header) and `recent` match documentation — https://ipset.netfilter.org/iptables-extensions.man.html
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation: `2001:db8::/32`).
- RFC 4193 (Unique Local IPv6 Unicast Addresses: `fc00::/7` with `fd00::/8` locally assigned).
- RFC 5095 (Deprecation of Type 0 Routing Header in IPv6).

## Issues Found

1. **Invalid `ufw default deny forward` command.** The UFW man page specifies valid directions as `incoming|outgoing|routed`. There is no `forward` direction in UFW. Changed to `ufw default deny routed`.

2. **Invalid IPv6 addresses using non-hexadecimal characters.** Several example addresses contained English words that are not valid hex and would be rejected by UFW's address parser:
   - `fd00:mgmt::/48` → `fd00:abcd::/48`
   - `2001:db8::admin` → `2001:db8::1`
   - `2001:db8:trusted::/48` → `2001:db8:1::/48`
   - `2001:db8:attacker::/32` → `2001:db8::/32`
   (Note: `2001:db8:bad::/48` and `2001:db8:bad::1` were already valid because `b`, `a`, `d` are hex digits, so no change was needed there.)

3. **Inconsistent wording about which rules file to edit for ICMPv6.** The prose said "you need to edit its after-rules" but the subsequent example edits `/etc/ufw/before6.rules`. Fixed the prose to say "before-rules" to match the code and reality (ICMPv6 ACCEPT rules live in `before6.rules` so they run before the user-rule chain).

## Review Notes

- `ufw logging high` was described as "Log all" — the UFW man page distinguishes `high` (all packets with rate limiting) from `full` (all packets without rate limiting). The post's simplification is acceptable for a quick-reference table but readers wanting exhaustive logging should know `full` exists.
- `journalctl -u ufw` works because a `ufw.service` systemd unit exists, but the actual packet log entries are emitted via `LOG_KERN` and typically routed to `/var/log/ufw.log` via rsyslog. Readers should prefer `/var/log/ufw.log` or `journalctl -k` for packet-level log lines.
- The SSH rate-limiting example using `-m recent` rate-limits all SSH packets rather than only NEW connections. For production use, adding `-m conntrack --ctstate NEW` (or `-m state --state NEW`) is more typical; the current form still works but is less efficient. Left unchanged since it is not technically wrong.
- The post does not explicitly note that `IPV6=yes` changes in `/etc/default/ufw` require `ufw disable && ufw enable` (or at minimum `ufw reload`) to take effect — a minor gap, but not an error.
- `ufw default deny routed` only has an effect if the system is configured for IPv6 forwarding (`net.ipv6.conf.all.forwarding=1`); otherwise the FORWARD chain is not exercised. A future revision could mention this caveat.
