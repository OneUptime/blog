# Validation Summary: How to Set Up DMZ Architecture with Istio

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Istio Gateway and VirtualService
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- Istio Sidecar resource
- Istio EnvoyFilter and Envoy local rate limiting
- Kubernetes namespaces and kubectl commands
- Istio telemetry metrics / Prometheus queries

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Envoy rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The internal-to-DMZ backflow section implied that the Istio `Sidecar` resource alone enforces a security boundary. Updated the wording to make the destination `AuthorizationPolicy` the enforcement point and describe `Sidecar` as outbound mesh configuration scoping, which matches the Istio Sidecar reference.
- The WAF section presented an Envoy local rate limit filter as a WAF layer. Updated the heading and text to distinguish an external WAF from gateway-level rate limiting through `EnvoyFilter`.
- The ingress boundary test used a generic `test-pod` in `istio-system`, which would not necessarily have the ingress gateway service-account principal allowed by the DMZ authorization policy. Replaced it with a public gateway `curl` test using `--resolve` and `$INGRESS_IP`.
- The direct service test commands used short cross-namespace service names. Changed them to fully qualified Kubernetes service DNS names to avoid namespace search-path ambiguity during validation.

## Review Notes
The Istio `networking.istio.io/v1` Gateway, VirtualService, and Sidecar examples are current. The `security.istio.io/v1` PeerAuthentication and AuthorizationPolicy examples are current, and `spec: {}` is the documented allow-nothing pattern. The EnvoyFilter API remains `networking.istio.io/v1alpha3`, and EnvoyFilter patches are powerful but version-sensitive, so production use should be tested against the exact Istio/Envoy version deployed.
