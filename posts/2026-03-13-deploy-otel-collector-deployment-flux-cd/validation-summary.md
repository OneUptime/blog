# Validation Summary: How to Deploy OpenTelemetry Collector as a Deployment with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Operator
- Kubernetes Deployments, RBAC, and HorizontalPodAutoscaler
- Flux CD Kustomization
- Prometheus remote write / Grafana Mimir
- Grafana Loki
- Grafana Tempo

## Sources Consulted
- OpenTelemetry Operator for Kubernetes: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Collector Kubernetes components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector deployment patterns: https://opentelemetry.io/docs/collector/deployment/
- OpenTelemetry agent-to-gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry Collector k8sattributesprocessor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor
- OpenTelemetry Collector memorylimiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiter
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/

## Issues Found
- Updated the `OpenTelemetryCollector` API from `opentelemetry.io/v1alpha1` with string `spec.config` to the current `opentelemetry.io/v1beta1` structured `spec.config` format used by the Operator documentation.
- Added an explicit contrib Collector image because the example uses contrib components such as `k8sattributes`, `tail_sampling`, and `prometheusremotewrite`.
- Added ServiceAccount, ClusterRole, and ClusterRoleBinding resources required by the `k8sattributes` processor to read Kubernetes metadata across namespaces.
- Removed the Prometheus receiver from the horizontally scaled gateway example because Prometheus scraping is stateful and multiple gateway replicas would duplicate scrapes unless target allocation or another sharding strategy is configured.
- Replaced the Loki exporter with `otlphttp/loki` pointing at Loki's native OTLP endpoint, which is the recommended ingestion path for current Loki versions.
- Reordered pipelines so `memory_limiter` is first, matching Collector guidance for limiting memory before later processors allocate more data.
- Clarified that tail sampling with multiple gateway replicas requires trace-ID-aware routing from upstream collectors so all spans for a trace reach the same replica.
- Changed the Flux custom resource file path from the reconciled `otel/kustomization.yaml` path to a `flux-system` manifest path so Flux does not mistake the Flux custom resource for the target directory's Kustomize configuration.

## Review Notes
- The HPA example is syntactically valid for `autoscaling/v2` and correctly targets the Operator-created Deployment name pattern.
- If the deployment should scrape Prometheus targets directly from multiple replicas in the future, add the OpenTelemetry Operator Target Allocator or use a separate, intentionally sharded scraping design.
