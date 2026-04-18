# Validation Summary: How to Troubleshoot WireGuard IPv4 Connectivity and Handshake Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- WireGuard (VPN)
- Linux kernel networking
- iptables / ss / nc / nmap (networking diagnostic tools)
- wg / wg-quick (WireGuard userspace tools)
- dmesg and kernel dynamic debug
- sysctl (net.ipv4.ip_forward)

## Sources Consulted
- Official WireGuard quickstart and documentation: https://www.wireguard.com/quickstart/
- WireGuard protocol and cryptokey routing: https://www.wireguard.com/protocol/
- WireGuard debugging docs: https://www.wireguard.com/xplatform/ and dynamic_debug kernel docs
- wg(8) and wg-quick(8) man pages
- WireGuard whitepaper (REKEY_AFTER_TIME = 120s, REJECT_AFTER_TIME = 180s constants)
- Jason Donenfeld's MTU calculation guidance on the WireGuard mailing list (1500 - 80 = 1420)
- Linux kernel dynamic debug documentation (Documentation/admin-guide/dynamic-debug-howto.rst)

## Issues Found
No technical issues found.

All commands, field names, defaults, and troubleshooting claims verified against official WireGuard documentation and man pages:
- `wg show` output field names ("latest handshake", "transfer", "allowed ips") are correct.
- The 3-minute handshake staleness threshold aligns with REJECT_AFTER_TIME = 180s.
- The dynamic debug command for the wireguard kernel module is the documented form.
- MTU = 1420 is the standard IPv4 recommendation (1500 - 20 IPv4 - 8 UDP - 32 WireGuard overhead - 16 Poly1305 tag = 1420).
- Default port UDP 51820 is correct.
- `wg-quick down/up` are the proper interface management commands.
- The "silent by design" characterization matches WireGuard's stated design philosophy.

## Review Notes
- The `nc -zvu` UDP test is a commonly suggested probe, but UDP is connectionless and `nc -z` results can be unreliable for UDP (often reports "succeeded" even when filtered). The post's inclusion of `nmap -sU` in Step 4 provides a better alternative, so this isn't incorrect but readers should be aware.
- Calling WireGuard's design "stateless" in the closing paragraph is slightly loose — WireGuard does maintain session state (keys, counters, timers) but avoids TCP-style connection state. This is common colloquial phrasing in WireGuard docs and community writing, so not worth changing.
- Paths like `/etc/wireguard/server_public.key` are conventional examples rather than enforced defaults; users may store keys elsewhere.
