# Validation Summary: How to Export OpenTelemetry Traces to Google Cloud Trace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Google Cloud Trace
- Google Cloud IAM and Application Default Credentials
- GKE Workload Identity Federation
- Python OpenTelemetry SDK and Google Cloud Trace exporter
- Node.js OpenTelemetry SDK and Google Cloud Trace exporter
- Go OpenTelemetry SDK and Google Cloud Trace exporter

## Sources Consulted
- Google Cloud Trace setup documentation: https://cloud.google.com/trace/docs/setup/
- Google Cloud Trace quotas and limits: https://cloud.google.com/trace/docs/quotas
- Google Cloud Observability pricing: https://cloud.google.com/stackdriver/pricing
- Google Cloud Telemetry (OTLP) API reference: https://cloud.google.com/stackdriver/docs/reference/telemetry/api
- Google Cloud IAM roles for Cloud Trace: https://cloud.google.com/iam/docs/roles-permissions/cloudtrace
- GKE Workload Identity Federation guide: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- OpenTelemetry Collector Contrib googlecloud exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlecloudexporter
- OpenTelemetry Collector Contrib resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OpenTelemetry Collector Contrib tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- Google Cloud OpenTelemetry Python exporter documentation: https://google-cloud-opentelemetry.readthedocs.io/en/latest/_autosummary/opentelemetry.exporter.cloud_trace.html
- Google Cloud OpenTelemetry JavaScript exporter documentation: https://github.com/GoogleCloudPlatform/opentelemetry-operations-js/tree/main/packages/opentelemetry-cloud-trace-exporter
- OpenTelemetry JavaScript NodeSDK documentation: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-sdk-node
- Google Cloud OpenTelemetry Go trace exporter documentation: https://pkg.go.dev/github.com/GoogleCloudPlatform/opentelemetry-operations-go/exporter/trace

## Issues Found
- The post said Cloud Trace "speaks its own protocol," which is incomplete now that Google Cloud documents native OTLP ingestion through the Telemetry API. Updated the wording to distinguish the current OTLP option from the Cloud Trace API exporter path shown in the guide.
- The Collector configuration used `resourcedetection`, which is now a deprecated alias. Updated it to the canonical `resource_detection` processor name and pipeline reference.
- The Python example called an undefined `fetch_users()` helper. Added a minimal placeholder so the snippet is runnable as shown.
- The Go example called an undefined `processRequest(ctx)` helper. Added a minimal placeholder function so the snippet is syntactically complete.
- The Python authentication comment referred to "gcloud auth" generally. Updated it to "Application Default Credentials," which is the mechanism used by Google client libraries.
- The Cloud Trace attribute mapping diagram incorrectly mapped `db.system` to `g.co/agent`. Updated it to show `db.system` passing through under its own key; `g.co/agent` is exporter metadata, not a database semantic convention mapping.

## Review Notes
The Collector `googlecloud` exporter, direct Python, Node.js, and Go exporter packages remain valid. The post still uses older HTTP semantic convention keys such as `http.method`; these are still handled by the Google Cloud exporter defaults, but future updates could mention newer semantic convention names when instrumentation libraries fully migrate.
