# Validation Summary: How to Configure Google Client Auth Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib Google Client Auth extension
- OpenTelemetry OTLP HTTP exporter
- Google Cloud Telemetry API
- Google Cloud Application Default Credentials
- Google Kubernetes Engine Workload Identity Federation
- Google Cloud IAM

## Sources Consulted
- OpenTelemetry Collector contrib Google Client Auth Extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/googleclientauthextension
- OpenTelemetry Collector contrib Google Client Auth Extension config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/googleclientauthextension/config.go
- OpenTelemetry Collector contrib Google Cloud Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlecloudexporter
- OpenTelemetry Collector contrib Google Cloud Pub/Sub Exporter README and config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlecloudpubsubexporter
- Google Cloud Telemetry (OTLP) API overview: https://docs.cloud.google.com/stackdriver/docs/reference/telemetry/overview
- Google Cloud deployment guide for the Google-Built OpenTelemetry Collector on GKE: https://docs.cloud.google.com/stackdriver/docs/instrumentation/opentelemetry-collector-gke
- Google Cloud Application Default Credentials documentation: https://docs.cloud.google.com/docs/authentication/provide-credentials-adc
- Google Cloud Workload Identity Federation for GKE documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found
- The extension examples used `project_id`, but the official extension configuration field is `project`. Updated all snippets and troubleshooting text to use `project`.
- The service-account-key example used a nonexistent `credentials_file` extension field. Updated the post to explain that service account keys are supplied to ADC through `GOOGLE_APPLICATION_CREDENTIALS`.
- The examples attached `auth.authenticator: googleclientauth` to `googlecloud` and `googlepubsub` exporters, but the official Google examples use `googleclientauth` with OTLP HTTP/gRPC exporters, and those exporter schemas do not document that auth block. Updated examples to use `otlphttp` with `https://telemetry.googleapis.com`, `encoding: proto`, and the auth extension.
- The post omitted the Cloud Logging writer role while discussing Cloud Logging. Added `roles/logging.logWriter`.
- The authentication-flow diagram showed the extension itself sending telemetry. Updated it to show the Collector/exporter requesting auth metadata and then sending telemetry with the token.
- The multiple-authentication section claimed separate extension instances could directly use different service account keys. Updated it to cover supported per-instance fields such as project, quota project, scopes, or token settings, and clarified that separate service account keys require separate Collector ADC environments.
- Updated GKE terminology from Workload Identity to Workload Identity Federation for GKE.

## Review Notes
The corrected examples target Google Cloud's OTLP Telemetry API through `otlphttp`, matching current Google Cloud guidance. The Google Cloud `googlecloud` exporter remains valid for some Collector deployments, but it authenticates through Google client libraries and ADC rather than through the `googleclientauth` extension pattern shown in this post.
