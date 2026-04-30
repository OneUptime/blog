# Validation Summary: How to Use Go net.Dialer with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- IPv6
- `net.Dialer`
- `net.Resolver`
- TCP
- DNS
- `net/http`
- `syscall`

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `syscall` package documentation: https://pkg.go.dev/syscall
- RFC 3849, IPv6 documentation prefix (`2001:db8::/32`): https://www.rfc-editor.org/rfc/rfc3849.html
- Google Public DNS AAAA lookup for `ipv6.google.com`: https://dns.google/resolve?name=ipv6.google.com&type=AAAA

## Issues Found
- The custom DNS section claimed to force IPv6-only resolution, but it used `Resolver.LookupIPAddr`, which the Go `net` docs specify returns both IPv4 and IPv6 addresses. I changed it to `Resolver.LookupIP(ctx, "ip6", host)` and updated the explanatory text so the code now actually requests IPv6-only results.
- The custom `Resolver.Dial` callback always opened `udp6`, even though the Go resolver may use either UDP or TCP for DNS transport. I updated the callback to preserve the requested transport while still forcing IPv6, and added a timeout around the manual lookup path.
- The `Control` example had a compile error because `fmt` was imported but unused. It also ignored `SetsockoptInt` failures inside `syscall.RawConn.Control`. I removed the unused import, returned socket-option errors correctly, and simplified the example to a portable socket option.
- The HTTP client example overrode `Transport.DialContext`. Current `net/http` docs note that a custom dialer disables HTTP/2 by default unless `ForceAttemptHTTP2` is set. I added `ForceAttemptHTTP2: true` so the example preserves expected HTTPS client behavior while still forcing IPv6.

## Review Notes
- The example addresses under `2001:db8::/32` are appropriate for documentation and are intentionally non-routable, per RFC 3849.
- The helper that binds a local IPv6 address now uses `net.JoinHostPort`, which is the standard Go helper for correctly formatting IPv6 host:port strings.
- The examples are technically correct after the fixes, but they still require working IPv6 connectivity in the reader's environment to succeed at runtime.
