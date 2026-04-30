# Validation Summary: How to Configure gRPC Servers with IPv6 in Go

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- gRPC / grpc-go
- IPv6
- TLS
- grpcurl
- OneUptime monitoring

## Sources Consulted
- Go `net` package docs: https://pkg.go.dev/net
- gRPC-Go `grpc` package docs: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go reflection package docs: https://pkg.go.dev/google.golang.org/grpc/reflection
- gRPC-Go credentials package docs: https://pkg.go.dev/google.golang.org/grpc/credentials
- Go `crypto/x509` docs: https://pkg.go.dev/crypto/x509
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC health package docs: https://pkg.go.dev/google.golang.org/grpc/health/grpc_health_v1
- gRPC naming document: https://github.com/grpc/grpc/blob/master/doc/naming.md
- grpcurl README: https://github.com/fullstorydev/grpcurl
- RFC 3986: https://datatracker.ietf.org/doc/html/rfc3986
- Linux `ipv6(7)` man page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- OneUptime Port Monitor docs: https://oneuptime.com/docs/monitor/port-monitor
- OneUptime API Monitor docs: https://oneuptime.com/docs/monitor/api-monitor
- OneUptime Custom Code Monitor docs: https://oneuptime.com/docs/monitor/custom-code-monitor

## Issues Found
- The `grpcurl list` command would not work against the sample server because server reflection was not registered. I added `reflection.Register(...)` to the server examples so the documented testing commands match the example server configuration.
- The dual-stack explanation used an incorrect Linux setting name (`net.ipv6only`) and overstated the behavior. I replaced it with the correct `IPV6_V6ONLY` / `/proc/sys/net/ipv6/bindv6only` explanation and kept `tcp6` explicitly IPv6-only.
- The dual-stack code block contained dead code and ignored important listen/serve errors. I removed the unused listener and added proper error handling.
- The TLS client example used `NewClientTLSFromFile(..., "example.com")` even though grpc-go documents `serverNameOverride` as testing-only. I changed it to use an empty override and documented that IP-literal TLS requires the IPv6 address in a certificate SAN.
- The health-check snippet was invalid Go because it executed statements at top level. I wrapped it in a helper function and aligned the health status with the documented `grpcurl` test by using the empty-string service name.
- The `grpcurl` examples were incomplete for the example request/health-check flow. I added explicit JSON request bodies for `SayHello` and `grpc.health.v1.Health/Check`.
- The OneUptime monitoring note incorrectly suggested using custom HTTP monitors for the gRPC health protocol. I replaced it with supported TCP port monitoring guidance from OneUptime docs.

## Review Notes
- `grpc.NewClient` is current in grpc-go and does not perform network I/O immediately; the first RPC triggers connection setup.
- The TLS example assumes the server certificate is valid for the IPv6 literal target. If not, the deployment should use a DNS name target or certificates with the appropriate IP SAN.
