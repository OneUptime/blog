# Validation Summary: How to Test Istio Security Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mutual TLS
- Istio RequestAuthentication and JWT validation
- Kubernetes namespaces, service accounts, deployments, pods, and kubectl commands
- curl-based HTTP status testing

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The RequestAuthentication section said the initial RequestAuthentication policy "requires a valid JWT." Istio RequestAuthentication rejects invalid credentials but accepts requests with no credentials unless paired with an authorization policy. Changed the wording to say it validates JWTs when present.
- The JWT test assumed a request without a token would fail after adding a `require-jwt` ALLOW policy, but the earlier `allow-client-a-only` ALLOW policy would still allow `client-a` because Istio ALLOW policies are additive. Added a `kubectl delete authorizationpolicy allow-client-a-only -n security-test` step before applying the JWT-required policy.
- The default-deny test assumed an empty-spec ALLOW policy would block all traffic while previous ALLOW policies still existed. Since any matching ALLOW policy can still allow the request, added a cleanup command to delete the prior `require-jwt` policy before applying the default-deny policy.

## Review Notes
- `kubectl` is not installed in the local workspace, so CLI syntax was checked against official Kubernetes generated command references rather than local `--help` output.
- The DENY example is correct for HTTP traffic. Istio documentation recommends scoping DENY policies that use HTTP attributes to specific ports when TCP traffic may also reach the selected workload, because missing HTTP attributes in DENY rules are treated as matches.
