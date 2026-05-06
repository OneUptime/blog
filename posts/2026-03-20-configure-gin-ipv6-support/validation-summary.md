# Validation Summary: How to Configure Gin (Go) for IPv6 Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Gin
- IPv6
- `net/http`
- `net/netip`
- `curl`
- `ss` (iproute2)

## Sources Consulted
- Gin package docs for `Context.ClientIP` and `Engine.SetTrustedProxies`: https://pkg.go.dev/github.com/gin-gonic/gin
- Go `net` docs for `Listen` address and network semantics: https://pkg.go.dev/net#Listen
- Go `net/netip` docs for `ParseAddr`, `Unmap`, `Is4In6`, `Prefix`, and zone handling: https://pkg.go.dev/net/netip
- Go 1.18 release notes for the introduction of `net/netip`: https://go.dev/doc/go1.18#netip
- curl man page for `-6, --ipv6`: https://curl.se/docs/manpage.html
- curl tutorial notes on IPv6 literals in URLs: https://curl.se/docs/tutorial.html#IPv6
- Local `ss --help` output from the installed iproute2 build

## Issues Found
- The first IPv6 listener example imported `net/http` without using it, and the custom server example omitted `package main` and the `net`/`net/http` imports. I fixed the snippets so each example is syntactically complete.
- The post stated that binding to `[::]:8080` is dual-stack on Linux. I corrected this to say that binding to the IPv6 unspecified address is explicit, but whether IPv4 is also accepted depends on the OS and socket configuration.
- The client IP middleware manually trusted `X-Forwarded-For` before any proxy validation. I replaced that with `c.ClientIP()` plus `netip` normalization so the example aligns with Gin's trusted proxy model.
- The endpoint handler used `fmt.Sprintf` without importing `fmt`. I added the missing import.
- The endpoint handler accepted IPv4-mapped IPv6 input but returned mixed normalized and non-normalized values. I normalized the parsed address with `Unmap()` before building the response.
- The endpoint handler could accept scoped IPv6 literals such as `fe80::1%eth0`, then build a plain URL string that would not be suitable as written. I added a guard to reject scoped IPv6 addresses in this example.
- The rate limiter imported Gin without using it, which would fail to compile. I removed the unused import.
- The rate limiter wrote to `rl.counters` without ensuring the map was initialized, which could panic on a nil map. I added lazy initialization before the first write.
- The test command targeted `http://[2001:db8::1]:8080/endpoint`, which uses the documentation prefix rather than the local listener. I changed it to `http://[::1]:8080/endpoint`, added the JSON content type header, and clarified that the `/endpoint` route must be registered first.
- The conclusion described `netip.ParseAddr` as "allocation-free". The official docs do not make that parsing guarantee, so I changed the claim to "efficient IPv6 address parsing."

## Review Notes
- Go was not installed in this environment, so I validated the snippets against official documentation and local CLI help output rather than compiling them locally.
- `ss -lntp | grep :8080` is valid for a quick listener check, although a stricter IPv6-only inspection command could be used in a future revision if needed.
