# Validation Summary: Missing Root Span Time: Find Queue, Lock, and Connection-Pool Waits

## Status
validated

## Post Type
Technical troubleshooting guide with Python examples.

## Technologies Covered
- OpenTelemetry tracing, Python API/SDK, and Collector
- Python interval calculations and monotonic clocks
- Database connection pools and driver instrumentation
- Mutexes, semaphores, and executor queues
- Browser request timing and performance profiling

## Sources Consulted
- [OpenTelemetry trace concepts](https://opentelemetry.io/docs/concepts/signals/traces/) — span timestamps and parent-child relationships.
- [OpenTelemetry tracing API specification](https://opentelemetry.io/docs/specs/otel/trace/api/) — span lifetimes and naming guidance.
- [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/) — tracer setup and context-managed spans.
- [OpenTelemetry Python trace API](https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html) — current APIs, span termination, context restoration, and exception handling.
- [OpenTelemetry DB-API instrumentation](https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/dbapi/dbapi.html) — driver operation instrumentation boundaries.
- [OpenTelemetry sampling](https://opentelemetry.io/docs/concepts/sampling/) — telemetry selection and completeness considerations.
- [OpenTelemetry Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/) — exporter failures, queue overflow, and telemetry loss.
- [Python time APIs](https://docs.python.org/3/library/time.html#time.monotonic_ns) — monotonic duration measurement.
- [Python threading](https://docs.python.org/3/library/threading.html#lock-objects) — blocking lock acquisition.
- [Python asyncio synchronization](https://docs.python.org/3/library/asyncio-sync.html#semaphore) — awaited semaphore acquisition.
- [Python concurrent futures](https://docs.python.org/3/library/concurrent.futures.html) — submission, pending tasks, and execution.
- [SQLAlchemy connection pooling](https://docs.sqlalchemy.org/en/20/core/pooling.html) — bounded pools and acquisition timeouts; consulted as a concrete pool example, not as the adapter used by the post.
- [W3C Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/) — browser timing boundaries, DNS, and connection establishment.
- [Jaeger deployment documentation](https://www.jaegertracing.io/docs/2.0/deployment/) — clock skew adjustment context.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the post's author link redirects to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post correctly distinguishes summed durations from interval-union coverage and does not equate uncovered time with CPU execution.
- Executed both Python snippets using the installed OpenTelemetry API. Both published assertions passed. An additional 1,000 deterministic randomized integer-interval cases matched an independent discrete coverage calculation, including overlapping, nested, out-of-range, empty, and reversed child intervals. An invalid root correctly raised ValueError.
- Exercised the acquisition example with a fake synchronous pool: successful queries returned their result and released the connection; query failures propagated and still released the connection; acquisition timeouts propagated without attempting to release an unacquired connection.
- The local environment has the OpenTelemetry API but no tracing SDK. Runtime checks therefore used its default non-recording provider; recording, export, parentage, and exception-event behavior were verified against official documentation rather than a live backend.
- The pool and query callback are explicitly adapter placeholders. Real integrations must use their adapter's acquisition/release contract and configure the SDK as stated. Acquisition duration can include connection creation or validation as well as contention, so the post appropriately calls for corroborating evidence under controlled load.
- Browser timings and server spans have different measurement boundaries. Comparisons with server metrics also require matching the operation and timing boundary. Backend display, query truncation, and delayed visibility are deployment-specific checks rather than guarantees about every tracing UI.
- No CLI commands, configuration snippets, pinned versions, or deprecated APIs require correction. All external links in the post resolved to the intended resources.
- The Collector troubleshooting page could not be retrieved through the browsing tool; the accessible official Collector resiliency documentation supplied the evidence for exporter failures and dropped telemetry.
