# Validation Summary: How to Propagate Timeouts with Context in Go Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go `context`
- Go `net/http`
- Go `database/sql`
- gRPC deadlines
- Distributed-service timeout propagation

## Sources Consulted
- Go `context` package documentation: https://pkg.go.dev/context
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `database/sql` package documentation: https://pkg.go.dev/database/sql
- gRPC deadlines guide: https://grpc.io/docs/guides/deadlines/

## Issues Found
- The introductory context example declared `ctx2` without using it, which would not compile as a standalone Go example. Added `_ = ctx2` so the snippet remains syntactically valid while preserving the author's explanation.
- The HTTP section implied that an incoming plain HTTP request context automatically carries a propagated deadline. Go's `net/http` request context carries lifecycle cancellation, and an outgoing request context controls the client-side request, but plain HTTP does not automatically transmit an absolute context deadline to the receiving service. Updated the text and example to describe using an explicit application header such as `X-Request-Deadline`.
- The HTTP handler comment said the request context is canceled when the server shuts down. The Go documentation states that an incoming server request context is canceled when the client connection closes, the HTTP/2 request is canceled, or `ServeHTTP` returns. Updated the comment accordingly and mentioned derived timeouts separately.
- The timeout middleware launched `next.ServeHTTP` in a goroutine while the middleware could return on timeout. That pattern can allow handlers to continue writing through the same `ResponseWriter` after the middleware returns and does not reliably send a timeout response. Replaced it with synchronous context derivation and noted that handlers and downstream calls must observe `ctx.Done()`.
- The edge-timeout section implied that creating a local context deadline automatically propagates through the whole system. Updated the wording to clarify that handlers can pass the deadline to local work and outgoing calls, or explicitly encode it for protocols such as HTTP.

## Review Notes
The database and gRPC guidance matches the official documentation: `database/sql` context-aware APIs use the provided context for operations and transactions, and gRPC-Go supports deadline propagation by default. The local environment did not have the `go` tool installed, so code snippets were reviewed statically against official documentation rather than compiled.
