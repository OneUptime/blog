# Validation Summary: How to Send Dapr Traces to Google Cloud Trace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Google Cloud Trace
- OpenTelemetry Collector (contrib distribution)
- Google Kubernetes Engine (GKE) with Workload Identity
- gcloud CLI
- Kubernetes (ConfigMap, annotations, service accounts)

## Sources Consulted
- [OpenTelemetry Collector contrib - googlecloud exporter README](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/googlecloudexporter/README.md) - verified exporter config fields; confirmed `trace.client_options.api_endpoint` is not a valid field (`trace.endpoint` is the correct field, and defaults to `cloudtrace.googleapis.com`)
- [OpenTelemetry Collector contrib - resourcedetection processor README](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md) - confirmed `gke` and `gce` are not valid detector names; the consolidated `gcp` detector should be used
- [Dapr annotations and arguments reference](https://docs.dapr.io/reference/arguments-annotations-overview/) - confirmed the correct annotation for sidecar environment variables is `dapr.io/env`, not `dapr.io/sidecar-env-vars`
- [Google Cloud SDK gcloud reference](https://cloud.google.com/sdk/gcloud/reference/alpha/trace/sinks) - confirmed there is no `gcloud trace list` command; the `gcloud trace` command group only contains `sinks` subcommands
- [Cloud Trace API reference](https://cloud.google.com/trace/docs/reference/v1/rest/v1/projects.traces/list) - confirmed traces can be listed via REST API but not via gcloud CLI

## Issues Found

1. **Invalid `resourcedetection` processor detectors**: The post used `detectors: [gke, gce]` which are not valid detector names in the OpenTelemetry Collector contrib. The separate `gce` and `gke` detectors were consolidated into a single `gcp` detector. Changed to `detectors: [gcp]`.

2. **Non-existent `googlecloud` exporter config field**: The post used `trace.client_options.api_endpoint: cloudtrace.googleapis.com` which is not a valid configuration structure. The correct field would be `trace.endpoint`, but since `cloudtrace.googleapis.com` is the default value, the entire `trace` section was removed to simplify the config and avoid confusion.

3. **Invalid `gcloud trace list` CLI command**: The command `gcloud trace list --project=... --start-time=... --limit=...` does not exist. There is no gcloud CLI command to query Cloud Trace spans. The `gcloud trace` command group only supports `sinks` management (alpha). Replaced with a comment pointing to the GCP Console URL for viewing traces.

4. **Incorrect Dapr sidecar annotation name**: The post used `dapr.io/sidecar-env-vars` which is not a valid Dapr Kubernetes annotation. The correct annotation for injecting environment variables into the Dapr sidecar is `dapr.io/env`. Changed to `dapr.io/env`.

## Review Notes
- The collector image version `otel/opentelemetry-collector-contrib:0.96.0` is valid but dated (released early 2024). Users may want to use a more recent version for bug fixes and improvements.
- The Dapr Configuration resource uses `apiVersion: dapr.io/v1alpha1` which is correct and still the current API version for Dapr Configuration CRDs.
- The Workload Identity setup commands and IAM role bindings are correct and follow GCP best practices.
- The `roles/cloudtrace.agent` IAM role is the correct role for writing trace data.
