# Validation Summary: How to Build a Custom ID Generator for OpenTelemetry Trace and Span IDs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Java SDK
- Java
- W3C Trace Context
- Distributed tracing

## Sources Consulted
- OpenTelemetry Java `IdGenerator` source: https://github.com/open-telemetry/opentelemetry-java/blob/main/sdk/trace/src/main/java/io/opentelemetry/sdk/trace/IdGenerator.java
- OpenTelemetry Java `SdkTracerProviderBuilder` source: https://github.com/open-telemetry/opentelemetry-java/blob/main/sdk/trace/src/main/java/io/opentelemetry/sdk/trace/SdkTracerProviderBuilder.java
- OpenTelemetry Java `TraceId` source: https://github.com/open-telemetry/opentelemetry-java/blob/main/api/all/src/main/java/io/opentelemetry/api/trace/TraceId.java
- OpenTelemetry Java `SpanId` source: https://github.com/open-telemetry/opentelemetry-java/blob/main/api/all/src/main/java/io/opentelemetry/api/trace/SpanId.java
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- W3C Trace Context Level 2 Candidate Recommendation: https://www.w3.org/TR/trace-context-2/
- Oracle Java `ThreadLocalRandom` API documentation: https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/ThreadLocalRandom.html
- Oracle Java `Random` API documentation: https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Random.html

## Issues Found
- The post described `IdGenerator` as defining only two methods. Current OpenTelemetry Java still has two required ID generation methods, but also includes the default `generatesRandomTraceIds()` method. Updated the wording and added a note about overriding it when custom trace IDs meet W3C randomness requirements.
- The post said an all-zero ID meant "invalid/not-sampled." The sampled decision is represented by trace flags, not by zero IDs. Updated the wording to say all-zero IDs are invalid.
- The datacenter-aware generator used `((long) datacenterId << 48)`, which sign-extends negative `short` values. Changed it to mask the datacenter ID with `0xFFFFL` before shifting.
- The datacenter timestamp comment said 48 bits of seconds was enough for about 8,900 years. Corrected this to about 8.9 million years.
- The registration and test snippets used `IdGenerator` without importing it. Added the missing imports.
- The thread-safety section said `Random.nextLong()` is synchronized internally. Oracle documents `Random` as thread-safe but potentially contended when shared across threads, so the comment was corrected.
- The randomness guidance said at least 8 bytes of randomness is recommended. Current W3C Trace Context Level 2 guidance recommends randomly or pseudo-randomly generating at least the right-most 7 bytes of the trace ID, so the post now reflects that wording.

## Review Notes
The examples are illustrative and should work with the current OpenTelemetry Java SDK API after the import fixes. The custom trace ID generators intentionally reserve prefix bits for timestamps or datacenter data, so they should only override `generatesRandomTraceIds()` if the generated trace IDs satisfy the current W3C randomness requirements.
