# Validation Summary: How to Deploy OpenTelemetry Operator for Kubernetes Auto-Instrumentation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Operator
- OpenTelemetry Collector
- OpenTelemetry auto-instrumentation
- Kubernetes
- Helm
- cert-manager
- kubectl
- Java auto-instrumentation
- Node.js auto-instrumentation
- Python auto-instrumentation
- .NET auto-instrumentation
- Go auto-instrumentation

## Sources Consulted
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator upstream README: https://github.com/open-telemetry/opentelemetry-operator
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Java agent HTTP instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/http/
- OpenTelemetry .NET automatic instrumentation configuration: https://opentelemetry.io/docs/zero-code/dotnet/configuration/
- OpenTelemetry SDK OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/

## Issues Found
- The `OpenTelemetryCollector` examples used `apiVersion: opentelemetry.io/v1alpha1` with block-string `spec.config`. Current OpenTelemetry Operator examples use `opentelemetry.io/v1beta1` with structured `spec.config`. Updated the Deployment, DaemonSet, and Sidecar Collector manifests accordingly.
- The cert-manager install command used the older Jetstack repository and `installCRDs=true` value. Current cert-manager Helm documentation recommends the OCI chart and `crds.enabled=true`; updated the install command accordingly.
- The advanced Helm values pinned the collector image tag to `0.92.0`, which is outdated for a 2026 guide. Removed the stale pin so the chart can use the compatible default tag.
- The Collector internal telemetry example used the deprecated `service.telemetry.metrics.address` field. Replaced it with the current `service.telemetry.metrics.readers` Prometheus pull reader syntax.
- The auto-instrumentation endpoint used port `4317` globally. Current Operator docs state Java, Python, .NET, and Go auto-instrumentation use OTLP HTTP/protobuf defaults, so the shared endpoint should target `4318`. Updated the Instrumentation examples and related verification text to use `4318`; added a Node.js override to keep Node.js on OTLP/gRPC port `4317`.
- The sidecar pod example referenced a Sidecar Collector in another namespace by name only. Updated `sidecar.opentelemetry.io/inject` to `observability/otel-sidecar`.
- The sidecar application endpoint used `localhost:4317` without specifying protocol. Updated it to `localhost:4318` and set `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`.
- The Java HTTP header capture environment variables used outdated names. Updated them to `OTEL_INSTRUMENTATION_HTTP_CLIENT_CAPTURE_REQUEST_HEADERS` and `OTEL_INSTRUMENTATION_HTTP_CLIENT_CAPTURE_RESPONSE_HEADERS`.
- The Node.js instrumentation example used `OTEL_NODEJS_ENABLED_INSTRUMENTATIONS`, which is not the documented variable. Updated it to `OTEL_NODE_ENABLED_INSTRUMENTATIONS`.
- The .NET instrumentation example used signal enablement variables without the `INSTRUMENTATION` segment. Updated them to `OTEL_DOTNET_AUTO_TRACES_INSTRUMENTATION_ENABLED`, `OTEL_DOTNET_AUTO_METRICS_INSTRUMENTATION_ENABLED`, and `OTEL_DOTNET_AUTO_LOGS_INSTRUMENTATION_ENABLED`.
- The resource attribute examples used `deployment.environment`. Updated them to the current semantic convention attribute `deployment.environment.name`.
- The Go instrumentation comment mentioned eBPF but not the Operator feature gate requirement. Added that requirement to the comment.

## Review Notes
- All Markdown YAML code fences in the post were parsed successfully with PyYAML after edits.
- `helm` and `kubectl` are not installed in the local review environment, so CLI help output and Helm chart rendering could not be verified locally. The commands and chart values were checked against official OpenTelemetry and cert-manager documentation instead.
