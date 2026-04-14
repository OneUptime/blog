# Validation Summary: How to Configure Node Affinity for Dapr Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (control plane Helm chart configuration)
- Kubernetes (node affinity, pod anti-affinity, Deployments, node labeling)
- Helm (chart values override for Dapr)

## Sources Consulted
- Kubernetes official documentation on node affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity
- Kubernetes API reference for PodSpec affinity: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#affinity-v1-core
- Dapr Helm chart values reference: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/#helm-chart-customization
- Kubernetes well-known labels and annotations: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
1. **Missing required Deployment fields**: The `apps/v1` Deployment YAML for the order-service was missing `spec.selector` and `spec.template.metadata.labels`, both of which are required fields. Without `spec.selector.matchLabels`, the Kubernetes API server rejects the Deployment with a validation error. Added `spec.selector.matchLabels.app: order-service` and `spec.template.metadata.labels.app: order-service` to make the example functional. This also ensures the `podAntiAffinity` label selector (`app: order-service`) correctly matches the pod's own labels.

## Review Notes
- The Dapr Helm chart keys (`dapr_operator`, `dapr_sentry`) with the `affinity` field are correct for the current Dapr Helm chart.
- The `preferredDuringSchedulingIgnoredDuringExecution` weight values (80 and 20) are valid (range 1-100).
- All Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are correct and current.
- The topology keys `kubernetes.io/hostname` and `topology.kubernetes.io/zone` are standard well-known Kubernetes labels.
- All kubectl and helm commands use correct syntax and flags.
