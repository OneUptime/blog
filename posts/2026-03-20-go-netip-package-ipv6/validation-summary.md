# Validation Summary: How to Use the Go netip Package for IPv6 Address Handling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go standard library `net/netip`
- Go standard library `net`
- IPv6 addressing
- CIDR prefixes
- `AddrPort`

## Sources Consulted
- Go 1.18 release notes: https://go.dev/doc/go1.18
- Go `net/netip` package documentation: https://go.dev/pkg/net/netip/?m=old
- Go `net` package documentation (`net.IP`, `ParseIP`): https://go.dev/pkg/net/?m=old
- Go `net/netip` source (`AddrFromSlice`, `Unmap`, `AsSlice`): https://go.dev/src/net/netip/netip.go
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The introduction described `netip.Addr` as "allocation-efficient" and said it "avoids heap allocations." The official Go docs document `Addr` as a small, immutable value type that takes less memory than `net.IP`, but they do not guarantee stack-only or heap-free behavior. I changed the wording to match the documented properties.
- The comparison table said `net.IP` is "Heap" and `netip.Addr` is "Stack." That is not a reliable Go guarantee because escape analysis determines where values live. I changed the row to compare the actual representations: `[]byte` slice versus small value type.
- The `net.IP` to `netip.Addr` conversion example used an IPv6 input while explaining `Unmap()`. Since `Unmap()` matters for IPv4 values that `net.ParseIP` returns in 16-byte IPv4-mapped form, I changed the example to `192.0.2.1` and corrected the comment.
- The best-practices and conclusion sections made a blanket "faster than `net.IP`" claim and described `MustParse*` as suitable for values known at "compile time." The Go docs explicitly support the less-memory, immutable, comparable, hard-coded-string guidance, so I updated those statements to align with the documented behavior.

## Review Notes
- `2001:db8::/32` is the RFC 3849 documentation prefix, so its use throughout the examples is appropriate.
- `Addr.IsGlobalUnicast()` can still return `true` for documentation-space IPv6 addresses and other non-public ranges; that matches the Go package documentation, so the address-classification example remains technically correct.
- A local compile pass was not possible because the `go` toolchain is not installed in this environment.
