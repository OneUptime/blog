# Validation Summary: How to Block Traffic from Specific Namespaces in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio AuthorizationPolicy
- Kubernetes namespaces
- Kubernetes kubectl
- Istio mutual TLS
- Envoy RBAC and access logs

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security concepts, including mutual TLS dependency for source namespaces: https://istio.io/latest/docs/concepts/security/
- Istio authorization policy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio authorization policy normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio ingress authorization task for RBAC debug logging examples: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Envoy RBAC filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rbac_filter
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The policy evaluation order omitted CUSTOM policies. Updated the list to include CUSTOM evaluation before DENY, matching the Istio AuthorizationPolicy reference.
- The Envoy log guidance said Istio AuthorizationPolicy denials should show `response_flags` containing `UAEX`. `UAEX` is associated with external authorization, while native Istio AuthorizationPolicy enforcement uses Envoy RBAC and exposes RBAC denial details through `response_code_details`. Updated the guidance to look for `403` and `rbac_access_denied_matched_policy[...]`.

## Review Notes
The namespace-based examples use the current `security.istio.io/v1` AuthorizationPolicy API and valid `source.namespaces`, `selector`, `ALLOW`, `DENY`, and `notPaths` fields. The source namespace match depends on mutual TLS-derived identity; STRICT mTLS remains the safer operational mode, especially when plaintext traffic could otherwise be present in PERMISSIVE mode.
