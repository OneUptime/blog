# Validation Summary: How to Deploy the OpenTelemetry Collector on Kubernetes

## Status
validated

## Post Type
Tutorial / Kubernetes deployment guide

## Technologies Covered
- Kubernetes
- OpenTelemetry Collector
- OpenTelemetry Operator
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector receivers, processors, and exporters
- Prometheus metrics export
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Operator for Kubernetes: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Collector Helm chart and Kubernetes presets: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Kubernetes Collector components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The Collector CRs used Kubernetes-specific receivers and processors but did not set an image that includes those components. Updated both Collector manifests to use `otel/opentelemetry-collector-k8s:0.153.0`, matching the current official Collector release line.
- The Collector RBAC ServiceAccount was declared but not attached to the Collector workloads. Added `serviceAccount: otel-collector` to both Collector CRs and noted that RBAC should be applied before the Collector resources.
- The `kubeletstats` receiver referenced `${env:K8S_NODE_NAME}` without defining that environment variable. Added a Downward API env var mapping from `spec.nodeName`.
- The `hostmetrics` receiver claimed to collect node host metrics but did not mount the host filesystem. Added a `/hostfs` hostPath volume, volume mount, and `root_path: /hostfs`.
- The OneUptime exporter used an incorrect endpoint/exporter combination. Changed it to the documented `otlphttp` exporter with `https://oneuptime.com/otlp`, JSON encoding, and the `x-oneuptime-token` header.
- The OneUptime token environment variable was referenced but not populated. Added a Kubernetes Secret creation command and wired the secret into the gateway Collector env.
- The application example claimed that a node IP was used while it actually used a ClusterIP service DNS name. Updated the wording and changed the app OTLP endpoint to the HTTP receiver port with `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`.
- The internal metrics verification used service port-forwarding and log greps for strings that the configured gateway would not emit. Updated it to port-forward the gateway Deployment and inspect Collector internal metrics via `/metrics`.
- The examples used the `observability` namespace without creating it. Added an idempotent namespace creation command.

## Review Notes
The agent endpoint shown is a stable service endpoint, not guaranteed node-local traffic. A future improvement could show a node-local DaemonSet endpoint pattern using host networking or host ports, but that would be a larger architecture addition beyond this validation pass.
