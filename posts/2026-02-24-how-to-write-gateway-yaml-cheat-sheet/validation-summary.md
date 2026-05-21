# Validation Summary: How to Write Gateway YAML (Cheat Sheet)

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Istio Gateway resources (`networking.istio.io/v1`)
- Istio VirtualService resources
- Kubernetes YAML
- Kubernetes Secrets
- TLS, mutual TLS, TLS passthrough, and SNI
- Istio ingress, egress, and east-west gateways

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Ingress Gateway without TLS Termination task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio multi-cluster multi-network installation guide: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Kubernetes `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
No technical issues found.

## Review Notes
The post uses the Istio configuration API (`networking.istio.io/v1`) rather than the Kubernetes Gateway API (`gateway.networking.k8s.io/v1`), which is still valid and documented in Istio 1.30. Istio documentation notes that Kubernetes Gateway API support is intended to become the default traffic management API in the future, so a future update could mention the distinction. The examples also assume the gateway Service exposes the configured ports externally, which Istio documents as the user's responsibility.
