# Validation Summary: How to Export Traces from Istio to Cloud Providers

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio tracing and Telemetry API
- OpenTelemetry Collector
- OTLP/gRPC
- AWS X-Ray
- Amazon EKS IAM Roles for Service Accounts
- Google Cloud Trace
- GKE Workload Identity Federation / IAM service account impersonation
- Azure Monitor Application Insights
- Kubernetes ConfigMaps, Deployments, Services, ServiceAccounts, and Secrets

## Sources Consulted
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- OpenTelemetry Collector AWS X-Ray exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsxrayexporter
- OpenTelemetry Collector Google Cloud exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlecloudexporter
- OpenTelemetry Collector Azure Monitor exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/azuremonitorexporter
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- AWS EKS IAM Roles for Service Accounts documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- AWS X-Ray API documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-api.html
- Google Cloud OpenTelemetry Collector on GKE documentation: https://docs.cloud.google.com/stackdriver/docs/instrumentation/opentelemetry-collector-gke
- Google Cloud Trace REST API projects.traces.list documentation: https://cloud.google.com/trace/docs/reference/v1/rest/v1/projects.traces/list
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found
- The Istio configuration referenced `otel-collector.observability.svc.cluster.local`, and the verification step referenced `svc/otel-collector`, but the post did not define a Kubernetes Service for the collector. Added a minimal `Service` manifest exposing OTLP/gRPC on port 4317.
- The Google Cloud verification command used `gcloud traces list`, which is not a current documented GA gcloud command group. Replaced it with a Cloud Trace REST API request using `gcloud auth print-access-token`, `pageSize`, `startTime`, and `endTime`.
- The collector self-metrics verification used `kubectl port-forward svc/otel-collector ... 8888:8888`, but the added Service intentionally exposes only OTLP/gRPC. Changed the command to port-forward the Deployment so it can reach the collector's own metrics endpoint.
- The summary advised using managed identity for Azure while the Azure example uses an Application Insights connection string stored in a Kubernetes Secret. Updated the wording to recommend cloud-native authentication where supported and Kubernetes Secrets for required connection strings.

## Review Notes
The examples use `otel/opentelemetry-collector-contrib:0.96.0`, which is older than the current Collector releases but still consistent with the exporter names and fields shown. Future maintenance should consider testing and updating the examples against a newer pinned Collector version before publication.
