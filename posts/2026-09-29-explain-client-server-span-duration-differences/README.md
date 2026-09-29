# Why Client and Server Span Durations Differ: Networks, Clocks, and Bodies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Distributed Tracing, HTTP, Observability

Description: Separate timing boundaries, network and queue time, retries, and clock alignment when client and server spans report different durations.

A client span lasts 320 milliseconds while its server span lasts 250 milliseconds. The remaining 70 milliseconds is not automatically network latency. It may include connection setup, pool waiting, proxy work, response handling, or different instrumentation boundaries.

Before subtracting durations, establish that the spans represent the same physical request and that their start and end events are comparable.

## Match the actual attempt

Use parent relationships and propagated context to connect the client attempt to its server span. A logical HTTP call can retry or redirect, producing several requests. Comparing the outer logical operation with only the final server attempt makes the difference appear mysteriously large.

Inspect proxies and gateways as separate hops. The server receiving the application request may be downstream of a reverse proxy whose queueing and forwarding time belongs outside the application's server span. A missing proxy span does not make that time disappear.

Record the client library, its instrumentation version, whether connection pooling is enabled, and whether the response is streamed. These details define what the duration actually measures.

## Understand the documented boundaries

OpenTelemetry allows HTTP client spans to begin before the first request byte is sent and end after response headers have been read. Inclusion of connection establishment and response-body consumption can vary, and instrumentation should document its behavior. [HTTP span conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)

This means two compliant client instrumentations can disagree on a streaming request even when they observe the same network exchange. The difference is especially visible when the application reads the body slowly or abandons it.

Use a timing ledger for a controlled request:

| Local observation | Illustrative duration |
| --- | --- |
| Wait for pooled connection | 20 ms |
| Request write and transit | 15 ms |
| Server handling | 250 ms |
| Response arrival and header processing | 35 ms |
| Body consumed afterward | 800 ms |

If the client span covers the first four intervals, it lasts 320 ms. If a different integration includes all body consumption, its duration is much longer. This ledger is an explanatory example; overlapping work and buffering can prevent such a simple additive decomposition in real systems.

## Separate elapsed time from clock alignment

A trace viewer places timestamps from different hosts on one timeline. Clock offsets can make a server span appear to start before its caller or end outside it. A constant wall-clock offset does not, by itself, change a correctly measured local elapsed duration. Clock steps and implementation choices can affect measurements differently.

For local diagnostic measurements in Python, `time.monotonic()` measures elapsed time without depending on wall-clock adjustments. Do not compare monotonic timestamps from unrelated hosts as if they shared an epoch. [Python time functions](https://docs.python.org/3/library/time.html)

Retain the raw event timestamps, known host clock offsets, and collection times when investigating skew. Do not rewrite application timestamps merely to force every child rectangle inside its parent. OpenTelemetry records span start and end timestamps separately from parent relationships and links, so causality is represented by identifiers rather than visual nesting alone. [OpenTelemetry tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)

## Instrument the missing boundary

If the question is user-perceived latency, add a bounded application span around the complete operation, including required body processing. Keep the HTTP client span for its documented transport/library operation. Use stable names such as `catalog.fetch_and_decode`, not names containing item IDs.

If pool wait matters, use supported client-library pool metrics or a dedicated acquisition measurement. If DNS/TLS dominates, use the integration's network diagnostics where available. If server queueing happens before framework instrumentation begins, inspect the listener, proxy, or runtime that owns that queue.

Avoid claiming that the sum of all child spans equals the parent's duration. Children can overlap, and uninstrumented intervals can remain. Similarly, asynchronous children can intentionally continue after a parent ends, so containment is not an absolute correctness rule.

## Verify with controlled experiments

Compare a warm connection with a cold one, a small response with a streamed body, and one successful attempt with a forced retry. Introduce a known server delay in a test environment and confirm which spans grow. Record whether the client span ends before or after the last body byte is consumed.

Use metrics for distributions and traces for individual explanations. Compute client and server percentiles separately; subtracting their p99 values does not produce a network p99 because the underlying requests and order statistics may differ.

## Conclusion

A duration difference is a clue about boundaries. Match the physical attempt, document the library's timing behavior, separate local elapsed time from cross-host clock placement, and measure the missing phase before labeling it network latency.
