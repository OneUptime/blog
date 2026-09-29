# Validation Summary: Why Client and Server Span Durations Differ: Networks, Clocks, and Bodies

## Status
validated

## Post Type
Technical explanatory guide. Although there are no runnable code blocks, commands, or configuration snippets, the post contains substantive implementation details about HTTP instrumentation, timing boundaries, and diagnostic measurements.

## Technologies Covered
- OpenTelemetry HTTP semantic conventions and tracing API
- Distributed tracing, context propagation, and span relationships
- HTTP retries, redirects, streaming responses, connection pooling, and reverse proxies
- DNS and TLS diagnostics
- Python monotonic clocks
- Latency metrics, distributions, and percentiles

## Sources Consulted
- OpenTelemetry HTTP span conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/ — client timing boundaries, retries, redirects, and proxy topology.
- OpenTelemetry tracing API: https://opentelemetry.io/docs/specs/otel/trace/api/ — timestamps, parent relationships, links, span naming, and independent child lifetimes.
- OpenTelemetry common specification: https://opentelemetry.io/docs/specs/otel/common/ — checked the original citation; its current content does not provide the claimed timestamp/duration definitions.
- Python time documentation: https://docs.python.org/3/library/time.html#time.monotonic — monotonic clock behavior and reference-point limitations.
- Go HTTP tracing documentation: https://pkg.go.dev/net/http/httptrace#ClientTrace — supported connection acquisition, connection reuse, DNS, TLS, and response timing hooks as concrete examples of library diagnostics.
- Prometheus histograms and summaries: https://prometheus.io/docs/practices/histograms/ — quantile definitions and limitations on combining computed quantiles.
- Author profile: https://github.com/nawazdhandala — verified the original www.github.com link redirects to the intended profile.

## Issues Found
- The clock-alignment paragraph attributed timestamp and duration definitions to the common specification, but the current linked page does not contain them. Replaced that sentence with the tracing API's explicit distinction between span timestamps and parent/link relationships, and linked directly to that API specification. This preserves the original point about causality and visual nesting while correcting its supporting reference.

## Review Notes
- Client spans can include different connection and body-reading intervals. The HTTP conventions recommend starting before request transmission and ending after headers are read or fail to be read; they also discourage ending spans during unrelated asynchronous cleanup of abandoned responses. The post does not recommend that cleanup behavior.
- Per-attempt comparison is appropriate. Instrumentations may expose an encompassing client operation when per-attempt hooks are unavailable, so library and version details remain important.
- The timing ledger is arithmetically correct: 20 + 15 + 250 + 35 = 320 ms; including the subsequent 800 ms yields 1,120 ms. Its explicit overlap and buffering caveat prevents interpreting the illustration as a universal decomposition.
- A constant clock offset cancels when subtracting two local timestamps. Cross-host placement can still be misleading, and actual clock changes or SDK clock choices can affect measurements. Python monotonic differences are suitable for local elapsed-time diagnostics, without assuming a shared epoch across hosts.
- Stable application span names, independent child lifetimes, and the warning against summing overlapping children agree with the tracing API model.
- Pool wait and pre-framework queueing visibility depend on where instrumentation begins; the post appropriately makes these recommendations conditional on available diagnostics.
- Subtracting separately calculated p99 values does not yield the p99 of paired differences. This follows from quantile ordering and remains true even with matching request populations; a paired duration difference also need not represent network time alone.
- The remaining original links resolve to the intended resources. No version-specific API migrations or deprecated APIs were identified. No executable examples or configuration were present, so runtime integration tests were not applicable.
