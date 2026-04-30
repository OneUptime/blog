# Validation Summary: How to Handle IPv6 Link-Local Addresses in Go

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- Go standard library `net`
- Go standard library `net/netip`
- IPv6 link-local addressing
- IPv6 scoped addressing zones
- ICMPv6 Neighbor Discovery

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- Go `net/netip` package documentation: https://pkg.go.dev/net/netip
- RFC 4007, IPv6 Scoped Address Architecture: https://www.rfc-editor.org/rfc/rfc4007.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- Local `iproute2` help output via `ip -6 neigh help`

## Issues Found
- The `net/netip` example used `addr.WithoutZone()`, which is not a public API in current Go. I replaced it with `addr.WithZone("")`, which is the documented way to remove a zone.
- The address-filtering examples used `IsLinkLocalUnicast()` without also restricting to IPv6. In Go, link-local unicast checks also match IPv4 link-local addresses such as `169.254.0.0/16`, so I added explicit IPv6 filtering to prevent incorrect matches.
- The final section described sending UDP to `ff02::1` as NDP discovery and suggested checking the neighbor cache afterward. Per RFC 4861, Neighbor Discovery uses ICMPv6 Neighbor Solicitation and Advertisement messages, with address resolution sent to the target's solicited-node multicast address. I corrected that section to describe it as a link-local multicast probe instead of NDP.

## Review Notes
- The Go toolchain was not available in the review environment, so the snippets were validated against the current Go documentation and by manual syntax review rather than compiled locally.
- The `ip -6 neigh show` command family is valid on systems with `iproute2`; this was checked against local `ip -6 neigh help` output.
