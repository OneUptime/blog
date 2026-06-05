# Validation Summary: How to Use FluxCD to Continuously Reconcile OpenTelemetry Collector Config from

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- FluxCD
- OpenTelemetry Collector
- Kubernetes
- Kustomize
- GitOps
- Slack notifications

## Sources Consulted
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector components/exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases

## Issues Found
- The base Kustomization referenced `configmap.yaml`, but the repository structure did not include a matching base namespace entry and the static ConfigMap would not trigger a DaemonSet rollout when the Collector configuration changed. Changed the example to use `configMapGenerator` with `base/otel-collector/config.yaml`, so Kustomize generates a ConfigMap with a content hash and updates the DaemonSet reference on config changes.
- The production overlay referenced `patches/config.yaml`, but the post did not define that patch. Removed the undefined patch reference and updated the change workflow to edit `base/otel-collector/config.yaml`.
- The Flux Kustomization used `wait: true` together with explicit `healthChecks`. Flux documents that `healthChecks` are ignored when `wait` is true, so `wait: true` was removed to keep the explicit DaemonSet health check effective.
- The notification `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation shows Provider and Alert examples with `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.
- The Collector image tag was pinned to `0.96.0`, which is outdated relative to the current OpenTelemetry Collector release stream. Updated it to `0.153.0`.
- The comment above `postBuild.substituteFrom` incorrectly described notifications. Updated it to describe variable substitution from a ConfigMap.

## Review Notes
The example still uses a placeholder OTLP HTTP backend endpoint (`https://backend:4318`), so users need to replace it with an endpoint and authentication settings appropriate for their backend.
