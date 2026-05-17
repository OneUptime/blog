# Validation Summary: How to Configure Scale-Down Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA), `autoscaling/v2` API
- Kubernetes `behavior` field (scaleUp/scaleDown policies, stabilization windows, selectPolicy)
- Pod Disruption Budgets (`policy/v1`)
- kubectl (jsonpath queries, describe, watch)
- Talos Linux (as the underlying Kubernetes OS, though HPA behavior is distribution-agnostic)

## Sources Consulted
- Kubernetes HPA documentation — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Configurable scaling behavior — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior
- HorizontalPodAutoscaler v2 API reference — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#horizontalpodautoscaler-v2-autoscaling
- PodDisruptionBudget API reference — https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- HPAScalingRules / HPAScalingPolicy fields — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#hpascalingrules-v2-autoscaling

## Issues Found
No technical issues found.

All YAML manifests use the correct stable API versions (`autoscaling/v2`, `policy/v1`, `apps/v1`), the `behavior` field structure is accurate, the `selectPolicy` values (`Max`, `Min`, `Disabled`) match the spec, and the default scale-down behavior (300s stabilization window, `type: Percent` / `value: 100` / `periodSeconds: 15`) is stated correctly. The kubectl `jsonpath` expressions resolve to valid fields on the `autoscaling/v2` status, and the explanation of `stabilizationWindowSeconds` (using the highest recommended replica count over the window for scale-down) matches Kubernetes documentation.

## Review Notes
- The post is framed as "on Talos Linux," but the HPA `behavior` field is a standard upstream Kubernetes feature that works identically on any conformant distribution. The Talos Linux framing is contextual rather than introducing any Talos-specific configuration — this is acceptable but worth noting for readers.
- In the final load-test snippet, the `$(seq 1 300)` is interpolated by the local shell before being passed into the container's `/bin/sh -c`. This works (it just produces a long literal command) but readers wanting the loop evaluated *inside* the container would need to escape the `$`. Not a technical error.
- The busybox `wget -q -O-` form works with the busybox 1.36 applet; the more portable spelling is `-O -` (with a space), but both are accepted.
