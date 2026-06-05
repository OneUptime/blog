# Validation Summary: How to Trace Deadlocks and Thread Contention Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Java API
- Java `ReentrantLock`
- Python trace timing analysis
- Deadlock and thread contention diagnostics

## Sources Consulted
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Semantic Conventions documentation: https://opentelemetry.io/docs/specs/semconv/
- Oracle Java SE 21 `ReentrantLock` API documentation: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html

## Issues Found
- The post originally stated that span timing gaps directly detect blocked threads. I changed this to describe gaps as strong signals, because OpenTelemetry spans show recorded work boundaries, but uninstrumented work can also create gaps.
- The parent/child duration analyzer summed child span durations directly. I changed it to merge overlapping child intervals before summing, because overlapping child spans would otherwise be double-counted and could produce misleading gap calculations.
- The deadlock detection section described timeout-based lock waits as deadlocks. I clarified that these spans may indicate a deadlock or severe contention, because a timed-out lock acquisition alone does not prove a circular wait.
- The lock instrumentation text used `lock.*` attributes without identifying them as custom attributes. I clarified that they are custom attributes, since current OpenTelemetry semantic conventions do not define standard lock acquisition span attributes for this example.
- The final Java event snippet referenced `Attributes` and `AttributeKey` without imports. I changed it to use fully qualified OpenTelemetry API class names so the snippet is syntactically clear in isolation.

## Review Notes
- The Java `ReentrantLock` API usage is valid: `tryLock(long, TimeUnit)` can wait up to the timeout and returns `false` when the wait elapses; `getQueueLength()` is only an estimate and is appropriate here as diagnostic metadata.
- The OpenTelemetry Java API supports setting span attributes and adding span events with attributes as shown.
- The Python examples assume trace timestamps are numeric nanoseconds. Some exported trace formats represent timestamps as strings or use different field names, so real production analyzers may need format-specific parsing.
