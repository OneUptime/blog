# Validation Summary: How to Configure Cross-Service Authorization Chains

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Kubernetes ServiceAccount and Deployment
- Kubernetes kubectl
- Prometheus alerting
- Kiali

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The EnvoyFilter examples used the deprecated Envoy Lua `inlineCode` field. Updated the snippets to use `defaultSourceCode.inlineString`, which is the current field shown in Istio and Envoy documentation.
- The full-chain header example expected `api-gateway>order-service>inventory-service`, but only showed the order service appending to the header. Added a note to create a matching filter for `inventory-service` so the final AuthorizationPolicy condition can match.
- The spoofing mitigation text implied that combining headers with mTLS identity prevents forged chain headers. Narrowed the claim because mTLS verifies the immediate peer identity, but a compromised allowed upstream service can still forge a mutable header.
- The introductory risk statement said a compromised service could call any other service without chain authorization. Changed this to "without per-hop authorization" to distinguish direct-caller authorization from full path validation.

## Review Notes
EnvoyFilter is a powerful but low-level Istio extension point, and Istio documentation warns that EnvoyFilter patches should be monitored during proxy upgrades. For higher-assurance path validation, application-issued scoped tokens or an external authorization service are stronger than mutable chain headers.
