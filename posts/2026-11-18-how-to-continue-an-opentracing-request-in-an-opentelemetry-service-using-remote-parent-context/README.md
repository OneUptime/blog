# How to Continue OpenTracing Requests with OpenTelemetry Remote Parents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTracing, Java, Migration, Context Propagation

Description: Continue requests from an OpenTracing caller by matching its wire propagator, extracting a remote parent, and creating a new OpenTelemetry server span.

An OpenTracing caller and an OpenTelemetry server can participate in one distributed trace without sharing SDK objects. They must agree on the context carried over the network. OpenTracing is an API, not one universal header format: its implementation might inject W3C headers, B3, or a vendor-specific format.

Inspect the caller's actual outgoing request before choosing the receiver's propagator. Renaming a header or casting one library's `SpanContext` into another cannot translate its semantics.

## Establish the wire contract

Record the caller's tracer implementation, configured propagator, and the trace headers received by the destination. Use a controlled request with no sensitive application headers.

| Observed context | Receiver action |
| --- | --- |
| `traceparent` and optional `tracestate` | Extract with W3C Trace Context. |
| `b3` or `X-B3-*` | Use a supported B3 propagator; OpenTelemetry B3 extraction supports both encodings, with single-header precedence. |
| A vendor-specific header | Install the corresponding supported propagator or migrate injection at the sender. |
| No trace header | Repair the sender or intermediary before debugging parent assignment. |

Do not install every available propagator without a precedence policy. Conflicting formats can describe different parents. The [OpenTelemetry propagator specification](https://opentelemetry.io/docs/specs/otel/context/api-propagators/) separates transport carriers from the extraction and injection logic.

## Extract before creating the server span

This Java example handles a W3C request at an otherwise uninstrumented server boundary. `headers` is a map normalized to lowercase by the transport adapter, and `otel` is the configured application instance:

```java
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.*;
import io.opentelemetry.api.trace.propagation.W3CTraceContextPropagator;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapGetter;
import java.util.Map;

public final class IncomingTrace {
    private static final TextMapGetter<Map<String, String>> GETTER =
        new TextMapGetter<>() {
            public Iterable<String> keys(Map<String, String> carrier) {
                return carrier.keySet();
            }
            public String get(Map<String, String> carrier, String key) {
                return carrier == null ? null : carrier.get(key);
            }
        };

    public static void handle(OpenTelemetry otel, Map<String, String> headers,
                              Runnable operation) {
        Context extracted = W3CTraceContextPropagator.getInstance()
            .extract(Context.root(), headers, GETTER);
        Span server = otel.getTracer("example.legacy-boundary")
            .spanBuilder("handle legacy request")
            .setSpanKind(SpanKind.SERVER)
            .setParent(extracted)
            .startSpan();
        try (Scope scope = extracted.with(server).makeCurrent()) {
            operation.run();
        } catch (RuntimeException failure) {
            server.recordException(failure);
            server.setStatus(StatusCode.ERROR);
            throw failure;
        } finally {
            server.end();
        }
    }
}
```

Starting extraction from `Context.root()` prevents a pooled request thread's ambient context from becoming an accidental fallback. W3C extraction produces a remote span context when valid headers are present. An invalid or absent `traceparent` leaves no valid remote parent, so this example creates a root. Malformed `tracestate` does not invalidate a valid `traceparent`; the parent is retained without that trace state. Add any ingress trust policy before accepting remote sampling decisions.

The server span must have a new span ID while retaining the extracted trace ID. Do not create a new span with the caller's span ID or export a synthetic copy of its span. The [tracing API specification](https://opentelemetry.io/docs/specs/otel/trace/api/) defines remote contexts and parent relationships.

If ASP.NET, Spring, Servlet, or another framework is already instrumented, the server span and extraction may already exist. Put business spans beneath that server span instead of wrapping the request in a second SERVER span.

## Keep extraction separate from recording

A remotely extracted span is a context carrier. It is normally non-recording because the real operation ran in another process. That does not imply propagation failed. Inspect validity, remote status, IDs, and sampling flags rather than treating `isRecording()` on the remote span as an export-health check.

After `handle` starts its server span, work invoked inside the scope sees that new span as current. Closing the scope restores the thread's previous context. Async work needs explicit context capture at its scheduling boundary; this synchronous `Runnable` example does not cover a deferred callback.

## Verify both sides of the migration

Use a sampled test request and compare:

1. The caller's outgoing client span ID with the receiver's parent span ID.
2. Both trace IDs, which should match.
3. The receiver's own span ID, which must differ from its parent.
4. The receiver's nested operation, which should be a child of its server span.

Also test missing headers, malformed context, and a second unrelated request on the same worker. If IDs connect but one side is absent from the backend, inspect sampling and export separately. Header propagation does not export the caller's span for it.

An OpenTracing shim can help an existing codebase migrate in-process, but it is not required for this network boundary. The [OpenTracing compatibility specification](https://opentelemetry.io/docs/specs/otel/compatibility/opentracing/) was deprecated in March 2026; assess the support status of an existing shim instead of building a new long-term dependency around it. The [Java API guide](https://opentelemetry.io/docs/languages/java/api/) provides the direct context and span APIs used here.
