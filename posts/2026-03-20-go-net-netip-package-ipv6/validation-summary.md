# Validation Summary: How to Use Go net/netip Package for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- `net/netip`
- IPv6
- `net`

## Sources Consulted
- Go 1.18 Release Notes: https://go.dev/doc/go1.18
- `net/netip` package documentation: https://pkg.go.dev/net/netip
- `net` package documentation: https://pkg.go.dev/net
- Go 1.20 Release Notes: https://go.dev/doc/go1.20
- Go standard library source for `net/netip`: https://go.dev/src/net/netip/netip.go

## Issues Found
- `addr.WithoutZone()` is not a `netip.Addr` method. I replaced it with `addr.WithZone("")`, which is the documented way to remove an IPv6 zone.
- The `AddrPort` example used `net.TCPAddr` without importing `net`. I added the missing import so the snippet is syntactically correct.
- The `net.IP` to `netip.Addr` example used slice-to-array conversions (`[4]byte(ip4)` and `[16]byte(ip16)`) that require Go 1.20, while the post presents `net/netip` as a Go 1.18 feature. I replaced those conversions with `netip.AddrFromSlice(...)`, which is supported by `net/netip` from Go 1.18.
- The prefix helper used `p.Addr()` directly even though `ParsePrefix` does not zero host bits. I updated `lastAddr` to start from `p.Masked().Addr()` and added validity guards so the helper matches documented `Prefix` semantics.
- The memory-size claim was too broad. I clarified it to the documented 64-bit sizing behavior described in the standard library source.

## Review Notes
- `Addr.IsGlobalUnicast()` returning `true` for `2001:db8::1` is consistent with the documented Go behavior, even though `2001:db8::/32` is reserved for documentation and not globally routed.
- The workspace did not have a `go` binary installed, so verification was performed against official Go documentation and standard library source rather than local compilation.
