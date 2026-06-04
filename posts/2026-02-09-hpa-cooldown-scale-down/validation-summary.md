# Validation Summary: How to Configure HPA Cooldown Period for Scale-Down Delay

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- HorizontalPodAutoscaler
- autoscaling/v2 API
- kubectl
- JSON Patch
- jq

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes configurable HPA scale velocity KEP: https://github.com/kubernetes/enhancements/tree/master/keps/sig-autoscaling/853-configurable-hpa-scale-velocity

## Issues Found
- The introduction described stabilization as requiring raw metrics to remain below thresholds. Kubernetes applies stabilization to computed scaling recommendations, so this was changed to say scale-down recommendations must remain lower for the sustained period.
- The monitoring section said a lower `status.desiredReplicas` than `status.currentReplicas` means cooldown is preventing scale-down. The HPA status desired replica count is not a reliable raw pre-stabilization recommendation signal, so this was changed to refer to `ScalingLimited` or repeated recommendations being held at a higher replica count.

## Review Notes
The HPA manifests use the stable `autoscaling/v2` API and valid `behavior`, metric, and policy fields. The examples are version-sensitive because configurable HPA behavior is stable in Kubernetes v1.23 and later, and `periodSeconds` values must remain within the documented 1-1800 second range.
