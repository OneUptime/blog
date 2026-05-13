# Validation Summary: Deploy OpenTelemetry Collector as a DaemonSet with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- OpenTelemetry Operator
- OpenTelemetry Collector
- OpenTelemetryCollector custom resource
- OpenTelemetry Collector receivers, processors, and exporters
- Grafana Loki, Mimir, and Tempo

## Sources Consulted
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator API documentation for OpenTelemetryCollector: https://github.com/open-telemetry/opentelemetry-operator/blob/main/docs/api/opentelemetrycollectors.md
- OpenTelemetry Operator Helm chart values and README: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-operator
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector receivers list: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector processors list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Loki exporter deprecation tracker: https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/33916
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post referred to a generic `Collector` custom resource. Updated it to `OpenTelemetryCollector`, which is the operator-managed CR kind.
- The `OpenTelemetryCollector` example used `opentelemetry.io/v1alpha1` and string-based `spec.config`. Updated it to the current `opentelemetry.io/v1beta1` API and structured `spec.config` format.
- The operator HelmRelease installed into a namespace that might not exist and did not set a target namespace. Moved the HelmRelease to `flux-system`, added `targetNamespace`, and enabled namespace creation for the release.
- The operator values used `manager.extraArgs` for leader election, but leader election is already exposed as chart configuration and enabled by default. Removed the unnecessary argument and added the current Kubernetes Collector image repository.
- The collector used `k8sattributes` but did not account for the RBAC it needs. Enabled `manager.createRbacPermissions` so the operator can create collector RBAC.
- The host metrics example did not mount the host filesystem or set `hostmetrics.root_path`, so it would collect from the container view rather than the node filesystem. Added a `/hostfs` hostPath mount and `root_path: /hostfs`.
- The example used the removed/deprecated `loki` exporter. Replaced it with the `otlphttp/loki` exporter pointed at Loki's OTLP endpoint.
- The post said applications could send telemetry to `127.0.0.1` through `hostPort`. For normal application pods, pod loopback is not the node loopback. Updated the text to say applications should send to their node IP.
- The Flux Kustomization applied the operator HelmRelease and collector CR from the same path while also depending on an `opentelemetry-operator` Kustomization that was not defined. Split the example into operator and collector Kustomizations and made the collector depend on the operator.

## Review Notes
- The example still uses placeholder backend service names for Mimir, Loki, and Tempo. Those are technically plausible, but readers must adjust them to match their installed observability stack.
- The `monitoring` namespace is assumed to exist because the example's backends are also referenced in that namespace.
