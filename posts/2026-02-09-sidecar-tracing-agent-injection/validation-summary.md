# Validation Summary: How to Use Sidecar Containers for Distributed Tracing Agent Injection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments, Pods, sidecar containers, init containers, ConfigMaps, probes, and mutating admission webhooks
- OpenTelemetry Collector and OpenTelemetry Collector Contrib
- OpenTelemetry Java agent auto-instrumentation
- OTLP over HTTP and gRPC
- Jaeger receiver compatibility
- Prometheus scraping for OpenTelemetry Collector internal metrics

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector health check extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector Contrib latest release page: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.153.0
- OpenTelemetry Java instrumentation latest release page: https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/tag/v2.27.0
- Kubernetes sidecar containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/

## Issues Found
- The post said a tracing sidecar can intercept traffic on localhost. An OpenTelemetry Collector sidecar receives telemetry sent to localhost; it does not transparently intercept application traffic. Updated the wording accordingly.
- The first Collector config used the deprecated `logging` exporter and `loglevel` setting. Replaced it with the current `debug` exporter and `verbosity` setting.
- The OTLP exporter examples pointed to an in-cluster `host:4317` endpoint but configured TLS as secure or omitted TLS settings. Added `tls.insecure: true` for the plaintext in-cluster examples.
- The application examples sent telemetry to port 4318 but did not explicitly set OTLP/HTTP. Added `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`.
- The examples used outdated image and agent versions: Collector Contrib `0.91.0`, Java agent `v1.32.0`, and `alpine:3.18`. Updated them to Collector Contrib `0.153.0`, Java agent `v2.27.0`, and `alpine:3.22`.
- The mutating webhook example matched Pod `UPDATE` requests. Sidecar injection should happen at Pod creation because adding regular containers to existing Pods is not a valid update. Changed the webhook operation to `CREATE`.
- The ConfigMap section implied configuration could be updated without redeploying applications and claimed Collector config reload through file watching. Clarified that ConfigMaps avoid rebuilding images, but running sidecars need a restart, reloader, or supervisor to apply changed mounted config.
- The health check snippet configured Kubernetes probes against port 13133 without enabling the Collector `health_check` extension. Added the required extension and service configuration.
- The metrics note did not distinguish the default localhost metrics endpoint from a pod-network scrape endpoint. Added `service.telemetry.metrics.readers` configuration for Prometheus scraping over the pod network and clarified the default behavior.

## Review Notes
- All fenced YAML blocks parse successfully with PyYAML.
- The two complete OpenTelemetry Collector ConfigMap snippets validate successfully with `otel/opentelemetry-collector-contrib:0.153.0 validate`.
- `kubectl` was not installed in the workspace, so Kubernetes manifests were reviewed against official Kubernetes documentation rather than with `kubectl --dry-run`.
