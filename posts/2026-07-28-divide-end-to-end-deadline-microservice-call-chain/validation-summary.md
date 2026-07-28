# Validation Summary: How to Divide an End-to-End Deadline Across a Microservice Call Chain

## Status

validated

## Post Type

Technical reliability engineering guide

## Technologies Covered

- Microservice call chains and distributed deadlines
- gRPC deadlines, propagation, retries, and cancellation
- HTTP deadline propagation
- Go `context` and `net/http` timeout controls
- curl connection timeout semantics
- W3C Trace Context
- Retry budgets, exponential backoff, jitter, hedging, and idempotency
- Queue admission, parallel fan-out, quorum reads, and cancellation
- Distributed tracing and timeout observability

## Sources Consulted

- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [gRPC cancellation guide](https://grpc.io/docs/guides/cancellation/)
- [gRPC retry guide](https://grpc.io/docs/guides/retry/)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Amazon Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [AWS SDKs and Tools: Retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [Go `context` package documentation](https://pkg.go.dev/context)
- [Go `net/http` package documentation](https://pkg.go.dev/net/http)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)

## Issues Found

- Three allocation formulas mixed absolute timestamps with duration caps. The initial child formula and the parallel-branch formula compared an absolute parent deadline minus a reserve with a duration-valued operation cap. Changed both to calculate duration-valued budgets from `parent deadline - now`, making the operands dimensionally consistent.
- The trusted incoming deadline formula compared an absolute incoming timestamp with a route maximum that is configured as a duration. Changed the policy limit to `now + route maximum duration` so both arguments to `min` are absolute timestamps.
- Clarified that the runtime value passed to a child is a budget when comparing an operation cap with remaining time. This keeps the surrounding explanation consistent with the corrected formulas.

## Review Notes

- The fenced examples are language-neutral timing pseudocode, not executable source code, terminal commands, or configuration files.
- gRPC deadline propagation is implementation-dependent: the official guide currently documents default propagation in Java and Go and explicit enablement in C++. The post correctly tells readers to verify their runtime.
- The post correctly distinguishes an absolute deadline from a timeout duration, notes gRPC's elapsed-time deduction during propagation, and states that application code must stop work after cancellation.
- curl's documented connection phase includes DNS lookup and the requested TCP, TLS, or QUIC handshakes. Go's `net/http.Transport` separately exposes `TLSHandshakeTimeout` and `ResponseHeaderTimeout`.
- W3C `traceparent` carries tracing identifiers and flags, not a deadline.
- No specific product or library versions are pinned. The reviewed claims match the official and authoritative documentation available on 2026-07-28.
