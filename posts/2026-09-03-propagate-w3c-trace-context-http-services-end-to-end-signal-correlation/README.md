# Propagate W3C Trace Context Across HTTP Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: W3C Trace Context, Distributed Tracing, OpenTelemetry, Correlation

Description: Propagate traceparent and tracestate safely across HTTP boundaries so spans, logs, and related telemetry remain connected end to end.

---

An HTTP trace stays continuous only when every hop extracts the incoming trace context, makes it current while handling the request, and injects the resulting context into each outbound request. Merely copying an arbitrary `X-Correlation-ID` does not create parent-child span relationships.

W3C Trace Context defines two HTTP fields. `traceparent` carries the interoperable trace ID, parent span ID, and trace flags. `tracestate` carries optional vendor-specific state. OpenTelemetry's default W3C propagator implements those wire rules, so application code should use its inject and extract APIs instead of parsing or constructing headers itself.

## Understand What Goes on the Wire

A version `00` traceparent has this shape:

~~~text
00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
|  |                                |                |
|  32 hexadecimal trace ID          16 hex span ID   flags
version
~~~

The IDs must not be all zero. The final `01` has the sampled bit set; it is a recording hint, not proof that every span is stored. On an outbound hop, the trace ID normally stays the same while the parent ID changes to the injecting span's ID.

Do not use `tracestate` as general application metadata. Its members are opaque tracing-system state with strict syntax and size rules. W3C Baggage is the standard carrier for explicitly chosen application context, but baggage is also sent downstream and may escape a trust boundary. Never place secrets, access tokens, raw customer data, or unbounded values in it.

## Apply the Server-to-Client Sequence

At each service, perform the operations in this order:

1. Extract context from the inbound HTTP headers with the configured propagator.
2. Start the server span using that extracted context as its parent. If extraction returns no valid remote context, start a new trace.
3. Make the server span's context current for request handling.
4. Start a client span for an outbound call.
5. Inject the client span's current context into a fresh outbound header carrier.
6. Send the request, record the result, end the client span, and finally end the server span.

The language API varies, but the framework-independent logic looks like this:

~~~text
remote = propagator.extract(root_context, request.headers, header_getter)
server = tracer.start_server_span("GET /checkout", parent=remote)

try:
    with make_current(server):
        client = tracer.start_client_span("POST payment-api")
        try:
            with make_current(client):
                outbound_headers = {}
                propagator.inject(current_context(), outbound_headers, header_setter)
                response = http.post(payment_url, headers=outbound_headers)
        finally:
            client.end()
finally:
    server.end()
~~~

Use your OpenTelemetry HTTP server and client instrumentation where it exists. It already handles framework lifecycle details such as exceptions, redirects, streaming responses, and asynchronous completion. Manual instrumentation is most useful at a proprietary boundary or as a test oracle.

## Configure One Propagation Contract

All services on a path need compatible propagators. A typical OpenTelemetry environment configuration is:

~~~bash
OTEL_PROPAGATORS=tracecontext,baggage
~~~

That setting names propagators; it does not make an uninstrumented HTTP client inject headers. Likewise, deploying an OpenTelemetry Collector exports telemetry but does not automatically modify application HTTP traffic. Instrument the client and server libraries themselves.

During a migration from a vendor-specific format, configure a composite propagator only if duplicate fields are intentional. Establish precedence for conflicting inbound contexts and test it. Blindly accepting multiple independent parent formats can split one request into different traces in different services.

## Treat Incoming Context as Untrusted

Public callers can supply `traceparent`. The W3C specification requires invalid values to be rejected and a new context created; do not partially repair them. At a security boundary, decide whether to continue, restart, or link to the remote trace according to policy. A useful pattern is to keep the external identifier as a link while starting a new internal trace when trusting an externally selected trace ID would create abuse or data-separation risks.

Also apply these controls:

- cap baggage and header sizes at the edge;
- allowlist baggage keys rather than forwarding all of them;
- avoid logging complete `tracestate` or baggage values;
- prevent trace headers from being sent to unrelated third-party endpoints;
- preserve header values through trusted proxies, while ensuring the active tracing library owns updates.

HTTP header names are case-insensitive, but W3C recommends sending lowercase `traceparent` and `tracestate`. Gateways should not combine multiple `traceparent` values. Test the exact behavior of service meshes, API gateways, and retrying clients on the real path.

## Correlate Logs Without Reusing Headers

Within request handling, enrich structured logs from the active span context. The OpenTelemetry non-OTLP compatibility guidance uses lowercase `trace_id`, `span_id`, and `trace_flags`. A log might be:

~~~json
{
  "severity": "ERROR",
  "service.name": "checkout",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "message": "payment request timed out"
}
~~~

Read these values from the active context, not directly from the original inbound header. The current span ID changes as work moves through spans, and copied header text would point at the upstream parent instead of the span that emitted the log.

## Verify Continuity at Every Boundary

An integration test should capture headers and exported spans for at least three services. Assert that:

- service A's client span and service B's server span have the same trace ID;
- B's server span has A's client span ID as its parent;
- B injects a new parent ID when calling C;
- an invalid or all-zero inbound ID starts a valid new trace;
- unsampled context still propagates, even when spans are not exported;
- concurrent requests never exchange context;
- a trusted proxy neither drops nor duplicates the fields;
- logs inside each span carry the active trace and span IDs.

When continuity breaks, inspect the request at both sides of each boundary. If the outgoing field is absent, client injection is missing. If it is present but the downstream trace is new, extraction or propagator configuration is wrong. If span ancestry is correct but the UI cannot find it, investigate export, sampling, tenancy, and retention rather than propagation.

## Conclusion

Reliable HTTP correlation is a lifecycle discipline: extract, create the server span, activate it, create each client span, inject that current context, and always close scopes. Let a standards-compliant propagator own the wire format, constrain untrusted context at boundaries, and prove parentage with integration tests. Once that contract is consistent, traces and trace-enriched logs can connect a request across otherwise independent services.

## Official References

- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [W3C Baggage](https://www.w3.org/TR/baggage/)
- [OpenTelemetry Context Propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [OpenTelemetry Trace API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry Trace Context in non-OTLP Log Formats](https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/)
