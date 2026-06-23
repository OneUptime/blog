# Validation Summary: How to Run Rolling Updates and Canary Deployments in Kubernetes

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Kubernetes Deployments (rolling updates, probes, PodDisruptionBudgets)
- Istio (VirtualService, DestinationRule traffic splitting)
- Argo Rollouts (canary, blue-green, AnalysisTemplate)
- Prometheus / Prometheus Operator (PrometheusRule alerts)
- kubectl CLI

## Sources Consulted
- Kubernetes Deployments docs — RollingUpdate strategy, maxSurge/maxUnavailable rounding: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod lifecycle / probes (readiness, liveness, startup): https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes PodDisruptionBudget (policy/v1): https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Argo Rollouts docs (Rollout spec, canary/blueGreen strategies, AnalysisTemplate, traffic routing, kubectl plugin): https://argo-rollouts.readthedocs.io/
- Istio traffic management (VirtualService, DestinationRule): https://istio.io/latest/docs/reference/config/networking/

## Issues Found
- **Incorrect maxSurge calculation.** The post stated that `maxSurge: 25%` equals "2 extra pods" for 10 replicas, in both the YAML comment and the "Rolling Update Parameters" section. Kubernetes calculates `maxSurge` from a percentage by **rounding up**: 25% of 10 = 2.5 → **3**. (`maxUnavailable` rounds down, so 25% of 10 = 2, which the post had correct.) Fixed both occurrences to read 3 extra pods, and added brief notes clarifying that maxSurge rounds up and maxUnavailable rounds down.

## Review Notes
- The Argo Rollouts canary example using `trafficRouting.nginx` shows only `stableIngress`. A fully working nginx traffic-routing Rollout also requires `canaryService` and `stableService` to be defined in the canary strategy (and corresponding Services). The snippets are illustrative excerpts, so this was left as-is, but readers should add those fields when adapting the example. This is a completeness caveat, not a factual error.
- Istio resources use `networking.istio.io/v1beta1`, which is still valid in current Istio releases (the GA `v1` API is now also available); no change needed.
- `policy/v1` PodDisruptionBudget, `apps/v1` Deployment, `argoproj.io/v1alpha1` Rollout/AnalysisTemplate, and `monitoring.coreos.com/v1` PrometheusRule are all the correct, current API versions.
- All kubectl commands, the Argo Rollouts install/plugin commands, the dashboard port (3100), startup-probe timing math (30 × 10 = 300s), and Prometheus query expressions are accurate.
