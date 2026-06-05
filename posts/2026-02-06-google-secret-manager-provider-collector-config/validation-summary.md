# Validation Summary: How to Use Google Secret Manager Provider for Sensitive Collector Config

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib config providers
- Google Secret Manager
- Google Cloud IAM
- Google Kubernetes Engine Workload Identity Federation
- Compute Engine service accounts
- Prometheus Remote Write exporter

## Sources Consulted
- Google Cloud Observability: Manage secrets in Google-Built OpenTelemetry Collector configuration: https://cloud.google.com/stackdriver/docs/instrumentation/opentelemetry-collector-use-secretmgr
- OpenTelemetry Collector Contrib Google Secret Manager provider README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/confmap/provider/googlesecretmanagerprovider
- OpenTelemetry Collector Registry entry for the Google Secret Manager provider: https://opentelemetry.io/ecosystem/registry/?language=collector
- Google Cloud SDK reference for `gcloud secrets create`: https://cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud Secret Manager IAM roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/secretmanager
- Google Kubernetes Engine Workload Identity Federation guide: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- OpenTelemetry Collector Contrib Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusremotewriteexporter
- OpenTelemetry Collector Contrib Bearer Token Authenticator extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/bearertokenauthextension

## Issues Found
- The main Collector configuration referenced the `batch` processor in the service pipelines but did not define a `processors` section. Added `processors: batch:` so the configuration is complete.
- The Prometheus Remote Write exporter example used `prometheusremotewrite`, which is now documented as a deprecated alias. Updated the exporter key and pipeline reference to `prometheus_remote_write`.
- The Prometheus Basic auth example stored only a password but used it as the value after the `Basic` auth scheme. Updated the secret example to store a base64-encoded `username:password` credential and renamed the referenced secret accordingly.
- The GKE setup commands enabled Workload Identity Federation at the cluster level but did not enable the GKE metadata server on an existing Standard node pool, and they created a service account in a namespace that might not exist. Added the node-pool update command and namespace creation command.
- The pinned-version example comment described the endpoint secret as an API key. Updated the comment to refer to the endpoint.

## Review Notes
The Google Secret Manager provider is documented as alpha in OpenTelemetry Collector Contrib and is included in the Contrib distribution. The Google-built Collector documentation separately notes support starting in version 0.126.0. The article's use of `latest` Collector images is operationally convenient but production deployments should generally pin image versions.
