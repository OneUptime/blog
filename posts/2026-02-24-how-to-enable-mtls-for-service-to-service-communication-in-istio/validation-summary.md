# Validation Summary: How to Enable mTLS for Service-to-Service Communication in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Mutual TLS (mTLS)
- Kubernetes
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- istioctl
- Prometheus metrics
- gRPC

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task, including auto mTLS and strict mTLS examples: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl and proxy-config documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/ and https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio mesh configuration reference for enableAutoMtls: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/

## Issues Found
- The post said `PeerAuthentication` is set to `PERMISSIVE` by default. Istio may have no PeerAuthentication resource by default; the inherited `UNSET` behavior is effectively `PERMISSIVE`. Updated the wording to avoid implying a default resource exists.
- The auto mTLS verification command could look like a failure when `enableAutoMtls` is omitted from mesh config, even though the documented default is true. Updated the command and comment to explain that absence means the default applies.
- The `istioctl proxy-config cluster` check only looked at `.transportSocket.name`. Istio/Envoy cluster config can also expose TLS through `transportSocketMatches`, especially with automatic mTLS. Updated the `jq` expression to inspect both locations.
- The strict mTLS explanation described a compromised sidecar downgrading to plaintext. The documented issue is that workloads can still accept plaintext traffic unless strict mTLS is configured. Updated the sentence accordingly.
- The Prometheus query used `reporter="source"` with `connection_security_policy="mutual_tls"`. Istio's standard metrics documentation says this label is populated as `mutual_tls` from the destination reporter and is `unknown` from the source reporter. Updated the query to use `reporter="destination"`.

## Review Notes
The snippets use current `security.istio.io/v1` APIs and the command structure matches current Istio documentation. The guide assumes sidecar mode; ambient mode has different enrollment and verification commands, so a future update could call that out explicitly if the post is intended to cover ambient mesh as well.
