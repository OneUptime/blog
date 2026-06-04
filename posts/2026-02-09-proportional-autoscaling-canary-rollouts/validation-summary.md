# Validation Summary: How to Implement Proportional Autoscaling During Canary Rollouts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Argo Rollouts canary deployments
- Argo Rollouts traffic routing and dynamic stable scaling
- KEDA ScaledObject and Prometheus scaler
- Prometheus metrics and PromQL
- Node.js Prometheus instrumentation with prom-client
- Kubernetes custom resources and scale subresource

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Custom Metrics API v1beta2 reference: https://kubernetes.io/docs/reference/external-api/custom-metrics.v1beta2/
- Argo Rollouts HPA support: https://argoproj.github.io/argo-rollouts/features/hpa-support/
- Argo Rollouts canary strategy documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts rollout specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts Istio traffic management: https://argoproj.github.io/argo-rollouts/features/traffic-management/istio/
- KEDA ScaledObject documentation: https://keda.sh/docs/latest/concepts/scaling-deployments/
- Prometheus metric types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus metric naming practices: https://prometheus.io/docs/practices/naming/
- prom-client project documentation: https://github.com/siimon/prom-client

## Issues Found
- The introduction implied that stable and canary always have equal pod counts during a canary rollout. Updated it to describe the traffic-routing case where stable can remain fully scaled while canary pods are added.
- The HPA explanation said HPA "scales both equally." Updated it to explain that HPA computes one desired replica count for its scale target based on selected pods' metrics.
- The Argo Rollouts `dynamicStableScale` example omitted traffic routing, even though Argo Rollouts documents dynamic stable scaling for traffic-routed canaries. Added `canaryService`, `stableService`, and an Istio `trafficRouting` example, and noted that `dynamicStableScale` requires a supported traffic router.
- The "separate HPAs" example targeted Rollout-owned ReplicaSets. Updated the example to target separate Deployments and added a note that HPAs should not directly manage ReplicaSets owned by Argo Rollouts.
- The traffic-based HPA example used a canary-specific HPA name while targeting the Rollout. Renamed the HPA to reflect that the Rollout is the scale target and changed the metric selector to use a metric label (`version: canary`) rather than a placeholder ReplicaSet hash value.
- The Node.js metrics example named a Counter `http_requests_per_second`, which is not a per-second value and conflicted with later `rate(http_requests_total[...])` PromQL. Renamed it to `http_requests_total` and updated the JavaScript variable name.
- The KEDA example's ScaledObject name implied it scaled only the canary while targeting the Rollout. Renamed it to `web-app` to match the actual scale target.
- The predictive HPA example used a canary-specific resource name while targeting the Rollout. Renamed it to `web-app-predictive`.
- The custom metrics server section returned a desired replica count through the custom metrics API, which is not how HPA consumes metrics. Reworked the section as a custom scaling controller that calculates replicas and updates the Rollout `/scale` subresource.
- The gradual scaling example used `setCanaryScale` without traffic routing, even though Argo Rollouts documents `setCanaryScale` as supported only with traffic routing. Added the same service and Istio traffic routing fields to that snippet.

## Review Notes
The remaining examples assume supporting infrastructure exists, including Services and an Istio VirtualService for traffic routing, a metrics adapter for HPA Pods/External metrics, Prometheus scraping, kube-state-metrics labels matching the PromQL examples, and KEDA installed with access to Prometheus. Those prerequisites are normal for this topic but should be made explicit in a future expanded tutorial.
