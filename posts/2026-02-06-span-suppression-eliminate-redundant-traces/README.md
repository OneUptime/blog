# How to Implement Span Suppression Strategies to Eliminate Redundant Trace Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Trace, Span Suppression, Cost Reduction

Description: Reduce trace data volume by suppressing redundant and low-value spans using OpenTelemetry SDK and Collector techniques.

A single HTTP request in a microservices architecture can generate dozens of spans. The top-level API gateway span, the downstream service call, the database query, the cache lookup, the serialization step - each one creates a span. Many of these spans carry redundant information or describe operations so fast they provide no diagnostic value. Suppressing these spans can cut trace storage costs by 40-60% without reducing your ability to debug issues.

## Identifying Redundant Spans

Before suppressing anything, you need to know which spans are candidates. Look at your trace data and identify these patterns:

- **Health check spans**: Every Kubernetes liveness and readiness probe generates a span. These are high volume and almost never useful for debugging.
- **Internal framework spans**: Many instrumentation libraries create spans for middleware, serialization, and routing that add noise without insight.
- **Nested database spans**: An ORM might create a span for the high-level query method and another for the raw SQL execution. The inner span is usually sufficient.
- **Ultra-short spans**: Spans under 1 millisecond rarely contain useful timing data and add to storage costs.

## Strategy 1: SDK-Level Span Filtering

The most efficient place to suppress spans is at the SDK, before they are serialized. Use a custom SpanProcessor with an exporter wrapper or the built-in filtering capabilities.

Here is a Java example that suppresses health check and framework-internal spans:

```java
// Custom SpanProcessor and exporter wrapper that filter out
// low-value spans before they are sent over the network.
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.sdk.trace.SpanProcessor;
import io.opentelemetry.sdk.trace.ReadWriteSpan;
import io.opentelemetry.sdk.trace.ReadableSpan;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import io.opentelemetry.sdk.common.CompletableResultCode;
import io.opentelemetry.context.Context;
import java.util.Collection;
import java.util.List;
import java.util.Set;

public class SpanSuppressionProcessor implements SpanProcessor {

    private static final AttributeKey<Boolean> SUPPRESS_KEY =
        AttributeKey.booleanKey("otel.suppress");

    // Set of span names to suppress entirely
    private static final Set<String> SUPPRESSED_NAMES = Set.of(
        "GET /healthz",
        "GET /readyz",
        "GET /livez",
        "GET /metrics",
        "middleware - cors",
        "middleware - compression",
        "serialize response"
    );

    // Minimum duration in nanoseconds (1ms) - spans shorter
    // than this are suppressed as they add noise without value
    private static final long MIN_DURATION_NANOS = 1_000_000;

    @Override
    public void onStart(Context parentContext, ReadWriteSpan span) {
        // Check span name at start time for known suppressed patterns.
        // Setting an attribute that the exporter checks.
        if (SUPPRESSED_NAMES.contains(span.getName())) {
            span.setAttribute(SUPPRESS_KEY, true);
        }
    }

    @Override
    public void onEnd(ReadableSpan span) {
        // No-op: filtering happens in the exporter wrapper
    }

    @Override
    public boolean isStartRequired() { return true; }

    @Override
    public boolean isEndRequired() { return false; }

    public static class FilteringSpanExporter implements SpanExporter {
        private final SpanExporter delegate;

        public FilteringSpanExporter(SpanExporter delegate) {
            this.delegate = delegate;
        }

        @Override
        public CompletableResultCode export(Collection<SpanData> spans) {
            List<SpanData> filtered = spans.stream()
                .filter(span -> span.getStatus().getStatusCode() == StatusCode.ERROR
                    || !Boolean.TRUE.equals(
                    span.getAttributes().get(SUPPRESS_KEY)))
                .filter(span -> span.getStatus().getStatusCode() == StatusCode.ERROR
                    || (span.getEndEpochNanos() - span.getStartEpochNanos())
                        >= MIN_DURATION_NANOS)
                .toList();
            return delegate.export(filtered);
        }

        @Override
        public CompletableResultCode flush() {
            return delegate.flush();
        }

        @Override
        public CompletableResultCode shutdown() {
            return delegate.shutdown();
        }
    }
}
```

A simpler Python approach using the OpenTelemetry SDK's environment variable configuration before auto-instrumentation starts:

