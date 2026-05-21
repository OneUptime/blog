# Validation Summary: How to Implement Defense-in-Depth with Istio Security

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio security APIs
- Kubernetes NetworkPolicy
- Istio mutual TLS
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy local rate limiting
- Prometheus alerting
- kubectl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Envoy rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio pilot-agent command reference for default SECRET_TTL: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Kubernetes NetworkPolicy concepts: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Envoy local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter

## Issues Found
- The NetworkPolicy DNS egress rule allowed only UDP port 53. I added TCP port 53 because DNS can fall back to TCP and Kubernetes NetworkPolicy port rules are protocol-specific.
- The RequestAuthentication explanation implied JWT validation alone requires a token. I clarified that RequestAuthentication validates tokens when present and that AuthorizationPolicy is used to require a valid JWT for protected paths.
- The rate limiting section described an external rate limit service, but the YAML configured Envoy's local rate limit filter. I changed the text to describe per-instance local rate limiting.
- The local rate limit EnvoyFilter did not explicitly enable or enforce the filter. I updated the typed configuration to match Istio's documented local rate limit EnvoyFilter pattern with `filter_enabled` and `filter_enforced` set to 100%.
- The mTLS alert used `connection_security_policy="none"`, but Istio's documented standard label value for secured traffic is `mutual_tls`, with `unknown` used in source-reported metrics. I changed the query to alert on destination-reported traffic where `connection_security_policy!="mutual_tls"`.

## Review Notes
- The post uses `networking.istio.io/v1alpha3` for EnvoyFilter, which remains the documented Istio API version for EnvoyFilter.
- The `X-XSS-Protection` response header is obsolete in modern browsers, but adding it is syntactically valid and does not break the example.
