# Why Do Trace IDs in Logs Fail to Link to Traces? Checking Formats, Sampling, and Data Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Distributed Tracing, Application Logging, OpenTelemetry, Grafana

Description: Diagnose broken log-to-trace links by checking active context, identifier encoding, sampling, retention, tenancy, and data-source link configuration.

---

A trace ID printed in a log proves only that a string was recorded. A working log-to-trace link requires four independent conditions: the log captured the correct active context, the identifier survived ingestion in the expected format, the corresponding trace was exported and retained, and the observability UI queried the right trace data source and tenant.

Debug those layers in order. Changing a dashboard regex cannot recover a trace that sampling dropped, and changing a sampler cannot repair logs that contain an upstream span's stale ID.

## Validate the Identifier Itself

OpenTelemetry's `SpanContext` follows W3C Trace Context. Its hexadecimal trace ID is exactly 32 lowercase hex characters representing 16 bytes; its span ID is exactly 16 lowercase hex characters representing 8 bytes. A valid identifier cannot be all zero.

For non-OTLP logs, OpenTelemetry recommends these top-level names and encodings:

~~~json
{
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "trace_flags": "01",
  "message": "inventory reservation failed"
}
~~~

Common failures include:

- a 16-character span ID placed in the trace field;
- braces, `0x`, dashes, or a vendor URL prefix around the ID;
- integer conversion that drops leading zeroes;
- uppercase data while the extraction regex accepts only lowercase;
- a field renamed from `trace_id` to `traceId` during parsing;
- quoting or escaping captured as part of the field value;
- an all-zero or placeholder ID logged when no span is active.

Keep the ID as a string throughout the log pipeline. Never parse it as a number. If using OTLP Logs, map it to the native `TraceId` field rather than an arbitrary attribute when the exporter supports that data model.

## Prove the Log Captures Active Context

Log enrichment must occur while the intended span is current. Reading the original inbound `traceparent` header records the caller's trace ID but often the caller's parent span ID, not the server span that emitted the log. A manually cached thread-local value may vanish at an executor boundary or leak to the next request on a pooled thread.

Emit one controlled log inside a known span and capture the exported span directly. Compare both trace ID and span ID byte for byte. Then test an async callback and concurrent requests. If the direct case works but async fails, fix context propagation before touching the backend.

OpenTelemetry's Logs Data Model permits trace fields to be absent. When `SpanId` is present, `TraceId` should also be present. This means an uncorrelated startup or background log is not necessarily malformed; the UI should create a link only when a valid context exists.

## Determine Whether the Trace Exists

The W3C sampled flag is a propagation hint. In the OpenTelemetry SDK, a head sampler may create a non-recording span or record without exporting. A tail-sampling Collector can wait for spans and discard a trace later. Export failures, queue overflow, backend ingestion rejection, retention expiry, and tenant routing can also leave a perfectly formatted log pointing to no stored trace.

Use this evidence chain:

1. Record the log timestamp, trace ID, service name, and environment.
2. Check the SDK or agent's sampling configuration and the inbound sampled flag.
3. Inspect SDK/Collector export failure and dropped-item metrics.
4. Query the trace backend directly by the exact trace ID.
5. Query the expected tenant, project, region, and time range.
6. Compare log and trace retention windows.

Do not assume “unsampled” means context was not propagated. OpenTelemetry still generates span IDs so logs and downstream context can use them, even when a span is not recording. The resulting ID may legitimately have no exported trace.

If links must resolve for every error log, align policy rather than forcing a UI link. For example, tail-sample error traces, preserve enough Collector capacity for the decision window, and monitor trace completeness. No sampler can retroactively recover spans never recorded by an upstream head sampler.

## Check Data Source, Tenant, and Time

The log and trace can both exist but live in different scopes. Confirm:

- the link targets production Tempo rather than staging;
- organization or tenant headers match the trace's tenant;
- the service writes logs and traces to the same regional account;
- the link carries the dashboard's correct time range;
- clocks are synchronized and the UI adds enough time before and after the log;
- trace retention has not expired before log retention.

An alert generated from delayed ingestion may use alert evaluation time rather than event time. Prefer the log record's source timestamp for the initial window, while retaining observed/ingestion time for diagnosing pipeline delay. OpenTelemetry distinguishes `Timestamp` from `ObservedTimestamp` for this reason.

## Configure Both Sides of Grafana Correlation

Grafana's Tempo-to-Loki correlation and Loki-to-Tempo correlation are separate settings. Tempo controls how a span queries logs; Loki derived fields or structured metadata create the trace link on a log line. Configuring only one direction produces an asymmetric experience.

For a JSON log rendered as text, a derived field can extract one capture group:

~~~yaml
jsonData:
  derivedFields:
    - name: TraceID
      matcherRegex: '"trace_id":"([0-9a-f]{32})"'
      datasourceUid: tempo
      url: '$${__value.raw}'
~~~

Provisioning fields can differ by Grafana version, so verify the current data-source schema. More importantly, test the regex against the stored log line, not the application's pre-ingestion JSON. A log processor may add whitespace, flatten fields, or store `trace_id` as structured metadata instead of text.

For trace-to-logs, map stable span/resource attributes such as `service.name` to the equivalent Loki labels and set a sensible time shift. Do not promote trace IDs to Loki labels merely to make linking easy; every unique label set creates a stream and trace IDs are unbounded.

## Use a Failure Matrix

| Observation | Likely layer |
| --- | --- |
| No trace field in raw application log | context or logger instrumentation |
| Correct app log, missing stored field | log parsing or transformation |
| ID has wrong length or decoration | serialization or extraction |
| Direct backend lookup returns nothing | sampling, export, tenant, retention |
| Direct lookup works, click does not | derived field or target URL/query |
| Link works only from traces | Loki derived-field side missing |
| Wrong service logs open from a span | tag mapping or time-window scope |

Automate a canary that emits a span and correlated log, captures its trace ID, and verifies both directions after ingestion. This detects format and configuration drift before an incident.

## Conclusion

Treat log-to-trace navigation as an end-to-end data contract. First prove the log recorded a valid active trace and span ID, then prove the trace survived sampling and export, then verify tenant, retention, time, and bidirectional data-source configuration. That layered approach turns an apparently mysterious broken link into a small number of testable failure modes.

## Official References

- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [OpenTelemetry Trace Context in non-OTLP Log Formats](https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/)
- [OpenTelemetry Tracing SDK: Sampling](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- [Grafana: Configure Trace to Logs Correlation](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/)
- [Grafana: Introduction to Exemplars](https://grafana.com/docs/grafana/latest/fundamentals/exemplars/)
