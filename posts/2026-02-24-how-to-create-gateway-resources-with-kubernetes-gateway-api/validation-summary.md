# Validation Summary: How to Create Gateway Resources with Kubernetes Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Istio Gateway API support
- Kubernetes Gateway, HTTPRoute, and GRPCRoute concepts
- Kubernetes TLS Secrets
- cert-manager Certificate resources
- Kubernetes HorizontalPodAutoscaler

## Sources Consulted
- Istio Kubernetes Gateway API documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio Getting Started Gateway API notes: https://istio.io/latest/docs/setup/getting-started/
- Kubernetes Gateway API HTTP redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/
- Kubernetes Gateway API TLS guide: https://gateway-api.sigs.k8s.io/guides/tls/
- Kubernetes Gateway API cross-namespace routing guide: https://gateway-api.sigs.k8s.io/guides/user-guides/multiple-ns/
- Kubernetes Gateway API GRPCRoute documentation: https://gateway-api.sigs.k8s.io/reference/api-types/grpcroute/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The Gateway API CRD installation command referenced `v1.2.0`, which is outdated compared with Istio's current documented setup. Updated it to the current Istio-documented `kubectl kustomize "github.com/kubernetes-sigs/gateway-api/config/crd?ref=v1.5.1" | kubectl apply -f -` pattern with an existence check.
- The scaling example used undocumented `autoscaling.istio.io/minReplicas` and `autoscaling.istio.io/maxReplicas` annotations and claimed Istio creates an HPA from those settings. Replaced it with Istio's documented Gateway `spec.infrastructure.parametersRef` customization using a ConfigMap containing a `horizontalPodAutoscaler` patch, and adjusted the explanation accordingly.

## Review Notes
The remaining Gateway, HTTPS listener, HTTP-to-HTTPS redirect, per-hostname listener, service type annotation, cross-namespace route attachment, status condition, cleanup, `kubectl create secret tls`, and cert-manager examples are consistent with the consulted documentation. Cross-namespace TLS Secret references would require a `ReferenceGrant`, but the post keeps the Secret in the Gateway namespace, which is valid.
