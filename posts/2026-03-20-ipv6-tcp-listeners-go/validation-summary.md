# Validation Summary: How to Create IPv6 TCP Listeners in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go `net` package
- Go `net/netip` package
- Go `os/signal` package
- IPv6
- TCP listeners
- Dual-stack IPv4/IPv6 socket behavior

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- Go `net/netip` package documentation: https://pkg.go.dev/net/netip
- Go `os/signal` package documentation: https://pkg.go.dev/os/signal
- Go `net` source (`ipsock.go`): https://go.dev/src/net/ipsock.go
- Go `net` source (`ipsock_posix.go`): https://go.dev/src/net/ipsock_posix.go
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- Linux kernel IP sysctl documentation (`bindv6only`): https://www.kernel.org/doc/html/v6.11/networking/ip-sysctl.html
- Linux `ipv6(7)` man page: https://man7.org/linux/man-pages/man7/ipv6.7.html

## Issues Found
- The dual-stack section overstated portability. I changed it to say that a single `net.Listen("tcp", "[::]:port")` listener only accepts both IPv4 and IPv6 where the platform supports IPv4-mapped IPv6 addresses, and I noted that some systems such as OpenBSD and DragonFly BSD require separate listeners.
- The Linux sysctl name in the dual-stack explanation was wrong. I corrected `net.ipv6bindv6only=0` to `net.ipv6.bindv6only=0`.
- The "Listening on Specific IPv6 Addresses" example referenced `handleConnection` without defining it. I added the missing helper so the snippet is self-contained.
- The "Concurrent IPv6 Server with Graceful Shutdown" example also referenced `handleConnection` without defining it. I added the missing helper there as well.
- The comment labeling `2001:db8::1` as a "Specific global address" was misleading. I changed it to identify the address as a documentation example that should be replaced with an IPv6 address assigned to the local host.
- The conclusion stated the dual-stack listener behavior too absolutely and implied `net.TCPAddr` always represented an IPv6 client address. I corrected the wording to reflect platform-dependent dual-stack behavior and the fact that `net.TCPAddr` carries the client IP address, port, and zone when relevant.

## Review Notes
- The post is technically relevant and contains substantive Go networking implementation details, so `validated` is the correct status after the fixes above.
- `net.Listen("tcp6", ...)` is correctly used for IPv6-only listeners according to Go's socket-family selection logic.
- The `net/netip` example is current and uses non-deprecated APIs.
- Dual-stack behavior remains operating-system-dependent even with the corrected explanation, so readers who need guaranteed IPv4 and IPv6 coverage should use separate listeners.
- No local Go toolchain was available in this workspace, so verification was done against official documentation and Go standard-library source rather than by compiling the snippets locally.
