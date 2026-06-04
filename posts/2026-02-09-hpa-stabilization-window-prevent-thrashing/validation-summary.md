# Validation Summary: How to Use HPA stabilizationWindowSeconds to Prevent Scaling Thrashing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes autoscaling/v2 API
- HPA scaling behavior policies
- kubectl
- jq

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post described `stabilizationWindowSeconds` as requiring metrics to stay above or below thresholds for a sustained period. Kubernetes documents stabilization windows as considering past desired replica recommendations and choosing a safer value from that window. Updated the affected explanations to describe recommendation-based stabilization.
- Several examples described scale-up behavior as waiting a fixed number of seconds or reacting immediately to a raw metric reading. Updated the text to clarify that HPA smooths or skips stabilization of the desired replica recommendation, while scaling policies still limit the rate of change.

## Review Notes
The HPA manifests use the current `autoscaling/v2` API and valid fields such as `behavior.scaleUp`, `behavior.scaleDown`, `policies`, `selectPolicy`, `stabilizationWindowSeconds`, Resource metrics, Pods metrics, and External metrics. The `kubectl get events --field-selector involvedObject.name=... --sort-by='.lastTimestamp'` pattern is consistent with Kubernetes field selector and `kubectl get` documentation, though Events are best-effort and retained only temporarily.
