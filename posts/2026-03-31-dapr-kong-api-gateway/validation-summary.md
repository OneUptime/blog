# Validation Summary: How to Use Dapr with Kong API Gateway

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kong API Gateway
- Kubernetes (Deployments, Services, Ingress)
- Kong Ingress Controller (KongPlugin CRDs)
- Helm

## Sources Consulted
- Kong Helm Charts repository: https://github.com/Kong/charts
- Kong charts index: https://charts.konghq.com
- Kong Rate Limiting Plugin Configuration: https://docs.konghq.com/hub/kong-inc/rate-limiting/configuration/
- Kong JWT Plugin Configuration: https://docs.konghq.com/hub/kong-inc/jwt/configuration/
- Kong Ingress Controller Annotation Reference: https://docs.konghq.com/kubernetes-ingress-controller/latest/references/annotations/
- KongPlugin CRD Reference: https://docs.konghq.com/kubernetes-ingress-controller/latest/reference/custom-resources/
- Dapr Kubernetes Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Sidecar Overview: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Kubernetes Deployment Spec: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Ingress Spec (networking.k8s.io/v1): https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found

### Issue 1: Deployment missing `spec.selector` and pod template labels
- **What was wrong:** The Deployment YAML was missing the required `spec.selector.matchLabels` field and the pod template had no `metadata.labels`. Without `spec.selector`, Kubernetes rejects the Deployment. Without pod labels, the Service selector (`app: order-service`) would not match any pods.
- **What was changed:** Added `spec.selector.matchLabels` with `app: order-service` and added `metadata.labels` with `app: order-service` to the pod template.
- **Why:** `spec.selector` is a required field in `apps/v1` Deployments, and the Service needs matching labels to route traffic to the pods.

### Issue 2: Second ingress snippet missing `pathType`
- **What was wrong:** The ingress path entry under "Kong to Dapr Service Invocation" was missing the `pathType` field, which is required in `networking.k8s.io/v1` Ingress resources.
- **What was changed:** Added `pathType: Prefix` to the path entry.
- **Why:** `pathType` is a mandatory field in the `networking.k8s.io/v1` Ingress API. Without it, the resource would be rejected by Kubernetes.

## Review Notes
- The Helm value `ingressController.installCRDs=false` is a legacy setting. In modern versions of the Kong Helm chart, CRDs are managed via Helm 3's native CRD mechanism. The setting still works for backward compatibility but may be removed in future chart versions.
- All Kong plugin configurations (rate-limiting, JWT) use correct field names and valid values.
- All Dapr annotations are correct and current.
- The Dapr service invocation routing approach (exposing port 3500 via a separate Service and routing through the Dapr sidecar) is a valid pattern for gaining Dapr tracing and middleware benefits on external traffic.
