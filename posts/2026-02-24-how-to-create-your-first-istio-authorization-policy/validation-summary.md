# Validation Summary: How to Create Your First Istio Authorization Policy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio AuthorizationPolicy
- Kubernetes
- Envoy sidecars
- istioctl
- kubectl
- Mutual TLS
- JWT request authentication

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio 1.24 httpbin sample manifest: https://raw.githubusercontent.com/istio/istio/release-1.24/samples/httpbin/httpbin.yaml
- Istio 1.24 sleep sample manifest: https://raw.githubusercontent.com/istio/istio/release-1.24/samples/sleep/sleep.yaml

## Issues Found
- The action description omitted `AUDIT`, which is a supported AuthorizationPolicy action. Updated the list to include `AUDIT`.
- The prerequisites did not explicitly mention mutual TLS, even though later examples rely on source principals and namespaces derived from peer certificates. Updated the prerequisite to require mutual TLS.
- The source field example noted that `principals` require mTLS but did not note the same for `namespaces`. Added that caveat.
- Step 4 changed the policy name from `httpbin-allow-get` to `httpbin-allow-sleep` while telling the reader to update and reapply the same file. That would create a second policy and leave the earlier broad GET allow policy active. Changed the Step 4 manifest to keep the same policy name so the existing policy is updated.
- The authenticated endpoint pattern used `requestPrincipals` without noting that JWT request identities require RequestAuthentication. Added that caveat in the example comment.

## Review Notes
The Istio 1.24 sample manifest URLs are valid and define the expected `httpbin` and `sleep` service accounts, service labels, and `httpbin` service port. The `istioctl proxy-config listener deploy/httpbin -n authz-demo` command form is supported by the current istioctl reference for deployment targets.
