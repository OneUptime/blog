# Validation Summary: How to Handle IPv6 in Go gRPC Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- gRPC for Go (`google.golang.org/grpc`)
- IPv6 networking
- gRPC health checking
- Protocol Buffers / generated gRPC service stubs

## Sources Consulted
- Go `net` package docs — https://pkg.go.dev/net
- Go `net/netip` package docs — https://pkg.go.dev/net/netip
- gRPC-Go package docs (`grpc.NewClient`, `grpc.NewServer`, `grpc.WithContextDialer`) — https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go `peer` package docs (`peer.FromContext`) — https://pkg.go.dev/google.golang.org/grpc/peer
- gRPC-Go `health` package docs — https://pkg.go.dev/google.golang.org/grpc/health
- gRPC-Go `grpc_health_v1` package docs — https://pkg.go.dev/google.golang.org/grpc/health/grpc_health_v1
- gRPC Go basics tutorial (`grpc.NewClient` usage) — https://grpc.io/docs/languages/go/basics/
- gRPC health checking guide — https://grpc.io/docs/guides/health-checking/

## Issues Found
1. **The dual-stack claim for `net.Listen("tcp", "[::]:port")` was too absolute.** The original post said to use `[::]:port` for dual-stack. Go's `net` docs only guarantee that this binds the unspecified address; whether a `tcp` listener on `[::]` also accepts IPv4 is OS-dependent. Updated the introductory explanation, inline comments, and conclusion to reflect that `tcp6` is IPv6-only while `tcp` on `[::]` may also accept IPv4 depending on the platform.

2. **The client example did not compile.** The `grpc.WithContextDialer` callback returned `net.Conn` and used `net.Dialer`, but the snippet did not import `net`. Added the missing import and adjusted the comment from "Force IPv6 resolution" to "Force IPv6 dialing" to match what the code is actually doing.

3. **The health-check server example ignored critical errors.** The original snippet discarded the error from `net.Listen` and ignored the return value from `s.Serve`, which made the example incomplete and potentially misleading. Updated the function to return an error and wrap listen failures with `fmt.Errorf`.

4. **A server comment implied the peer address was always IPv6.** In a configuration using `net.Listen("tcp", "[::]:50051")`, the remote address may be IPv6, IPv4, or an IPv4-mapped IPv6 address depending on platform behavior. Updated the comment to refer to the client's remote address rather than "IPv6 address".

## Review Notes
- `grpc.NewClient` is the current client-construction API in gRPC-Go and is correctly used in the post.
- `peer.FromContext()` is the correct server-side API for obtaining the remote peer address in gRPC-Go.
- The interceptor example's use of `netip.ParseAddr(...).Unmap()` is appropriate for normalizing IPv4-mapped IPv6 addresses.
- When using `grpc.NewClient` with `grpc.WithContextDialer`, gRPC-Go still performs normal target resolution unless the passthrough resolver is used explicitly. The post's literal IPv6 example remains valid, but this is worth keeping in mind for hostname-based variants.
