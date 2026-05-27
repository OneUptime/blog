# Validation Summary: How to Set Up OpenTelemetry Collector as a Gateway for Multi-Service Telemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Google Cloud Monitoring
- Google Cloud Trace
- Google Cloud Logging
- Google Cloud Managed Service for Prometheus
- Google Kubernetes Engine (GKE)
- GKE Workload Identity Federation
- Kubernetes Deployments, Services, ConfigMaps, and ServiceAccounts
- Cloud Run VPC egress

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Google Cloud exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlecloudexporter
- OpenTelemetry Collector Google Managed Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlemanagedprometheusexporter
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/processor/batchprocessor
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/processor/memorylimiterprocessor
- OpenTelemetry Collector resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
- OpenTelemetry Collector troubleshooting and zPages documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry OTLP exporter environment variable documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE internal LoadBalancer documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balancing
- Cloud Run Direct VPC egress documentation: https://cloud.google.com/run/docs/configuring/vpc-direct-vpc

## Issues Found
- The collector configuration used the deprecated `resourcedetection` component type. Changed it to the current `resource_detection` component name and updated all pipeline references.
- The zPages extension was described as Prometheus metrics. Changed the wording to describe zPages as debugging pages and clarified that collector internal telemetry should be monitored separately.
- The Kubernetes Deployment referenced a ConfigMap named `otel-collector-config`, but the post never created it. Added the `kubectl create namespace` and `kubectl create configmap` commands needed before applying the Deployment.
- The container image was pinned to the old `otel/opentelemetry-collector-contrib:0.96.0` release. Updated it to `0.153.0`, the current Collector Contrib release available at review time.
- The post port-forwarded `svc/otel-collector-gateway` on port `55679`, but the ClusterIP Service did not expose that port. Added the zPages container port and Service port.
- The Cloud Run and Internal Load Balancer guidance omitted the VPC reachability requirement. Added a note that Cloud Run needs VPC egress to the same or a connected VPC.
- The scaling guidance said to shard by service name using the routing connector. The routing connector routes telemetry to pipelines based on resource attributes; changed the wording to "routing by service name" for accuracy.

## Review Notes
The configuration is syntactically valid YAML. The Kubernetes manifests parse as valid YAML documents. Production deployments should also consider TLS or authentication for any collector endpoint exposed beyond trusted networks, explicit exporter queue sizing for outage buffering, and collector self-metrics collection through the Collector telemetry configuration.
