# Validation Summary: How to Set Up Per-Tenant Ingress in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio AuthorizationPolicy
- Istio ingress gateways and SDS TLS credentials
- Kubernetes Service, Deployment, ServiceAccount, Role, RoleBinding, and TLS Secret resources
- kubectl

## Sources Consulted
- Istio Ingress Gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio Secure Gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Installing Gateways documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy API reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The dedicated tenant gateway deployment used `credentialName: tenant-a-tls` but did not grant the gateway service account permission to read TLS secrets for SDS. Added a namespace-scoped `Role` and `RoleBinding` allowing `get`, `watch`, and `list` on secrets for the tenant gateway service account, matching Istio's documented gateway SDS setup.
- The AuthorizationPolicy explanation stated that the policy blocks everything except ingress gateway and tenant namespace traffic, but did not mention that `source.principals` and `source.namespaces` depend on mTLS-derived source identity. Added that caveat.

## Review Notes
- The Istio `networking.istio.io/v1` Gateway and VirtualService examples use current API versions and valid routing fields.
- The `kubectl create secret tls` commands use current flags and match Kubernetes' documented syntax.
- The shared gateway selector `istio: ingressgateway` matches Istio's default ingress gateway examples; installations using Helm or custom labels may need to adjust selectors and service account names.
