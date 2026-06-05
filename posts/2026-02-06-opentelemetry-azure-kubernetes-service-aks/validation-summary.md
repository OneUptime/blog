# Validation Summary: How to Set Up OpenTelemetry on Azure Kubernetes Service (AKS)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes manifests, Services, DaemonSets, Deployments, RBAC, and Downward API
- OpenTelemetry Collector and OpenTelemetry Collector Contrib
- OpenTelemetry Operator and Instrumentation custom resources
- cert-manager
- Helm
- Azure Monitor / Application Insights
- Prometheus remote write

## Sources Consulted
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator API reference for `OpenTelemetryCollector` and `Instrumentation`: https://github.com/open-telemetry/opentelemetry-operator/tree/main/docs/api
- OpenTelemetry Kubernetes auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib Azure Monitor exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/azuremonitorexporter
- OpenTelemetry Collector Contrib kubeletstats receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/kubeletstatsreceiver
- OpenTelemetry Collector Contrib Kubernetes attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/k8sattributesprocessor
- OpenTelemetry Collector Contrib resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OpenTelemetry Collector Contrib filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/
- Azure AKS supported Kubernetes versions documentation: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions

## Issues Found
- The post pinned cert-manager `v1.14.4`, which is end-of-life in 2026. Updated the manifest URL to `v1.20.2`, a currently supported release.
- The post pinned `otel/opentelemetry-collector-contrib:0.96.0`, which is stale. Updated Collector image references to `0.153.0`, the current OpenTelemetry Collector release verified during review.
- The application example claimed the Collector Service endpoint reached the local DaemonSet agent. A Kubernetes Service can load balance to another DaemonSet pod, so the post now enables `hostNetwork` on the DaemonSet Collector and uses `status.hostIP` for node-local app export. The Service endpoint is kept as a simpler non-node-local alternative.
- The node-IP endpoint example previously would not work unless the DaemonSet exposed OTLP on the node network. Added `hostNetwork: true` and `dnsPolicy: ClusterFirstWithHostNet`.
- The gateway referenced `${env:APPLICATIONINSIGHTS_CONNECTION_STRING}` without showing how that environment variable gets into the Collector pod. Added a `Secret` reference in the gateway CR and a `kubectl create secret` command.
- The filter processor example used the older `traces.span` configuration form. Updated it to current `trace_conditions` OTTL syntax.
- The self-monitoring example used `service.telemetry.metrics.address`, which is ignored as of Collector `v0.123.0`. Updated it to the current Prometheus pull reader configuration with `host` and `port`.
- The auto-instrumentation section said all languages are injected with an init container. Updated the wording because Go auto-instrumentation uses a sidecar and requires `OTEL_GO_AUTO_TARGET_EXE` or the target-executable annotation.
- The AKS prerequisite named Kubernetes `1.26 or later`, but AKS support windows have moved on. Changed this to require a currently supported AKS Kubernetes version.

## Review Notes
The YAML snippets were parsed successfully after edits. The Prometheus remote write endpoint is still an example and requires Prometheus to have its remote write receiver enabled. The post remains a practical starting point, but production deployments should also add resource limits, retry/queue settings, and backend-specific authentication details.
