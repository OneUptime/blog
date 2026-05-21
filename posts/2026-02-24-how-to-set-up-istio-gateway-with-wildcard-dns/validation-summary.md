# Validation Summary: How to Set Up Istio Gateway with Wildcard DNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Kubernetes Services and kubectl
- Wildcard DNS
- TLS wildcard certificates
- cert-manager Certificate resources
- Let's Encrypt DNS-01 validation

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio InvalidGatewayCredential analysis reference: https://istio.io/latest/docs/reference/config/analysis/ist0161/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- RFC 4592, The Role of Wildcards in the Domain Name System: https://www.rfc-editor.org/rfc/rfc4592.html
- RFC 9525, Service Identity in TLS: https://www.rfc-editor.org/rfc/rfc9525
- Envoy HTTP route components reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The limitations section said wildcard DNS records only match one level of subdomain. That is not accurate for DNS wildcard synthesis under RFC 4592. I changed the text to distinguish DNS wildcard behavior from wildcard TLS certificate matching and Istio Gateway host matching, where the one-label caveat is relevant to the post's setup.

## Review Notes
- The Istio `Gateway` and `VirtualService` snippets use the current `networking.istio.io/v1` API and valid fields.
- The cert-manager `Certificate` snippet uses valid `cert-manager.io/v1` fields and correctly places the generated secret in the same namespace as the `Certificate`.
- The Let's Encrypt DNS-01 recommendation for wildcard certificates is correct.
- `kubectl` was not installed in the review environment, so CLI command syntax was checked against documented Kubernetes usage rather than local command help.
