# How to Build an OpenSearch Dashboard That Links a Metric Spike to Its Logs and Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Metric, Logging, Trace, Monitoring

Description: Build a service-focused OpenSearch investigation view that pivots from a Prometheus metric spike to matching traces and logs using shared resource and trace context.

---

A useful incident dashboard does more than place three unrelated charts on one page. It preserves the same service, environment, and time context while an operator moves from a metric symptom to the requests and log records that explain it.

The current OpenSearch APM workflow, introduced in 3.6, uses Prometheus for metrics and OpenSearch indexes for traces, logs, and service-map data. Trace-to-log correlation is explicit: the datasets are linked and the log dataset maps its trace-context fields.

## Establish a shared correlation contract

Before building panels, inspect representative records and standardize these dimensions:

```text
service.name
deployment.environment.name
k8s.namespace.name       # when applicable
trace ID
span ID
event timestamp
```

Metrics should carry the stable service, environment, and namespace dimensions as labels or as resource attributes that the Prometheus ingestion path promotes to labels. Spans carry those stable dimensions as OpenTelemetry resource attributes and their IDs as trace context. Logs must include the active trace ID for an exact trace-to-log pivot; include the span ID as well for span-level correlation. Time and service alone produce only a broad approximation.

Avoid high-cardinality values such as trace IDs as metric labels. Keep them on spans and log records, and use stable service/environment labels to move from the metric series to a bounded trace search.

## Ingest the three signals correctly

Use an OpenTelemetry Collector as the application-facing OTLP endpoint. In the OpenSearch 3.6 APM architecture:

- traces and logs flow through Data Prepper into OpenSearch;
- application metrics flow from the Collector over OTLP/HTTP into Prometheus;
- Data Prepper processes raw spans for OpenSearch and uses `otel_apm_service_map` to generate service-map topology and APM RED metrics; it writes the topology to OpenSearch and remote-writes the RED metrics to Prometheus.

Confirm the expected OpenSearch data before configuring the UI:

```http
GET _cat/indices/otel-v1-apm-span-*,otel-v2-apm-service-map,logs-otel-v1-*?v

GET otel-v1-apm-span-*/_search
{
  "size": 1,
  "sort": [{"startTime": "desc"}]
}
```

Also query the Prometheus endpoint for a known service series. A dashboard cannot repair a missing telemetry branch.

## Configure APM data objects

In an Observability workspace:

1. Create a **Traces** dataset for `otel-v1-apm-span-*`.
2. Create a **Logs** dataset for `logs-otel-v1-*`.
3. On the logs dataset, map trace ID, span ID, service name, and timestamp to the actual log fields.
4. Configure a correlation from the trace dataset to the logs dataset.
5. Create an index pattern for `otel-v2-apm-service-map*`.
6. Add the Prometheus data source to the workspace.
7. In APM settings, select the trace dataset, service-map index pattern, and Prometheus data source.

OpenSearch 3.5 introduced datasets and dataset-based trace-to-log correlations. The integrated APM service workflow described in this section is 3.6+. On an older version, build the same investigation path with Trace Analytics and explicit dashboard links, using that version's documentation.

## Build the landing dashboard

Use panels that answer progressively narrower questions:

- Request rate, error ratio, and duration from Prometheus, grouped by the service label (`service` for Data Prepper-generated APM RED metrics).
- Error log count over time, grouped by service and severity.
- Slow or failed operations from trace data.
- A service map for dependency context.

Keep the dashboard time range global. On OpenSearch 3.6, filter each panel's query using that signal's actual service field or label; on 3.7+, a dashboard variable can carry one stable service value across PPL and PromQL panels. A useful log visualization can start with PPL similar to:

```text
source = logs-otel-v1-*
| where `resource.attributes.service.name` = 'checkout'
| where `severityText` = 'ERROR'
| stats count() by span(@timestamp, 1m)
```

Adjust field names to your indexed schema. The source expression, timestamp, and severity fields must exist in the selected dataset.

## Pivot from the spike

When a metric spike identifies `checkout` during a five-minute interval:

1. In **APM > Services**, select `checkout`, apply the same environment filter, and set the same five-minute interval.
2. Select the affected metric or operation to open its related trace spans.
3. Choose a failed or slow trace and inspect its span hierarchy.
4. Open related logs from the trace or span details.

OpenSearch retrieves related logs by matching the trace ID against the correlated logs dataset. If the log link returns zero records, copy one trace ID and search the logs dataset directly. That distinguishes a UI correlation configuration problem from absent IDs in the documents.

```http
GET logs-otel-v1-*/_search
{
  "query": {
    "term": {
      "traceId": "0123456789abcdef0123456789abcdef"
    }
  }
}
```

Use the exact mapped field. The default Data Prepper log template maps `traceId` directly as a `keyword`; a `.keyword` suffix is appropriate only if the mapping actually defines one.

## Validate the operator experience

Run a controlled test request that emits a known error. Record its trace ID, then verify:

- the request changes the metric panel in the expected bucket;
- the trace appears under the same service and time window;
- the log contains the identical trace ID;
- the APM trace details show the related log;
- users with the on-call role can access every underlying data source and saved object.

This test is more valuable than a screenshot: it validates ingestion, schema, permissions, time alignment, and the actual pivot used during an incident.

## Official References

- [OpenSearch APM telemetry ingestion](https://docs.opensearch.org/latest/observing-your-data/apm/configuring-telemetry-ingestion/)
- [Configuring APM in OpenSearch Dashboards](https://docs.opensearch.org/latest/observing-your-data/apm/configuring-apm/)
- [OpenSearch APM services](https://docs.opensearch.org/latest/observing-your-data/apm/services/)
- [OpenSearch correlations](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/correlations/)
- [OpenSearch application analytics](https://docs.opensearch.org/latest/observing-your-data/app-analytics/)
