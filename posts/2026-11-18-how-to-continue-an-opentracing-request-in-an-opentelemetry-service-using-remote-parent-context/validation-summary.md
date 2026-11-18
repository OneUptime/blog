# Validation Summary: How to Continue OpenTracing Requests with OpenTelemetry Remote Parents

## Status
validated

## Post Type
Technical guide with a Java implementation example.

## Technologies Covered
- OpenTelemetry Java tracing and context APIs
- OpenTracing migration and compatibility shims
- W3C Trace Context (`traceparent` and `tracestate`)
- B3 single-header and multi-header propagation
- Distributed tracing, remote parents, sampling, and span export
- Framework instrumentation (Spring, Servlet, and ASP.NET)

## Sources Consulted
- OpenTelemetry Propagators API: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Tracing API: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Java API guide: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry OpenTracing compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/opentracing/
- OpenTelemetry Java W3C propagator implementation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-java/main/api/all/src/main/java/io/opentelemetry/api/trace/propagation/W3CTraceContextPropagator.java
- OpenTelemetry Java Context implementation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-java/main/context/src/main/java/io/opentelemetry/context/Context.java
- W3C Trace Context recommendation: https://www.w3.org/TR/trace-context/
- Oracle Java SE 9 language updates: https://docs.oracle.com/javase/9/language/toc.htm
- Author profile: https://github.com/nawazdhandala

## Issues Found
1. The statement that invalid input always leaves no remote parent was too broad. A malformed `tracestate` does not invalidate a valid `traceparent`. Updated the paragraph to distinguish invalid or missing `traceparent` from malformed `tracestate`, matching Java's extraction behavior.
2. The B3 table suggested choosing a receiver propagator by the sender's encoding. OpenTelemetry requires B3 extraction to support both encodings and prefer the single header when both are present. Updated the table to state that behavior; encoding configuration primarily controls injection.

## Review Notes
- Reviewed the Java example statically against the official API guide and implementation. Its imports, generic getter, explicit parent, SERVER kind, scope management, exception recording, ERROR status, and finally-based span ending are consistent with those APIs. No deprecated API use was identified in the example.
- The anonymous-class diamond syntax requires Java 9 or newer. No Java 8 compatibility is claimed in the post.
- The configured application instance must use an SDK tracer provider to create new span IDs and record spans. The no-op API alone does not create the server span described here. Export additionally requires an appropriate processor/exporter and sampling configuration.
- Extraction from the root context prevents ambient span fallback. Valid extracted context is remote and wrapped in a non-recording span; the newly created server span becomes current inside the scope. Closing the scope restores the previous context.
- Nested operations need their own instrumentation to create child spans. Making the server span current does not automatically create a span for every method call.
- The example is explicitly synchronous and assumes lowercase transport header keys. Async scheduling and production HTTP instrumentation are outside its stated scope. Framework instrumentation may already provide extraction and the server span.
- Verified the March 2026 compatibility deprecation against the official specification. Existing shims may remain supported; deprecation of the specification does not establish an individual implementation's support status.
- The linked documentation and author profile resolve to the intended resources. There are no terminal commands or configuration snippets to validate.
- An independent follow-up compiled the current Java snippets with JDK 17, OpenTelemetry 1.62.0, and Kafka 4.1.0. A shared fixture for this post and the Kafka post passed 97 assertions. Remote-parent checks used an in-memory exporter to verify valid, absent, malformed, and unsampled contexts, retention of a valid traceparent with malformed tracestate, nested parent IDs, exception recording, and ambient-context restoration. B3 runtime, real agent overlap, and backend integration were not tested.
- Format validation shortened the title to meet the 80-character limit and synchronized it with Blogs.json and this review heading.
