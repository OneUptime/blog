# How to Build Centralized Audit Logging for API Access Using OpenTelemetry Trace Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Audit Logging, API Security, Observability

Description: Build a centralized audit logging system for API access tracking using OpenTelemetry distributed traces.

Every production API needs audit logging. Whether it is for security reviews, compliance requirements, or simply understanding who is calling what, having a centralized view of API access is non-negotiable. The problem is that most teams either bolt on audit logging as an afterthought (separate middleware, separate log formats, separate storage) or skip it entirely until an incident forces them to care.

If you have OpenTelemetry traces flowing from your API services, you already have the foundation. Distributed traces capture every API call with timing, caller context, and outcome. The trick is enriching those traces with the right audit fields and routing them to a queryable audit store.

## Designing the Audit Span Schema

Before writing any code, define what an audit record needs to contain. A solid API audit record includes:

- **Who**: Authenticated identity (user ID, service account, API key identifier)
- **What**: API endpoint, HTTP method, and the logical operation performed
- **When**: Request timestamp with timezone
- **Where**: Source IP, geographic region, client identifier
- **Outcome**: Success or failure, HTTP status code, error details
- **Context**: Request ID, trace ID for correlation to downstream calls

OpenTelemetry spans already capture most of the "what" and "when." You need to add the "who" and enrich the "where."

## Middleware That Enriches Spans with Audit Context

The cleanest approach is a middleware layer that adds audit attributes to the current span. This works with any OpenTelemetry-instrumented framework.

Here is a Go middleware example for an HTTP API:

```go
// Middleware that enriches the current span with audit attributes
package middleware

import (
    "net/http"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

func AuditMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        span := trace.SpanFromContext(r.Context())

        // Extract authenticated identity from your auth layer
        identity := GetAuthIdentity(r.Context())

        // Set audit-specific attributes on the existing span
        span.SetAttributes(
            // Who
            attribute.String("audit.actor.id", identity.UserID),
            attribute.String("audit.actor.type", identity.Type), // "user" or "service"
            attribute.String("audit.actor.org_id", identity.OrgID),
            attribute.String("audit.api_key_id", identity.APIKeyID),

            // Where
            attribute.String("audit.source_ip", ExtractClientIP(r)),
            attribute.String("audit.user_agent", r.UserAgent()),

            // What - logical operation name from route metadata
            attribute.String("audit.operation", GetRouteOperation(r)),
            attribute.String("audit.resource_type", GetResourceType(r)),
            attribute.String("audit.resource_id", GetResourceID(r)),

            // Classification
            attribute.String("audit.sensitivity", ClassifySensitivity(r)),
            attribute.Bool("audit.is_admin_action", identity.IsAdmin()),
        )

        // Wrap response writer to capture status code
        rw := NewResponseCapture(w)
        next.ServeHTTP(rw, r)

        // Record outcome after handler executes
        span.SetAttributes(
            attribute.Int("audit.response_status", rw.StatusCode()),
            attribute.String("audit.outcome",
                outcomeFromStatus(rw.StatusCode())),
        )
    })
}

func outcomeFromStatus(code int) string {
    if code >= 200 && code < 400 {
        return "success"
    }
    if code == 401 || code == 403 {
        return "access_denied"
    }
    return "error"
}
```

## Collector Pipeline for Audit Extraction

With audit attributes on your spans, configure the collector to fork audit-relevant spans to a dedicated pipeline. This keeps your regular observability data separate from the audit trail.

This collector config extracts spans with audit attributes and routes them to dedicated storage:

```yaml
# otel-collector-audit.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Extract only spans that have audit attributes
  filter/audit_spans:
    spans:
      include:
        match_type: regexp
        attributes:
          - key: audit.actor.id
            value: ".+"

  # Add collector-level metadata
  resource/audit:
    attributes:
      - key: audit.collector_version
        value: "1.2.0"
        action: insert
      - key: audit.pipeline
        value: "centralized-api-audit"
        action: insert

  # Group by trace to ensure complete request context
  groupbytrace:
    wait_duration: 10s
    num_traces: 1000

  batch/audit:
    timeout: 5s
    send_batch_size: 500

  batch/general:
    timeout: 10s

exporters:
  # Dedicated audit store
  otlphttp/audit:
    endpoint: https://audit.internal:4318
    compression: gzip
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s

  # Regular observability platform
  otlp/oneuptime:
    endpoint: https://oneuptime.example.com:4317

service:
  pipelines:
    # Audit pipeline
    traces/audit:
      receivers: [otlp]
      processors: [filter/audit_spans, resource/audit, batch/audit]
      exporters: [otlphttp/audit]

    # Standard observability pipeline - gets everything
    traces/observability:
      receivers: [otlp]
      processors: [batch/general]
      exporters: [otlp/oneuptime]
```

## Building the Audit Query API

Once audit spans are in your backend, you need a way to query them. Here is a practical query interface that covers the most common audit questions.

These SQL queries work against a backend that stores spans in a columnar format:

```sql
-- Query 1: All API access by a specific user in the last 24 hours
SELECT
    start_time,
    attributes['audit.operation'] AS operation,
    attributes['audit.resource_type'] AS resource,
    attributes['audit.resource_id'] AS resource_id,
    attributes['audit.outcome'] AS outcome,
    attributes['audit.source_ip'] AS source_ip
FROM audit_spans
WHERE attributes['audit.actor.id'] = 'user-789'
    AND start_time >= NOW() - INTERVAL '24 hours'
ORDER BY start_time DESC;

-- Query 2: All admin actions across the organization
SELECT
    start_time,
    attributes['audit.actor.id'] AS admin_user,
    attributes['audit.operation'] AS operation,
    attributes['audit.resource_type'] AS resource,
    attributes['audit.outcome'] AS outcome
FROM audit_spans
WHERE attributes['audit.is_admin_action'] = 'true'
    AND start_time >= NOW() - INTERVAL '7 days'
ORDER BY start_time DESC;

-- Query 3: Failed access attempts (potential security events)
SELECT
    attributes['audit.actor.id'] AS actor,
    attributes['audit.source_ip'] AS source_ip,
    attributes['audit.operation'] AS attempted_operation,
    COUNT(*) AS failure_count
FROM audit_spans
WHERE attributes['audit.outcome'] = 'access_denied'
    AND start_time >= NOW() - INTERVAL '1 hour'
GROUP BY 1, 2, 3
HAVING COUNT(*) > 5
ORDER BY failure_count DESC;
```

## Correlating Audit Events Across Services

One major advantage of using OpenTelemetry traces for audit logging is built-in correlation. A single API call might trigger downstream calls to multiple services. Because all of those operations share the same trace ID, you can follow the complete chain of actions from the initial API request through every service it touched.

This is enormously valuable during security investigations. Instead of searching through separate log files from each service, you query by trace ID and see the entire request flow with audit context at every hop.

## Practical Considerations

A few things to keep in mind when running this in production:

- **Do not put secrets in span attributes.** API keys, tokens, and passwords should never appear in audit spans. Log the API key identifier, not the key itself.
- **Set appropriate retention.** Most compliance frameworks require 90 days to 1 year of audit log retention. Configure your audit backend accordingly.
- **Alert on anomalies.** Set up alerts for unusual patterns like high volumes of access-denied events from a single IP or admin actions outside business hours.
- **Test the query path.** Audit logs that cannot be queried are useless. Regularly test your ability to answer common audit questions.

The end result is a centralized, structured, queryable audit trail that is correlated across services, and it comes almost for free if you already have OpenTelemetry instrumented in your API layer.
