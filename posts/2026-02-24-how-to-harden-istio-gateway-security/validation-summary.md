# Validation Summary: How to Harden Istio Gateway Security

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Gateway
- Istio EnvoyFilter
- Istio egress gateway
- Istio AuthorizationPolicy
- Kubernetes Secrets
- Kubernetes NetworkPolicy
- Kubernetes seccomp security context
- Envoy TLS and local rate limiting
- Prometheus/PromQL

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio secure ingress gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio egress gateway task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio egress control task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Envoy TLS common configuration reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/common.proto
- Envoy listener statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy local rate limit filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter

## Issues Found
- The TLS 1.3 gateway example listed TLS 1.3 cipher suites under `cipherSuites`. Envoy's `cipher_suites` setting applies to TLS 1.0 through TLS 1.2 and has no effect for TLS 1.3, so I removed the list from the TLS 1.3 example and clarified that explicit cipher suite configuration is for TLS 1.2.
- The mutual TLS gateway example did not state that a CA certificate is required to verify client certificates. I added a note that `MUTUAL` mode needs the CA certificate in the referenced credential, such as `ca.crt`, or via `caCertCredentialName`.
- The gateway pod hardening example used the deprecated seccomp annotation `seccomp.security.alpha.kubernetes.io/pod`. I replaced it with the stable Kubernetes `securityContext.seccompProfile.type: RuntimeDefault` field supported through IstioOperator `k8s.securityContext`.
- The NetworkPolicy explanation said it restricted which pods can communicate with the gateway, but the example restricts ports and egress destinations rather than ingress sources. I changed the wording to match the policy.
- The egress section said `REGISTRY_ONLY` forces all outbound traffic through the egress gateway. Istio documents that egress gateways do not securely enforce that by themselves, and external network controls are needed to prevent bypass. I corrected the heading and added a short caveat.
- The HTTPS egress passthrough `ServiceEntry` used `protocol: HTTPS`. Istio's egress gateway documentation uses `protocol: TLS` for application-originated HTTPS passthrough with SNI-based TLS routing, so I changed the service entry port name and protocol to `tls`/`TLS`.

## Review Notes
- The EnvoyFilter examples are inherently version-sensitive because Istio warns that EnvoyFilter patches depend on generated Envoy internals. They match current documented patterns, but they should be rechecked during Istio upgrades.
- The `X-XSS-Protection` header is obsolete in modern browsers, but including it is not a syntax or Istio configuration error.
- The PromQL examples depend on which Envoy stats are included by Istio proxy stats configuration. The local rate limit metric requires enabling HTTP local rate limit stats, as noted in Istio's rate limiting documentation.
