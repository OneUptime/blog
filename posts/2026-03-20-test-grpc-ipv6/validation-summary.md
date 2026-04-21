# Validation Summary: How to Test gRPC Services over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC
- IPv6 addressing and host:port formatting
- grpcurl
- Go gRPC client testing
- Go `bufconn`
- Python gRPC with pytest
- Bash integration test scripting
- OneUptime port monitoring

## Sources Consulted
- grpcurl README and usage documentation: https://github.com/fullstorydev/grpcurl
- gRPC Go API documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC Go `bufconn` package documentation: https://pkg.go.dev/google.golang.org/grpc/test/bufconn
- gRPC name resolution syntax: https://github.com/grpc/grpc/blob/master/doc/naming.md
- gRPC custom name resolution guide: https://grpc.io/docs/guides/custom-name-resolution/
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC Python API documentation: https://grpc.github.io/grpc/python/grpc.html
- Go `net.JoinHostPort` / `SplitHostPort` documentation: https://pkg.go.dev/net#JoinHostPort
- RFC 3849, IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849
- OneUptime Port Monitor documentation: https://oneuptime.com/docs/monitor/port-monitor
- OneUptime Synthetic Monitor documentation: https://oneuptime.com/docs/monitor/synthetic-monitor
- OneUptime Custom Code Monitor documentation: https://oneuptime.com/docs/monitor/custom-code-monitor

## Issues Found
- The examples used `2001:db8::1` as a runnable integration target. RFC 3849 reserves `2001:db8::/32` for documentation, so it should not be treated as a real endpoint. Updated runnable defaults to IPv6 loopback (`[::1]:50051`) and added environment-variable overrides for integration targets.
- The Go `bufconn` example used `passthrough://bufnet`. Updated it to `passthrough:///bufnet` to match gRPC target URI syntax with an empty authority and a path endpoint.
- The Go examples reported `grpc.NewClient` setup errors as connection failures. Current gRPC Go documentation states `NewClient` creates a client connection object without performing I/O, so the messages now say "Failed to create client."
- The bufconn unit test name implied it exercised IPv6 networking even though `bufconn` is in-memory. Renamed it to `TestSayHelloWithBufconn` while keeping the IPv6 integration test separate.
- The Python example needed an actual configurable IPv6 target for integration testing. Added `GRPC_IPV6_TARGET` support and removed the unused `MagicMock` import.
- The OneUptime section claimed synthetic transaction monitors could make actual gRPC calls. OneUptime's documented port monitors verify port availability, while protocol-level gRPC validation belongs in grpcurl or client-based checks, so the section was updated accordingly.

## Review Notes
The grpcurl command forms, Python channel usage, health check invocation, and bracketed IPv6 host:port formatting are technically valid. The examples assume a test server is listening on IPv6 loopback by default; CI should set `GRPC_IPV6_TARGET` or `GRPC_SERVER` to the real IPv6 test endpoint.
