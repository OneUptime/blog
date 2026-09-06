# How to Troubleshoot Missing Telemetry in OneUptime from Collector to Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, OpenTelemetry, Troubleshooting, ClickHouse, Dashboard

Description: Trace missing OneUptime logs, metrics, and spans across SDK export, Collector pipelines, token validation, ingestion, storage, and queries.

---

Missing telemetry is a pipeline failure until proven otherwise. The application can create a span that never enters a Collector pipeline, the Collector can report a successful export for an invalid OneUptime key, or the data can be stored but hidden by a dashboard filter.

Troubleshoot in order and preserve one identifiable test record across every boundary.

## Name the failing signal and test record

Do not start with `telemetry is missing`. Record:

- signal: logs, metrics, or traces
- `service.name` and project
- UTC emission timestamp
- trace ID, metric name, or a unique non-sensitive log marker
- application instance and Collector endpoint

Use a marker such as `telemetry-check-20260906T120000Z`, not a customer identifier or secret. Search a narrow but generous time range around it.

## Confirm the SDK exports

Check the application's OpenTelemetry configuration and startup output. Verify endpoint, protocol, headers, service name, sampling, and whether the SDK appends a signal path. A client configured for OTLP/gRPC cannot talk to an OTLP/HTTP receiver merely because both use port numbers associated with OpenTelemetry.

If the application sends to a local Collector, the common endpoints are:

```text
OTLP/gRPC: http://collector:4317
OTLP/HTTP: http://collector:4318
```

Confirm DNS and network reachability from the application container or Pod. Look for queue overflow, exporter timeout, certificate, and connection-refused messages. Force-flush or shut down the SDK gracefully in a short-lived test process so buffered data is not lost at exit.

## Follow the Collector pipeline

An enabled receiver is not enough. The signal must appear in a `service.pipelines` entry with that receiver, appropriate processors, and the OneUptime exporter:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/oneuptime]
```

Repeat for metrics and logs. Collector startup logs should name every configured component and reject invalid configuration. Inspect its internal metrics for accepted, refused, sent, failed, queued, and dropped items.

Temporarily add the Collector's supported debug exporter to one affected pipeline in a non-production or tightly controlled environment. If the marker appears there, the receiver and upstream SDK work. Debug output can contain request data and attributes, so bound the test and remove it immediately.

## Verify the OneUptime exporter

The exporter should use the base self-hosted endpoint and ingestion header:

```yaml
exporters:
  otlphttp/oneuptime:
    endpoint: https://oneuptime.example.com/otlp
    headers:
      x-oneuptime-token: ${env:ONEUPTIME_TOKEN}
```

Do not add `/v1/traces` to a base endpoint when the exporter already appends the per-signal path. Confirm proxy, DNS, public certificate chain, reverse-proxy body-size limits, and timeouts from the Collector's network namespace.

Validate the token directly:

```bash
curl -i \
  -H "x-oneuptime-token: $ONEUPTIME_TOKEN" \
  https://oneuptime.example.com/otlp/v1/validate
```

OneUptime returns 200 for a valid key and 401 for an unknown or revoked key on this validation endpoint. This step is decisive because its OTLP ingest endpoints intentionally return a silent 200 for a bad key to prevent retry storms. A clean Collector export log therefore does not prove acceptance.

Make sure the key belongs to the project you are searching and has not been rotated. Do not print it while comparing values.

## Check OneUptime ingestion and ClickHouse

Inspect self-hosted ingress, telemetry service, and ClickHouse health around the emission timestamp. Look for body-size rejection, decompression or decoding errors, queue saturation, schema problems, disk exhaustion, and failed ClickHouse inserts.

In Docker Compose:

```bash
docker compose --env-file config.env ps
docker compose --env-file config.env logs --since=20m ingress app clickhouse
```

Use the actual service names shown by `docker compose config --services`; deployments can differ. In Kubernetes, inspect the matching Pods, events, restarts, PVC fullness, and service endpoints.

Do not delete ClickHouse data or volumes to clear an ingestion error. Capture diagnostics and correct the specific storage, schema, or capacity problem.

## Prove whether the data is hidden by the query

In OneUptime, select the correct project and signal explorer. Clear saved filters, use UTC-aware custom time bounds, and search the unique marker. Then check:

- `service.name` spelling and case
- environment, region, host, and Kubernetes attributes
- dashboard variables and defaults
- sampling or Collector filter processors
- project-specific signal retention
- application clock skew

A dashboard widget can be empty while the explorer contains data because its variable value, aggregation, time window, or attribute filter excludes the record. Rebuild one minimal widget from the successful explorer query before repairing a complex dashboard.

## Isolate the first broken boundary

The diagnosis is complete when one handoff has evidence on one side and none on the other:

```text
application -> Collector receiver -> processors -> exporter
            -> OneUptime ingress -> ClickHouse -> explorer -> dashboard
```

Change one boundary at a time, emit a new uniquely timestamped marker, and record the result. This avoids declaring victory because delayed old data appeared after an unrelated change.

## Conclusion

Trace missing OneUptime telemetry with one signal and one marker. Validate the SDK and Collector pipeline, use `/otlp/v1/validate` rather than trusting an ingest 200, inspect ClickHouse safely, and only then repair explorer or dashboard filters.

## Official Documentation

- [OneUptime OpenTelemetry integration](https://oneuptime.com/docs/en/telemetry/open-telemetry)
- [OneUptime Kubernetes agent troubleshooting](https://oneuptime.com/docs/en/telemetry/kubernetes-agent)
- [OneUptime dashboards and filters](https://oneuptime.com/docs/en/dashboards/variables)
- [OpenTelemetry Collector troubleshooting](https://opentelemetry.io/docs/collector/troubleshooting/)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
