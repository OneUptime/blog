# Validation Summary: How to Monitor IPv6 Network Activity on macOS

## Status
validated

## Post Type
Tutorial / Reference (CLI cookbook for IPv6 monitoring on macOS)

## Technologies Covered
- macOS (BSD-derived) `netstat`
- `tcpdump` (libpcap / BPF filter expressions)
- `lsof`
- `nettop`
- `ndp` (NDP / RFC 4861 neighbor discovery)
- ICMPv6 / Router Advertisements
- IPv6 addressing conventions

## Sources Consulted
- macOS `netstat(1)` man page (BSD-derived; `-p protocol`, `-f address_family`, `-s`, `-i`, `-d`)
- macOS `nettop(1)` man page (`-t mode`, `-p policy` filters by process)
- macOS `ndp(8)` man page (`-a`, `-n`, `-r`, `-i` semantics)
- `lsof(8)` man page (`-i [46][protocol]:port`, `-s protocol:state`)
- `tcpdump(1)` / pcap-filter(7) man pages (`ip6`, `icmp6`, byte-offset filters)
- RFC 4861 (Neighbor Discovery for IPv6) — Router Advertisement = ICMPv6 type 134
- RFC 4443 (ICMPv6) — type number assignments

## Issues Found

1. **`sudo netstat -anpf inet6` (process names) — incorrect.** BSD `netstat` on macOS does not have a Linux-style `-p` for showing per-socket process names. Its `-p` flag takes a protocol argument (e.g. `-p icmp6`). macOS `netstat` has no flag at all that prints process names per socket. Replaced this line with a comment explaining macOS netstat does not show processes and pointing readers to `lsof` / `nettop`.

2. **`nettop -t wifi -p IPv6` — incorrect.** `nettop`'s `-p` flag is a process filter (PID or process name), not an IP-version filter. `-p IPv6` would match a process literally named "IPv6" (i.e., nothing). nettop has no built-in v4/v6 filter. Replaced with `nettop -t wifi` and a comment noting that filtering to IPv6 requires post-filtering with `grep`.

3. **`ndp -i en0 -a` (filter cache by interface) — incorrect.** In macOS `ndp(8)` (KAME-derived), `-i interface` views/sets per-interface ND parameters; it does not filter the `-a` cache dump. Replaced with `ndp -an | grep en0`, which is the conventional way to scope the cache to one interface.

## Review Notes

- The `tcpdump 'icmp6 and ip6[40] == 134'` filter for Router Advertisements is correct in practice: ICMPv6 type 134 is RA per RFC 4861, and the byte-offset assumption (40 = end of fixed IPv6 header) holds because RAs do not carry extension headers. A more robust alternative form is `icmp6[icmp6type] == icmp6-router-advertisement`, which avoids hard-coding the offset, but the original is fine.
- `lsof -i TCP6` works on macOS (lsof accepts the legacy `TCP6`/`UDP6` shorthand alongside the documented `[46][protocol]` form).
- The first regex (`netstat -an | grep '\..*\[.*\]\|tcp6\|udp6'`) is harmless but the bracket portion is dead — macOS netstat does not wrap IPv6 addresses in brackets; the alternation on `tcp6|udp6` is what actually matches. Left unchanged because the cleaner `netstat -anf inet6` is presented immediately after.
- `2001:db8::` addresses used in the example output are correct documentation-range addresses (RFC 3849).
- `2001:4860:4860::8888` is Google Public DNS — a valid real-world IPv6 address suitable for a host-filter example.
