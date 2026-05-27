# Validation Summary: How to Monitor Service Mesh Metrics and Traces in Google Cloud Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Service Mesh
- Google Kubernetes Engine
- Istio / Envoy sidecar telemetry
- Cloud Monitoring dashboards and alerting policies
- Cloud Trace
- Cloud Logging
- Istio Telemetry API
- gcloud CLI

## Sources Consulted
- Google Cloud Service Mesh observability overview: https://docs.cloud.google.com/service-mesh/docs/observability-overview
- Google Cloud Monitoring Istio metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_istio
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Service Mesh Cloud Trace guide: https://docs.cloud.google.com/service-mesh/docs/observability/accessing-traces
- Google Cloud Trace filter syntax: https://docs.cloud.google.com/trace/docs/trace-filters
- Google Cloud Service Mesh request proxy logs guide: https://docs.cloud.google.com/service-mesh/v1.22/docs/observability/access-logs
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/

## Issues Found
- The post said Cloud Service Mesh automatically sends traces to Cloud Trace and implied every request generates trace data without caveats. Updated the wording to state that Cloud Trace is disabled by default, tracing must be enabled, sampling applies, and applications must propagate trace headers for spans to correlate into end-to-end traces.
- The dashboard navigation referenced Anthos Service Mesh. Updated it to Cloud Service Mesh, matching the current Google Cloud console naming.
- The custom dashboard 5xx metric filter used `metric.label.response_code` and a string-style comparison. Updated it to `metric.labels.response_code >= 500`.
- The alerting command used deprecated/incorrect `gcloud alpha monitoring policies create` flags such as `--condition-threshold-value`, `--condition-threshold-duration`, and `--condition-threshold-comparison`. Replaced it with the current `gcloud monitoring policies create` syntax using `--condition-filter`, `--aggregation`, `--duration`, and `--if`.
- The alert example described a percentage error rate but only selected 5xx request counts. Updated the example to alert on 5xx request rate so the command matches the metric being queried.
- The Cloud Trace search example used non-matching filter syntax. Replaced it with the documented trace filter form `span:/api/checkout latency:1s`.
- The trace sampling configuration used an Istio ConfigMap example and an unsupported `gcloud container fleet mesh update --config` command. Replaced it with a current Istio Telemetry API example using `randomSamplingPercentage`.
- The logging section mixed Cloud Service Mesh traffic logs with Envoy container logs and queried fields as `jsonPayload.*`. Updated the text and Log Explorer filters to use Cloud Service Mesh traffic logs, `httpRequest.status`, `httpRequest.latency`, and `labels.source_name`.
- The access logging Telemetry snippets used the older `telemetry.istio.io/v1alpha1` API version. Updated them to `telemetry.istio.io/v1`.

## Review Notes
The post is now technically accurate for Cloud Service Mesh with Istio APIs. Some operational details remain intentionally high level, such as exact sampling percentages and alert thresholds, because production values depend on workload traffic and cost tolerance.
