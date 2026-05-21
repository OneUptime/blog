# Validation Summary: How to Configure Tenant-Specific Security Policies in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio PeerAuthentication
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Istio Telemetry API
- Istio Sidecar and ServiceEntry
- Kubernetes kubectl
- JWT authentication and mTLS

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference and conditions: https://istio.io/latest/docs/reference/config/security/authorization-policy/ and https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The `outputPayloadToHeader` explanation said Istio decodes the JWT payload into a header. Updated it to clarify that Istio emits the verified JWT payload as base64-encoded JSON, matching the RequestAuthentication API reference.
- The rate limiting section described an `AuthorizationPolicy` as rate limiting. Updated the heading and wording to describe it as high-volume endpoint access control, and noted that quota-style rate limiting uses Envoy rate limiting configuration in Istio.
- The IP allowlist example allowed both source IP ranges and same-tenant workloads, but the prose only mentioned IP ranges. Updated the wording to match the policy behavior.
- The egress section implied `REGISTRY_ONLY` and ServiceEntry form a hard outbound firewall and prevent data leaks. Updated the wording to match Istio's documentation: unknown outbound traffic is dropped by sidecars, ServiceEntry registers allowed external hosts, and this helps reduce accidental external calls and improve visibility rather than acting as a complete outbound security policy.
- The summary claimed egress restrictions prevent data leaks and that tenants cannot weaken the baseline. Updated the wording to avoid overstating the guarantee and to clarify that per-tenant customization should not weaken other tenant namespaces.

## Review Notes
The YAML snippets use current Istio API groups and versions for the covered resources. The PeerAuthentication port-level example is valid for sidecar mode when a workload selector is specified; the port numbers refer to workload ports, not Kubernetes Service ports. For ambient mode, Istio documentation notes that PeerAuthentication `DISABLE` mode is not supported.
