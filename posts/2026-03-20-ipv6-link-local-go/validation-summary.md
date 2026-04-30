# Validation Summary: How to Work with IPv6 Link-Local Addresses in Go

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- Go standard library `net`
- Go standard library `net/netip`
- IPv6 link-local unicast addressing
- IPv6 scoped addressing / zone IDs
- IPv6 link-local multicast

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- Go `net/netip` package documentation: https://pkg.go.dev/net/netip
- RFC 4007, IPv6 Scoped Address Architecture: https://www.rfc-editor.org/rfc/rfc4007
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 6874, Representing IPv6 Zone Identifiers in Address Literals and Uniform Resource Identifiers: https://www.rfc-editor.org/rfc/rfc6874
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762

## Issues Found
- The listener example tried to bind to `fe80::%iface` and then to `::%iface`. That is not a reliable or generally valid way to listen on a link-local address. I changed the example to look up the interface's actual link-local address and bind with `net.ListenTCP` plus `net.TCPAddr{Zone: ...}`.
- The multicast example used UDP port `5353` with `ff02::1` while the conclusion referenced mDNS. Port `5353` is reserved for mDNS, whose IPv6 multicast group is `ff02::fb`. I changed the example to use an application-specific port (`9999`) so it remains a generic link-local multicast example instead of implying mDNS.
- The multicast receive example passed `&net.Interface{Name: iface}` and the conclusion said `net.ListenMulticastUDP` should use the interface's `Zone` field. In Go, the join interface is selected by the `ifi *net.Interface` argument. I changed the code to resolve the interface with `net.InterfaceByName` and updated the explanation.
- Several comments and the conclusion stated that zone IDs are required for all socket operations. RFC 4007 allows default zones in some cases, and Go only carries zone information where scoped addressing is needed. I narrowed the wording to describe the cases that actually require or commonly need a zone.
- The interface enumeration example only handled `*net.IPNet` values from `Interface.Addrs()`. I added `*net.IPAddr` handling so the example remains correct if that address form is returned.

## Review Notes
- Go was not installed in the workspace, so the examples were reviewed against official package documentation and RFCs rather than compiled locally.
- Zone identifiers are platform-local strings in Go; interface names such as `eth0` are common, but not the only possible representation.
