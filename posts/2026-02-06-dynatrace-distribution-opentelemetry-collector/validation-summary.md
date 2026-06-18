# Validation Summary: How to Use Dynatrace Distribution of OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Dynatrace OTel Collector
- OpenTelemetry Collector
- OTLP HTTP ingest
- Dynatrace SaaS and ActiveGate OTLP endpoints
- Docker
- Linux binaries
- Kubernetes DaemonSets
- Helm
- OpenTelemetry Collector processors, receivers, and exporters
- OneUptime OTLP export

## Sources Consulted
- Dynatrace Docs: OTel Collector for ingesting telemetry into Dynatrace - https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector
- Dynatrace Docs: Deploy the Dynatrace OTel Collector - https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/deployment
- Dynatrace Docs: Configure the OTel Collector - https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/configuration
- Dynatrace Docs: Dynatrace OTLP API endpoints - https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api
- Dynatrace Docs: About OTLP metrics ingest - https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api/ingest-otlp-metrics/about-metrics-ingest
- Dynatrace Docs: Enable Dynatrace telemetry ingest endpoints - https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/extend-observability-k8s/telemetry-ingest
- Dynatrace Docs: Monitor hosts that send OpenTelemetry data to Dynatrace - https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/use-cases/host-monitoring
- Dynatrace GitHub repository and release assets - https://github.com/Dynatrace/dynatrace-otel-collector
- OneUptime Docs: Host OpenTelemetry Collector - https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The post described the distribution as having Dynatrace-specific exporter configuration and pre-built defaults. Updated this to reflect Dynatrace's documented positioning: a curated collector build with verified components and sample configurations.
- The post implied direct Dynatrace OTLP support generally, without noting the API requires OTLP over HTTP. Clarified that the Dynatrace API endpoint is OTLP HTTP and that a Collector can convert OTLP gRPC input to OTLP HTTP output.
- Docker examples used the floating `latest` image tag. Replaced it with the current documented `0.49.0` image tag.
- The Linux download URL used a release asset name that does not exist. Replaced it with the current release asset naming pattern, for example `dynatrace-otel-collector_0.49.0_Linux_x86_64.tar.gz`.
- The Helm section referenced a non-existent Dynatrace Helm chart repository path. Replaced it with Dynatrace's documented approach of using the OpenTelemetry Helm chart with the Dynatrace collector image and command.
- Collector snippets used upstream component IDs such as `otlphttp`, `hostmetrics`, `kubeletstats`, `k8sattributes`, and `resourcedetection`. Updated them to the Dynatrace distribution's component IDs: `otlp_http`, `host_metrics`, `kubelet_stats`, `k8s_attributes`, and `resource_detection`.
- Environment-variable interpolation was inconsistent. Updated Dynatrace collector examples to use `${env:VAR_NAME}` syntax.
- The resource processor comments overstated which attributes are required for entity creation. Adjusted the wording to focus on useful correlation attributes and service correlation.
- The Kubernetes section claimed to be a full DaemonSet configuration while omitting related resources such as Secret and RBAC. Changed the wording to describe it as an example DaemonSet configuration.
- Smartscape/process mapping used `process.pid + service.name` for process group mapping. Updated it to use `process.executable.name`, matching Dynatrace host monitoring guidance for OpenTelemetry process entity correlation.
- The dual-export example used `https://otlp.oneuptime.com`. Updated it to OneUptime's documented OTLP HTTP endpoint, `https://oneuptime.com/otlp`, and made the snippet self-contained enough to validate.
- Updated the comparison table and closing section to avoid unsupported claims that ActiveGate support and delta conversion are pre-configured defaults.

## Review Notes
Validated the complete Basic Configuration, Host Monitoring, Dual Export, and embedded Kubernetes collector configuration with `ghcr.io/dynatrace/dynatrace-otel-collector/dynatrace-otel-collector:0.49.0 validate`. The Kubernetes collector config requires Kubernetes service-account files for local validation because it uses `auth_type: serviceAccount`.
