# Validation Summary: How to Handle HPA Conflicts with Flux Managed Replicas

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes server-side apply and managed fields
- Flux CD v2 Kustomization reconciliation
- Kustomize JSON6902 patches
- PrometheusRule and kube-state-metrics

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes API reference for Deployment and HorizontalPodAutoscaler: https://kubernetes.io/docs/reference/generated/kubernetes-api/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize controller options: https://fluxcd.io/flux/components/kustomize/options/
- kube-state-metrics HorizontalPodAutoscaler metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md
- kube-state-metrics Deployment metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md

## Issues Found
- The post recommended removing `spec.replicas` without mentioning the server-side apply ownership transfer caveat. Kubernetes documents that if no other field manager owns `spec.replicas`, removing it from an applied configuration can reset the Deployment to the default replica count of 1. Added a note to ensure the HPA has written the field or to use the Kubernetes SSA ownership transfer procedure.
- The monitoring alert compared `kube_horizontalpodautoscaler_status_current_replicas` directly to `kube_deployment_spec_replicas`. That can alert during normal scaling lag and does not join HPA metrics to the target Deployment. Updated it to compare HPA desired replicas against the target Deployment's desired replicas using `kube_horizontalpodautoscaler_info` and `label_replace`.
- The introduction claimed the guide covered every method and configuring Flux field management. Adjusted that claim to say it covers common methods and verification, which matches the actual content.

## Review Notes
The core recommendation to omit `spec.replicas` when an HPA manages a Deployment is consistent with Kubernetes documentation. The `autoscaling/v2` HPA example uses current API fields, and Flux's server-side apply and reconcile behavior are consistent with Flux documentation. Local CLI validation with `kubectl`, `flux`, and `kustomize` was not possible because those binaries are not installed in this workspace.
