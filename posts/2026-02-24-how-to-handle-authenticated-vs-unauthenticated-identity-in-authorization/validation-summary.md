# Validation Summary: How to Handle Authenticated vs Unauthenticated Identity in Authorization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio PeerAuthentication and mTLS
- JWT authentication
- Envoy access logs
- Kubernetes kubectl logs

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio JWT authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy access log command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- The debugging section described `%DOWNSTREAM_PEER_SUBJECT%` and `%REQ(X-Forwarded-Client-Cert)%` as a way to see JWT request-level identity. Those fields expose peer certificate or forwarded client certificate information, not JWT request principals. Updated the text to use `%DOWNSTREAM_PEER_URI_SAN%` for peer certificate identity and to recommend `outputPayloadToHeader` or `outputClaimToHeaders` when JWT details need to be logged.
- The unauthenticated traffic example mentioned external traffic "coming through the ingress gateway", which could be read as traffic from the gateway to a backend service lacking peer identity. Updated the wording to say unauthenticated external traffic at an ingress gateway, because backend traffic from an Istio ingress gateway can have the gateway workload identity.

## Review Notes
The AuthorizationPolicy, RequestAuthentication, and PeerAuthentication snippets use current `security.istio.io/v1` APIs and match Istio's documented ALLOW-policy, principal, request principal, wildcard presence-match, and permissive/strict mTLS behavior. `istioctl proxy-config secret <pod-name> -n default` is a valid command form according to the current istioctl reference, though `istioctl` was not installed in the local environment for live CLI execution.
