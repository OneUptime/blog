# Validation Summary: How to Bind to IPv6 Wildcard Address (::) in Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 socket programming
- POSIX sockets / C
- Python `socket` module
- Go `net` package
- Linux socket inspection with `ss`
- Netcat (`nc`) connectivity testing

## Sources Consulted
- RFC 3493, Basic Socket Interface Extensions for IPv6: https://datatracker.ietf.org/doc/html/rfc3493
- RFC 4007, IPv6 Scoped Address Architecture: https://www.rfc-editor.org/rfc/rfc4007.html
- Linux `ipv6(7)` man page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Go `net` package documentation: https://pkg.go.dev/net
- Microsoft Learn, Dual-Stack Sockets for IPv6 Winsock Applications: https://learn.microsoft.com/en-us/windows/win32/winsock/dual-stack-sockets
- Local CLI help output checked for command syntax: `ss --help`, `nc -h`

## Issues Found
- The C example printed the port with `5%d`, which produced the wrong listening address string. This was corrected to `%d`.
- The C example closed `dual` and `v6only` unconditionally, which could call `close(-1)` on failure paths. This was corrected with simple `>= 0` guards.
- The `in6addr_any` section said "Three equivalent ways" but listed four methods. This was corrected to "Four equivalent ways".
- The Python example implied `IPV6_V6ONLY=0` always creates a dual-stack socket. The comment was corrected to note that this depends on platform support.
- The Go example used `fmt.Sprintf("[::]:% d", port)`, which formats positive ports with a leading space and produces an invalid listen address. This was corrected to `%d`.
- The Go example claimed Linux dual-stack behavior as if it were guaranteed by the Go code itself. This was corrected to state that IPv4 acceptance depends on the OS.
- The verification section used Linux `ss` output but then described BSD/macOS behavior as if the same tool/output applied there. This was corrected to keep the `ss` example Linux-specific and note that BSD/macOS use different tools and output formats.
- The verification command used a placeholder form that was not directly runnable. This was corrected to a concrete example using port `8080`.
- The final C snippet said binding to a specific local address accepts connections "to/from" that address. For a server bind, the accurate effect is accepting connections to that local address, so the wording was corrected.
- The conclusion said Linux verification should show `:::port`, but live validation showed a dual-stack listener commonly appears as a single `*:port` entry in `ss`, while an IPv6-only listener appears as `[::]:port`. The wording was corrected accordingly.

## Review Notes
- Dual-stack defaults are OS-specific. RFC 3493 defines `IPV6_V6ONLY` with a default of off, Linux documents the default via `/proc/sys/net/ipv6/bindv6only` and defaults it to `0`, while Microsoft documents Windows Vista and later as IPv6-only by default unless `IPV6_V6ONLY` is cleared before `bind()`.
- The core explanation of `::`, `in6addr_any`, IPv4-mapped addresses, and link-local scope IDs is technically sound after the corrections above.
