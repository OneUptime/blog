# Validation Summary: How to Validate IPv6 Lab Connectivity

## Status
validated

## Post Type
Tutorial / Guide (bash scripting for network validation)

## Technologies Covered
- IPv6 (RFC 8200)
- Linux kernel IPv6 sysctls (`/proc/sys/net/ipv6/conf/*`)
- `iproute2` (`ip -6 addr`, `ip -6 route`, `ip -6 neigh`)
- `iputils` (`ping6`)
- `bind-utils` (`host`)
- `netcat` (`nc -6`)
- DHCPv6 (`dhclient -6`)
- SLAAC / NDP
- FRRouting (`vtysh`, OSPFv3, BGP for IPv6)
- Bash scripting

## Sources Consulted
- RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification (minimum MTU 1280): https://datatracker.ietf.org/doc/html/rfc8200#section-5
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32): https://datatracker.ietf.org/doc/html/rfc3849
- iputils `ping` / `ping6` manpage (`-M do`, `-s`, `-c`, `-W`, `-q`): https://manpages.debian.org/bookworm/iputils-ping/ping.8.en.html
- `ip-route(8)` and `ip-address(8)` manpages (iproute2): https://manpages.debian.org/bookworm/iproute2/ip-route.8.en.html
- `host(1)` manpage (BIND): https://manpages.debian.org/bookworm/bind9-host/host.1.en.html
- `nc(1)` openbsd-netcat manpage (`-6`, `-z`, `-w`): https://manpages.debian.org/bookworm/netcat-openbsd/nc.1.en.html
- FRRouting user guide — OSPFv3 and BGP show commands: https://docs.frrouting.org/en/latest/
- Bash parameter expansion reference (GNU Bash manual §3.5.3): https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html

## Issues Found
- **Broken TARGETS parsing in the reachability loop.** The original script used `:` as the field delimiter between IPv6 address and friendly name (e.g., `"::1:loopback"`, `"2001:db8::1:Router1"`). Because IPv6 addresses contain colons, bash parameter expansions `${TARGET_PAIR%%:*}` and `${TARGET_PAIR#*:}` produced wrong values (for `::1:loopback` the address parsed as empty string; for `2001:db8::1:Router1` it parsed as `2001`). Verified experimentally — every ping would have targeted the wrong address or no address at all. Fixed by switching the delimiter to `|` in both the array entries and the parameter-expansion patterns, which produces correct results for all three entries.

## Review Notes
- `ping6` is still supported on most distros but has been deprecated upstream in `iputils`; `ping -6` (or plain `ping` with an IPv6 address) is the modern equivalent. The original wording was left intact since `ping6` still works on the vast majority of lab systems.
- `-M do` with `-s 1480` intentionally probes above the typical 1500-byte Ethernet MTU (total packet = 1480 payload + 8 ICMPv6 + 40 IPv6 = 1528 bytes); the progressive loop correctly stops at the first failing size. This is by design.
- `host -t AAAA ipv6.google.com 8.8.8.8` queries a hostname that Google publishes with AAAA-only records, which is a good sanity check; 8.8.8.8 is reached over IPv4 but the query itself asks for the AAAA RR, so this is fine.
- `2001:db8::/32` is correctly cited as the RFC 3849 documentation prefix.
- The FRR show-commands (`show ipv6 ospf6 neighbor`, `show bgp ipv6 unicast summary`) match current FRR CLI syntax.
- `((PASS++))` returns a non-zero exit status when PASS is 0 prior to increment; this is benign here because the script does not use `set -e`, but worth flagging for anyone who copies the helpers into a stricter script.
