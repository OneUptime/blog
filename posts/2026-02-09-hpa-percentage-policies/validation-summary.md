# Validation Summary: How to Use HPA with Percentage-Based Scale-Up and Scale-Down Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- Kubernetes autoscaling/v2 API
- HPA scaling behavior policies
- kubectl
- jq
- Python pandas

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The introduction stated that a 50% scale-up policy "adds" a fixed number of pods. HPA behavior policies limit the maximum rate of change after desired replicas are calculated from metrics, so the wording was changed to "can add up to."
- Comments in combined scale-up policy examples described `Pods` policies as adding a minimum number of pods. HPA policies set permitted change limits, and `selectPolicy: Max` selects the policy that allows the largest change; the actual scale change can still be smaller if metrics do not require the full amount. The comments were corrected to say "allow up to."
- The multi-policy example described a pod-count policy as a maximum growth cap while using `selectPolicy: Max`. With `Max`, HPA selects the policy that allows the largest change, so that policy is not a cap. The comments and explanation were revised to describe choosing between short-window and long-window limits according to `selectPolicy`.
- The troubleshooting section said a 10% scale-down policy with 5 replicas rounds 0.5 pods to 0. Kubernetes documentation states fractional percentage policy calculations are rounded up. The text was corrected to say this can allow up to 1 pod to be removed when metrics and stabilization permit it.

## Review Notes
The examples use the current stable `autoscaling/v2` HorizontalPodAutoscaler API and valid HPA behavior fields. The `behavior.tolerance` field exists in current Kubernetes API documentation but is beta and feature-gated, and the post does not rely on it.
