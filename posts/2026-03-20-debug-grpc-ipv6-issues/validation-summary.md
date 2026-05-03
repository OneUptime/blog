# Validation Summary: How to Debug gRPC IPv6 Connection Issues

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- gRPC (Go, Python, Node.js)
- IPv6 networking
- grpcurl
- OpenSSL (TLS certificates with IPv6 SAN)
- tcpdump / Wireshark
- ip6tables (Linux IPv6 firewall)
- ss (socket statistics)
- netcat (nc)
- Linux sysctl (IPv6 forwarding)

## Sources Consulted
- gRPC Environment Variables documentation (https://github.com/grpc/grpc/blob/master/doc/environment_variables.md)
- grpc-go documentation for `grpc.NewClient` API (https://pkg.go.dev/google.golang.org/grpc)
- gRPC Name Resolution spec (https://github.com/grpc/grpc/blob/master/doc/naming.md) for `dns:///` URI scheme
- RFC 3986 (URI generic syntax — bracketing IPv6 in authority components)
- RFC 5952 (IPv6 address text representation)
- grpcurl CLI documentation (https://github.com/fullstorydev/grpcurl)
- OpenSSL `req` and `x509` man pages (subjectAltName syntax, `-addext`, `-ext` flag added in 1.1.1)
- iproute2 `ss` man page (output format for IPv4/IPv6 wildcard listeners)
- tcpdump pcap-filter(7) man page (BPF syntax for `ip6 and tcp port`)

## Issues Found
No technical issues found.

All commands, environment variables, API names, and flags were verified against current official documentation:
- `GRPC_GO_LOG_VERBOSITY_LEVEL` / `GRPC_GO_LOG_SEVERITY_LEVEL` are the correct grpc-go env vars.
- `GRPC_VERBOSITY` / `GRPC_TRACE` are the correct gRPC C-core env vars used by Python and Node.js.
- Trace topics (`channel`, `subchannel`, `address_sorting`, `all`) are valid.
- `grpc.NewClient` is the current recommended API in grpc-go (introduced in v1.63, replacing `grpc.Dial`).
- The IPv6 bracket requirement in gRPC target strings is correct.
- The `dns:///` scheme syntax (with three slashes, empty authority) is correct for the gRPC DNS resolver.
- grpcurl flag set is accurate.
- OpenSSL `-addext "subjectAltName=...IP:::1"` parses correctly (`IP:` type prefix + `::1` value); visually awkward but technically valid.
- `openssl x509 -ext subjectAltName` works in OpenSSL 1.1.1+ which is now standard.
- `ss -tln` does show IPv6 wildcard listeners as either `*:50051` or `[::]:50051` depending on version, so the guidance is accurate.

## Review Notes
- `ping6` is technically deprecated on most modern Linux distros in favor of `ping -6`, but `ping6` is still provided as a symlink/wrapper on Debian/Ubuntu/RHEL family systems and continues to work. Acceptable for a debugging guide.
- The OpenSSL SAN string `IP:::1` is correct but visually confusing; readers may misread it. A future revision could clarify with a comment, but this is a stylistic concern, not a correctness issue.
- The post does not pin specific versions of grpc-go, grpc-python, or grpc-node. The APIs shown (`grpc.NewClient`, `grpc.insecure_channel`) are stable and current as of 2026, so no version caveat is required.
- Filter `grpc or http2` in Wireshark requires a recent Wireshark version (gRPC dissector added in 3.2+); virtually all current installations support this.
