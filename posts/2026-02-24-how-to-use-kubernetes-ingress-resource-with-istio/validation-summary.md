# Validation Summary: How to Use Kubernetes Ingress Resource with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes Ingress
- Kubernetes IngressClass
- Istio ingress gateway
- Kubernetes TLS Secrets
- Istio Gateway and VirtualService resources
- kubectl and istioctl

## Sources Consulted
- Istio Kubernetes Ingress documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/kubernetes-ingress/
- Istio Secure Gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The setup section used only `ingressClassName: istio`, but Istio's current Kubernetes Ingress guide also creates an `IngressClass` with `spec.controller: istio.io/ingress-controller`. Added the `IngressClass` manifest and updated the step title and explanation.
- The post said Istio automatically generates Gateway and VirtualService resources from an Ingress. Reworded this to say Istio translates the Ingress into ingress gateway configuration, avoiding the incorrect implication that user-visible Gateway and VirtualService resources are created.
- The TLS section said the TLS secret should be in the same namespace as the Ingress. Istio's Kubernetes Ingress documentation says the referenced secret must exist in the namespace of the `istio-ingressgateway` deployment, typically `istio-system`. Updated the command and note accordingly.
- The annotations section used `istio.io/ingress-use-istio`, which is not listed in the official Istio annotations reference. Replaced it with the documented legacy Kubernetes ingress class annotation and noted that `ingressClassName` is preferred for new manifests.

## Review Notes
Kubernetes Ingress is marked as frozen in Kubernetes documentation, with new features going into the Gateway API. The post remains technically relevant because Istio still documents Kubernetes Ingress support, but a future update could mention the Kubernetes Gateway API as the modern extension path.
