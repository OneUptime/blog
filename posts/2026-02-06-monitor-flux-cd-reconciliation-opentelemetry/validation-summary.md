# Validation Summary: How to Monitor Flux CD Reconciliation with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- Kubernetes events and RBAC
- Prometheus metrics
- kube-state-metrics custom resource metrics

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux events documentation: https://fluxcd.io/flux/monitoring/events/
- Flux Kustomization status and event examples: https://fluxcd.io/flux/components/kustomize/kustomizations/
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Kubernetes deprecated API migration guide for Events: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes events.k8s.io/v1 Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/

## Issues Found
- The post described `gotk_reconcile_condition` and `gotk_suspend_status` as key metrics exposed by Flux controllers. Current Flux documentation separates controller metrics from resource-state metrics and documents `gotk_resource_info` as a kube-state-metrics custom resource metric for readiness and suspension state. Updated the metrics section and alert examples to use `gotk_resource_info` through kube-state-metrics.
- The post listed `source_controller_artifact_in_storage`, which is not documented in current Flux controller metrics. Replaced it with `gotk_cache_events_total`, which is documented by Flux.
- The Python event watcher used the legacy core/v1 Event fields `source.component`, `involved_object`, and `message`. Kubernetes documents the current events.k8s.io/v1 fields as `reportingController`, `regarding`, and `note`, with the old fields deprecated for compatibility. Updated the watcher to use `client.EventsV1Api()` and the current event fields.
- The RBAC example granted access to core API group events. Because the watcher now reads events.k8s.io/v1 Events, updated the RBAC rule to `apiGroups: ["events.k8s.io"]`.
- The event watcher implied authoritative per-reconciliation duration spans from point-in-time Kubernetes events. Added a caveat that scraped duration metrics remain the authoritative source for reconciliation timing.

## Review Notes
The OpenTelemetry Collector Prometheus receiver configuration is structurally valid, but production deployments should ensure the Collector service account has the RBAC needed for Kubernetes service discovery and should configure OTLP TLS/insecure settings according to the backend endpoint.
