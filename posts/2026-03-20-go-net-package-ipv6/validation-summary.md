# Validation Summary: How to Use the Go net Package for IPv6 Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- Go standard library `net` package
- Go standard library `net/http` package
- IPv6
- TCP
- UDP
- DNS resolution

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- RFC 4007, IPv6 Scoped Address Architecture: https://www.rfc-editor.org/rfc/rfc4007.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html

## Issues Found
- The `net.Dial("tcp", host)` explanation overstated IPv6 selection. I changed it to match the Go docs: `Dial` resolves the host to available IPs and tries them in order until one succeeds, rather than guaranteeing IPv6 whenever a AAAA record exists.
- The post overstated dual-stack behavior for `:port` listeners. I corrected the TCP/UDP listener comments, the best-practices section, and the conclusion to match the Go docs: empty or unspecified hosts listen on all local addresses, while `"tcp4"`/`"tcp6"` and `"udp4"`/`"udp6"` are the correct way to force an address family.
- The IPv4-mapped IPv6 example needed clarification. I updated the comment and best-practice text to reflect Go's documented `net.IP` semantics, where `To4()` is non-nil for IPv4-mapped IPv6 addresses.
- The HTTP example had an unused `context` import and described `http.ListenAndServe` as automatically dual-stack. I removed the unused import and reworded the section to reflect the documented behavior: it listens on a TCP address using the same underlying listener behavior as `net.Listen`.

## Review Notes
- No deprecated Go APIs were used.
- `net.IP.IsGlobalUnicast()` is broader than "publicly routable" and returns true for some non-public address ranges, including IPv6 unique local addresses and IPv4 private space, per the Go docs. The current examples remain correct.
- The referenced external links and hostname were checked on April 30, 2026: `https://oneuptime.com`, `https://github.com/nawazdhandala`, and `ipv6.google.com` all resolved successfully.
