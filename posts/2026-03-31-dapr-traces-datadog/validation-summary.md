# Validation Summary: How to Send Dapr Traces to Datadog

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Datadog APM (Application Performance Monitoring)
- OpenTelemetry Collector with Datadog exporter
- Datadog Agent with OTLP receiver
- Kubernetes (deployments, ConfigMaps, secrets, Helm)
- Datadog REST API (Spans API, Monitors API)

## Sources Consulted
- Datadog API Reference - Spans endpoints: https://docs.datadoghq.com/api/latest/spans/
- Datadog API Reference - Monitors: https://docs.datadoghq.com/api/latest/monitors/
- Datadog API Authentication: https://docs.datadoghq.com/api/latest/authentication/
- Datadog APM Monitor types: https://docs.datadoghq.com/monitors/types/apm/
- Datadog OTLP Ingestion by the Agent: https://docs.datadoghq.com/opentelemetry/setup/otlp_ingest_in_the_agent/
- Datadog Helm Charts: https://github.com/DataDog/helm-charts
- OpenTelemetry Collector Contrib - Datadog Exporter: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/datadogexporter/README.md
- OpenTelemetry Collector Contrib - Resource Processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- Dapr Configuration reference: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Kubernetes annotations: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

### 1. Fictitious Trace API Endpoint
- **What was wrong:** The post included a `curl` command using `GET /api/v1/trace/your-trace-id` to retrieve a trace. This endpoint does not exist in the Datadog API.
- **What was changed:** Replaced with the correct `POST /api/v2/spans/events/search` endpoint, including a proper JSON request body with filter, time range, and query parameters. Updated the label from "Query the trace API" to "Search for traces via the Spans API."
- **Why:** Datadog does not expose a simple GET-by-trace-ID endpoint. Trace data is retrieved via the v2 Spans search API.

### 2. Incorrect Monitor Type
- **What was wrong:** The monitor creation payload used `"type": "trace analytics alert"` (with a space). The `trace analytics alert` type (even with the correct hyphen: `trace-analytics alert`) requires a different query syntax using the `trace-analytics()` function, not APM metric syntax.
- **What was changed:** Changed the monitor type to `"query alert"`, which is the correct type for APM metric-based queries like `avg:trace.http.request.duration{...}`.
- **Why:** The `query alert` type is the correct monitor type when using Datadog APM metrics (the `trace.*` metric namespace). The `trace-analytics alert` type is for indexed span queries with a different query syntax.

### 3. Monitor Message Contradicted Query
- **What was wrong:** The monitor message said "Order service p99 latency exceeded 1s" but the query computed `avg` (average), not p99.
- **What was changed:** Updated the message to "Order service average latency exceeded 1s".
- **Why:** The message should accurately describe what the monitor is detecting to avoid confusion during incident response.

## Review Notes
- The `datadog.apm.portEnabled=true` Helm value in Approach 2 enables the traditional APM TCP port (8126), which is not strictly required for OTLP ingestion. It is harmless to include (and useful if services also use native Datadog tracing libraries), but readers should know that OTLP ingestion works independently via the `datadog.otlp.receiver` settings.
- The `traces.span_name_as_resource_name` setting in the Datadog exporter is valid and not deprecated as of current versions, but readers should check the latest exporter documentation for any changes.
- The resource processor `from_attribute: k8s.pod.labels.version` example assumes the `k8sattributes` processor has already populated that attribute upstream in the pipeline. This dependency is not mentioned in the post but would be needed for the example to work in practice.
- The Spans API endpoints used for trace retrieval are rate-limited to 300 requests per hour.
