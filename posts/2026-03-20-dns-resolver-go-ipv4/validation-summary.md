# Validation Summary: How to Build a DNS Resolver in Go for IPv4 Lookups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- DNS
- IPv4
- Go `net` package
- `net.DefaultResolver`
- `net.Resolver`
- Context timeouts
- In-memory caching

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- RFC 7766, DNS Transport over TCP - Implementation Requirements: https://www.rfc-editor.org/rfc/rfc7766.html
- RFC 1035 with verified errata, Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/inline-errata/rfc1035.html
- RFC 9499, DNS Terminology: https://www.rfc-editor.org/rfc/rfc9499

## Issues Found
- The original examples used `LookupIPAddr`, but the Go `net` package docs state that `LookupIPAddr` returns both IPv4 and IPv6 addresses. I changed the examples to `LookupIP(ctx, "ip4", ...)` and updated the description and conclusion so the post now matches its IPv4-specific scope.
- The custom resolver's `Dial` callback always opened a UDP connection. The Go docs for `net.Resolver.Dial` state that the built-in resolver uses it for both TCP and UDP DNS connections, and RFC 7766 requires general-purpose DNS implementations to support TCP. I changed the callback to pass through the resolver-provided `network` value so TCP fallback is not broken.
- The caching example described the local cache expiration as a DNS TTL. DNS TTL is resource-record metadata from DNS responses, while this example uses a fixed application-defined cache duration. I changed the wording to "cache TTL" and "fixed TTL" to reflect what the code actually does.
- The caching resolver could return an empty successful result when no IPv4 addresses were present. I added an explicit `no A records` error so its behavior stays consistent with the simple resolver example.

## Review Notes
- The post uses Go's host-resolution APIs rather than constructing raw DNS packets, so it performs IPv4 name resolution through the local or configured resolver instead of exposing DNS record metadata such as authoritative TTL values.
- The author GitHub URL resolves correctly to `https://github.com/nawazdhandala`.
- A local compile pass was not possible in this environment because the `go` tool is not installed.
