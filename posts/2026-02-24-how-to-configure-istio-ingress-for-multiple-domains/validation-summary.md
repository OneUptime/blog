# Validation Summary: How to Configure Istio Ingress for Multiple Domains

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService resources
- Istio ingress gateway
- Kubernetes Services and Secrets
- TLS and SNI
- cert-manager Certificate resources
- kubectl and istioctl commands

## Sources Consulted
- Istio Secure Gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The prerequisites described the ingress gateway service address only as an external IP. Kubernetes LoadBalancer services can expose either an IP address or a load balancer hostname depending on the environment. Updated the wording to "external address" and noted that it may be an IP address or hostname.
- The verification command used `kubectl get gateway -n istio-system`. On clusters with both Istio Gateway resources and Kubernetes Gateway API resources installed, the unqualified resource name can be ambiguous. Updated it to `kubectl get gateways.networking.istio.io -n istio-system` to explicitly query Istio Gateway resources.

## Review Notes
The Istio Gateway, VirtualService, TLS secret, cert-manager Certificate, HTTP-to-HTTPS redirect, wildcard host, SNI, and cross-namespace Gateway reference examples were otherwise consistent with current official documentation. Short Kubernetes service names in VirtualService destinations are valid when the backend services are in the same namespace as the VirtualService, as shown in the post.