```python
# Suppress specific instrumentation libraries that generate

# low-value spans. This disables them entirely at the SDK level.
import os

# Disable instrumentation for libraries that create noisy spans.
# Comma-separated list of instrumentation library names to exclude.
os.environ["OTEL_PYTHON_DISABLED_INSTRUMENTATIONS"] = (
    "urllib3,"       # Suppress HTTP client internal spans
    "threading,"     # Thread lifecycle spans add noise
    "sqlite3"        # Low-level DB driver spans (keep SQLAlchemy)
)

# For more granular control, configure span limits to cap
# the number of attributes and events per span.
os.environ["OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT"] = "32"
os.environ["OTEL_SPAN_EVENT_COUNT_LIMIT"] = "8"
os.environ["OTEL_SPAN_LINK_COUNT_LIMIT"] = "4"
```

## Strategy 2: Collector-Level Span Filtering

When you cannot modify application code, the Collector's filter processor handles span suppression:

```yaml
# Collector config that suppresses health check spans, ultra-short
# spans, and framework-internal spans at the pipeline level.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Filter processor drops entire spans matching these conditions.
  filter/suppress:
    error_mode: ignore
    trace_conditions:
      # Drop health check endpoint spans
      - span.name != nil and IsMatch(span.name, "GET /health.*")
      - span.name != nil and IsMatch(span.name, "GET /ready.*")
      - span.name != nil and IsMatch(span.name, "GET /live.*")
      - span.name == "GET /metrics"

      # Drop spans from internal middleware
      - span.name != nil and IsMatch(span.name, "middleware.*")

      # Drop spans shorter than 1ms that completed successfully
      # (keep short error spans since they indicate fast failures)
      - (span.end_time - span.start_time) < Duration("1ms")
          and span.status.code != STATUS_CODE_ERROR

  # The transform processor can also remove large attributes
  # before spans are exported.
  transform/cleanup:
    trace_statements:
      # Remove large attributes that inflate span size
      # without providing diagnostic value.
      - delete_key(span.attributes, "http.request.header.cookie")
      - delete_key(span.attributes, "http.request.header.authorization")
      - truncate_all(span.attributes, 256)

  batch:
    send_batch_size: 8192
    timeout: 5s

exporters:
  otlphttp:
    endpoint: https://trace-backend.internal:4318

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/suppress, transform/cleanup, batch]
      exporters: [otlphttp]
```

## Strategy 3: Suppress Nested Duplicate Spans

ORMs and HTTP clients often create redundant nested spans. For example, a call to `UserRepository.findById()` might generate:

1. `UserRepository.findById` (application span)
2. `SELECT * FROM users WHERE id = ?` (JDBC span)
3. `PostgreSQL query` (driver span)

Keeping span 2 and suppressing 1 and 3 preserves the diagnostic value while reducing span count by 66%.

```yaml
# Use the span processor to identify and suppress redundant
# parent/child spans that carry duplicate information.
processors:
  filter/dedup_db:
    error_mode: ignore
    trace_conditions:
      # Suppress raw driver-level spans when ORM spans exist.
      # The ORM span contains the parameterized query which
      # is more useful than the raw driver span.
      - span.attributes["db.system"] == "postgresql"
          and span.name != nil
          and IsMatch(span.name, "PostgreSQL.*")
          and not IsRootSpan()

  # Also suppress trivially short internal spans
  filter/trivial:
    error_mode: ignore
    trace_conditions:
      - span.kind.string == "Internal"
          and (span.end_time - span.start_time) < Duration("500us")
          and span.status.code != STATUS_CODE_ERROR
```

## Measuring Suppression Impact

Track the number of spans before and after suppression:

```promql
# Compare spans received vs. spans exported to measure
# how many spans are being suppressed by the filter.
(
  rate(otelcol_receiver_accepted_spans_total[5m])
  -
  rate(otelcol_exporter_sent_spans_total[5m])
)
/
rate(otelcol_receiver_accepted_spans_total[5m])
* 100
```

A typical suppression configuration eliminates 40-60% of spans. Health check suppression alone often accounts for 15-20% of total span volume in Kubernetes environments.

## Guidelines for Safe Suppression

- Never suppress error spans regardless of their source or duration
- Avoid suppressing the root span of a trace unless you intend to drop that entire low-value trace, such as health checks
- Always test suppression rules in staging before production
- Monitor `otelcol_processor_filter_logs.filtered` and `otelcol_processor_filter_spans.filtered` metrics to ensure filters are working as expected
- Review suppression rules quarterly as new services and instrumentation libraries are added

Span suppression is a targeted optimization that removes noise while preserving signal. Unlike sampling, which probabilistically drops entire traces, suppression selectively removes specific low-value spans from every trace, keeping the overall trace structure intact for debugging.
