# Validation Summary: How to Connect a gRPC Client to an IPv4 Server Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- gRPC
- Python
- Go
- TLS / mTLS
- IPv4 networking

## Sources Consulted
- gRPC Python API reference: https://grpc.github.io/grpc/python/grpc.html
- gRPC Go package docs (`grpc.NewClient`): https://pkg.go.dev/google.golang.org/grpc
- gRPC Go basics tutorial: https://grpc.io/docs/languages/go/basics/
- gRPC authentication guide: https://grpc.io/docs/guides/auth/
- gRPC Core channel argument reference: https://grpc.github.io/grpc/core/channel__arg__names_8h.html
- gRPC Core keepalive guide: https://grpc.github.io/grpc/cpp/md_doc_keepalive.html
- Go `crypto/x509` package docs (`VerifyHostname`): https://pkg.go.dev/crypto/x509
- RFC 9525, Service Identity in TLS: https://datatracker.ietf.org/doc/html/rfc9525

## Issues Found
- The description claimed the post covered retry policies, but the article did not document any retry configuration. I corrected the description to reflect the actual scope: channel options, TLS, deadlines, and keepalive.
- The Python keepalive example enabled keepalive without calls but omitted `grpc.http2.max_pings_without_data`. Per gRPC Core keepalive behavior, clients otherwise stop after the default limited number of idle pings. I added that option so the example matches the article's long-lived connection guidance.
- The Python TLS example was written as if client certificates were always required, which made it an mTLS example rather than a general TLS example. I changed it to standard server-auth TLS and added a note that `private_key` and `certificate_chain` are only needed for mutual TLS.
- The Python TLS section did not mention the IPv4 certificate-matching requirement. I added a note that when connecting by IP, the server certificate must be valid for that IP address in `subjectAltName`.
- The Go example and conclusion could be read as if `grpc.NewClient` performs the network connection immediately. The current gRPC-Go docs state that `grpc.NewClient` performs no I/O and that the first RPC triggers connection establishment, so I clarified that behavior and adjusted the error message text accordingly.
- The conclusion stated keepalive guidance too broadly. I tightened it to note that client and server keepalive settings need to be aligned, which matches the official gRPC keepalive guidance.

## Review Notes
- The Go example uses `grpc.NewClient`, which is the current non-deprecated API in gRPC-Go. Older codebases may still use `grpc.Dial`, but the package docs mark `Dial` as deprecated and recommend `NewClient`.
- The Python and Go insecure examples are technically valid for trusted internal traffic, but the post is correct to recommend TLS for production.
