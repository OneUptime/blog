# Validation Summary: How to Understand Istio's Security Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio security architecture
- SPIFFE workload identities
- X.509 certificates and Istiod CA
- Envoy sidecars and SDS
- Mutual TLS with PeerAuthentication
- JWT authentication with RequestAuthentication
- AuthorizationPolicy access control
- istioctl diagnostics
- Kubernetes custom resources

## Sources Consulted
- Istio Security Concepts: https://istio.io/latest/docs/concepts/security/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Ambient data plane: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Diagnose your Configuration with istioctl analyze: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio Understand your Mesh with istioctl describe: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/

## Issues Found
- The certificate lifecycle described Envoy as generating the private key and CSR. Updated it to match Istio's documented flow: the Istio agent creates the private key and CSR, Istiod signs it, Envoy obtains the certificate and key from the agent via SDS, and the agent handles rotation.
- The zero-trust wording implied that no service is trusted or authorized by default. Adjusted it to say Istio supports a zero-trust model, because AuthorizationPolicy defaults to allow when no ALLOW policies apply.
- The RequestAuthentication description said it does not enforce JWTs without noting that invalid JWTs are rejected. Clarified that invalid tokens are rejected, while requests without tokens pass without an authenticated identity unless an AuthorizationPolicy requires one.
- The AuthorizationPolicy description omitted AUDIT and said evaluation starts with DENY. Updated the evaluation order to CUSTOM, DENY, ALLOW, with AUDIT not affecting allow/deny decisions.
- The data-plane enforcement section said all enforcement happens in Envoy sidecars. Qualified this for sidecar mode and noted that ambient mode uses ambient data-plane components such as ztunnel and waypoint proxies.

## Review Notes
The YAML examples use the current `security.istio.io/v1` APIs and valid fields. The `istioctl proxy-config`, `istioctl analyze`, and `istioctl x describe` commands are current in the official command and diagnostic documentation. Local `istioctl` was not installed in this workspace, so CLI validation was performed against official Istio documentation rather than local `--help` output.
