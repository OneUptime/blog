# Validation Summary: How to Isolate Tenant Traffic with Istio Authorization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio Sidecar resource
- Istio ingress gateway
- Kubernetes namespaces
- Kubernetes health probes
- Envoy RBAC debugging

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio gateway installation documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Kubernetes Services, Load Balancing, and Networking concepts: https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes Namespaces concepts: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- The policy evaluation order was close but did not exactly match Istio's documented order. Updated it to state that Istio allows by default when no ALLOW policies apply to the workload, then allows matching ALLOW policies, then denies.
- The post said policies are evaluated locally with no external authorization hop. Clarified that this is true for ALLOW and DENY policies, while CUSTOM policies delegate to an external authorizer.
- The post implied any ALLOW policy in a namespace denies all other namespace traffic. Clarified that this applies to workloads selected by the ALLOW policy.
- The namespace-based source examples did not mention their mTLS dependency. Added that `source.namespaces` is derived from peer identity and requires mTLS.
- The Sidecar note implied every tenant must configure Sidecar resources for shared service discovery. Clarified that this is required only when restrictive Sidecar egress host scopes are in use.
- The ingress gateway principal example did not account for custom gateway namespace or service account names. Added a note to replace the principal with the actual gateway workload identity when different.
- The health check pitfall said kubelet probes bypass the sidecar and are not affected by Istio authorization. Updated it to reflect Istio's default HTTP, TCP, and gRPC probe rewrite behavior.
- The headless service note was vague about source namespace detection. Clarified that source namespace and principal matching still require mTLS.

## Review Notes
The snippets use current `security.istio.io/v1` and `networking.istio.io/v1` APIs. The `istioctl x authz check` command is valid, but Istio documents it under experimental commands, so future posts could call out that caveat explicitly.
