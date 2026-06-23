# Validation Summary: How to Choose Between Kubernetes Network Policies and Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes CNI plugins
- Istio service mesh
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio RequestAuthentication
- Envoy sidecar proxies
- mTLS, JWT authentication, and service-to-service authorization

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio rate limiting with Envoy task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio performance and scalability documentation: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/

## Issues Found
- Updated the feature matrix to clarify that Istio rate limiting is available through Envoy filters/extensions rather than a simple native policy field.
- Updated the Istio architecture diagram label from the older "Pilot, Citadel, Galley" component breakdown to a current `istiod` description covering discovery, certificates, and config validation.
- Added a note that JWT-based `requestPrincipals` matching requires a corresponding `RequestAuthentication` policy.
- Corrected the idempotency-key condition to use Istio's documented presence match (`values: ["*"]`) for a non-empty header.
- Clarified that request/response body inspection is not part of native Istio AuthorizationPolicy and requires custom Envoy/Wasm filters.
- Clarified NetworkPolicy performance wording because enforcement depends on the CNI datapath, such as iptables or eBPF.
- Removed an inaccurate "Verify mTLS status" command that used `istioctl x authz check`; kept the current documented authorization-policy inspection command.

## Review Notes
- All YAML code fences parse successfully as YAML.
- The examples are illustrative and assume conventional namespace labels, workload labels, service accounts, and an Istio root namespace of `istio-system`.
- NetworkPolicy behavior still depends on a CNI implementation that supports NetworkPolicy enforcement.
