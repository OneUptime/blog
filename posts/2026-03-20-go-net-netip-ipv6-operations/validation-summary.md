# Validation Summary: How to Use Go net/netip for IPv6 Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go standard library `net/netip`
- Go standard library `net`
- IPv6
- CIDR prefix and subnet operations

## Sources Consulted
- Go `net/netip` package documentation: https://pkg.go.dev/net/netip
- Go 1.18 release notes: https://go.dev/doc/go1.18
- Go `net` package documentation: https://pkg.go.dev/net
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849

## Issues Found
- The description and conclusion described `netip` usage as allocation-free or zero-allocation. The official Go docs describe `netip.Addr` as a small, immutable, comparable value type that takes less memory than `net.IP`, but they do not guarantee the allocation behavior claimed in the post. I removed those claims and replaced them with documented properties.
- The comparison section described `net.ParseIP` as a heap allocation and `netip.ParseAddr` as stack allocation. Those are implementation details, not API guarantees. I changed the comments to documented differences: `net.IP` is slice-backed and not comparable, while `netip.Addr` is a comparable value type.
- The post used "IPv4-in-IPv6" in prose and a non-literal output comment for `mapped.Unmap()`. The official terminology is "IPv4-mapped IPv6 address", and `fmt.Println(mapped.Unmap())` prints `192.0.2.1`. I updated both.

## Review Notes
- `ParsePrefix` does not zero masked host bits automatically; the post correctly uses `Masked()` when showing the canonical network form.
- `Addr.Prefix(64)` does mask host bits, so the `/64` rate-limiting example is consistent with the package documentation.
- `IsGlobalUnicast()` returning `true` for `2001:db8::1` is consistent with the Go docs' classification behavior even though `2001:db8::/32` is reserved for documentation by RFC 3849.
- The local environment did not have the `go` tool installed, so this review was documentation-based rather than compile-based.
