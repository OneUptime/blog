# Validation Summary: How to Export OpenTelemetry Metrics to Google Cloud Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Google Cloud Telemetry API
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- Google Cloud CLI
- Google Cloud IAM and Application Default Credentials

## Sources Consulted
- Google Cloud Telemetry (OTLP) API overview: https://docs.cloud.google.com/stackdriver/docs/reference/telemetry/overview
- Google Cloud Telemetry API v1.metrics mapping: https://docs.cloud.google.com/stackdriver/docs/reference/telemetry/v1.metrics
- Google Cloud OTLP metrics ingestion formats for Ops Agent: https://docs.cloud.google.com/monitoring/agent/ops-agent/otlp
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python metrics instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Collector extension list for googleclientauth: https://opentelemetry.io/docs/collector/components/extension/
- Google Cloud CLI documentation for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Observability pricing documentation: https://cloud.google.com/stackdriver/pricing
- Google Cloud MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql

## Issues Found
- The post incorrectly used `monitoring.googleapis.com:443` with the OTLP/gRPC metric exporter for direct export. Updated the direct export example to use the OTLP/HTTP exporter and `https://telemetry.googleapis.com/v1/metrics`, which matches Google Cloud's current Telemetry API documentation.
- The direct Python example used a manually refreshed bearer token in static headers. Replaced that with `google.auth.transport.requests.AuthorizedSession` so credentials can refresh for long-running processes.
- The direct Python example did not include the resource identity needed for Google Cloud's Prometheus-style mapping. Added `service.instance.id` and `location` resource attributes.
- The collector example mixed the `googlemanagedprometheus` exporter with a transform that prefixed metric names with `workload.googleapis.com/`. Replaced it with an OTLP/HTTP exporter to `https://telemetry.googleapis.com` using the `googleclientauth` extension.
- The verification and alert examples expected `workload.googleapis.com` metrics, but the Telemetry API path converts metrics into Prometheus-style Cloud Monitoring metrics under `prometheus.googleapis.com`. Updated metric descriptor filters and alert metric types accordingly.
- The metric type mapping listed possible INT64 value types. Google Cloud's Telemetry API Prometheus mapping converts integer points to DOUBLE, so the mapping diagram was updated.
- The alert example said "above 5%" while using a threshold value of 10 after `ALIGN_RATE`. Renamed the condition to describe a threshold rather than a percentage.
- The best-practices section said Cloud Monitoring charges based on the number of time series. For the Prometheus-style OTLP path, pricing is sample-based, so the cost guidance was corrected.
- The conclusion referenced MQL as the query language to use. Google Cloud no longer recommends MQL for Cloud Monitoring, so this was changed to PromQL.

## Review Notes
The post is now aligned with the Google Cloud Telemetry API path. The Telemetry API metric ingestion documentation identifies OTLP metrics as a Pre-GA feature, so future updates should re-check endpoint, mapping, and pricing behavior before publication.
