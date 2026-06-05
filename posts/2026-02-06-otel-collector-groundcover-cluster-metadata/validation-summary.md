# Validation Summary: How to Configure the OpenTelemetry Collector to Export to Groundcover with

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib processors
- OpenTelemetry OTLP gRPC exporter
- Kubernetes metadata enrichment
- Groundcover OpenTelemetry ingestion
- Helm deployment for Kubernetes

## Sources Consulted
- OpenTelemetry Collector Resource Detection Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Kubernetes Attributes Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector exporter helper retry configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector Helm chart values.yaml: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/values.yaml
- Groundcover ingestion keys documentation: https://docs.groundcover.com/use-groundcover/remote-access-and-apis/ingestion-keys
- Groundcover ingestion endpoints documentation: https://docs.groundcover.com/architecture/incloud-managed/ingestion-endpoints

## Issues Found
- The Collector configuration used the deprecated `resourcedetection` processor type. Changed it to the current `resource_detection` type and updated pipeline references.
- The main resource detection example used an invalid generic `aws` detector. Changed the primary example to a GCP-focused detector list (`env`, `gcp`) to match the surrounding GCP-specific configuration.
- The post used older environment variable substitution syntax such as `${CLUSTER_NAME}`. Updated examples to the current Collector syntax, such as `${env:CLUSTER_NAME}`.
- The Groundcover exporter used `otlp/groundcover`, a fixed `ingest.groundcover.com:443` endpoint, and an `x-groundcover-api-key` header. Updated the example to the current OTLP gRPC exporter type `otlp_grpc/groundcover`, a configurable Groundcover OTLP endpoint, and Groundcover's documented `apikey` ingestion header.
- The AWS resource detection explanation implied EKS cluster name detection was automatic. Clarified that the `eks` detector should be used with `k8s.cluster.name` explicitly enabled, and kept `ec2` for EC2 host/cloud metadata.
- The Helm install command omitted adding the OpenTelemetry Helm repository and did not create the namespace. Added `helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts` and `--create-namespace`.

## Review Notes
Validated the primary corrected Collector configuration with `otel/opentelemetry-collector-contrib:latest` version 0.153.0. The AWS `eks` detector schema matches upstream documentation, but full runtime validation requires running inside a Kubernetes/EKS environment because the detector initializes Kubernetes in-cluster configuration.
