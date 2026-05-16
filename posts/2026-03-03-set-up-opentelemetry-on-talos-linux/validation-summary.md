# Validation Summary: How to Set Up OpenTelemetry on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- OpenTelemetry Operator
- OpenTelemetry Collector
- OpenTelemetry auto-instrumentation
- OTLP
- Prometheus remote write
- Jaeger
- Elasticsearch
- cert-manager

## Sources Consulted
- OpenTelemetry Operator for Kubernetes: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector resourcedetection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector Prometheus remote write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Elasticsearch exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md

## Issues Found
- The collector snippets used Kubernetes and contrib components without specifying a collector image that includes them. Added `image: otel/opentelemetry-collector-contrib:latest` to the agent and gateway collector specs.
- The agent collector used `k8sattributes` and `kubeletstats` without Kubernetes RBAC. Added a service account, cluster role, and cluster role binding, and wired the collector to that service account.
- The `hostmetrics` receiver was configured inside a container without a host filesystem mount or `root_path`. Added a `/hostfs` hostPath mount and configured `root_path: /hostfs`.
- The `resourcedetection` processor was declared but not included in any pipeline, and it included cloud detectors that can fail collector startup when the cluster is not on those platforms. Limited the detectors to `env` and `system`, then added the processor to traces, metrics, and logs pipelines.
- The gateway used `tail_sampling` with `replicas: 2`, but the tail sampling processor requires all spans for a trace to arrive at the same collector instance unless trace-aware load balancing is added. Changed the gateway to `replicas: 1`.
- The post stated that .NET auto-instrumentation is supported but omitted the .NET image and annotation from the examples. Added `dotnet` instrumentation image configuration and the `instrumentation.opentelemetry.io/inject-dotnet` annotation.

## Review Notes
The YAML snippets parse successfully. The Prometheus remote write and Elasticsearch exporter settings are valid, but real deployments still need matching backend-side configuration, such as enabling or providing a Prometheus-compatible remote write receiver endpoint and provisioning the referenced Jaeger, Prometheus, and Elasticsearch services.
