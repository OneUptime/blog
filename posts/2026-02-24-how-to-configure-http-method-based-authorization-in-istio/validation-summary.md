# Validation Summary: How to Configure HTTP Method-Based Authorization in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Kubernetes
- kubectl
- HTTP methods
- JWT authorization claims
- CORS preflight requests
- gRPC over HTTP/2

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio AuthorizationPolicy normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- MDN OPTIONS method reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/OPTIONS
- MDN CORS preflight request glossary: https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request
- RFC 9110 HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110

## Issues Found
- The first example said it allowed only GET requests, but the policy also allowed HEAD and OPTIONS. Updated the wording to describe read-style and preflight requests.
- The access-level example said anyone in the mesh could read, but the YAML only allowed callers from the `my-app` and `frontend` namespaces. Updated the comment and summary sentence to match the policy.
- The path and JWT example used `requestPrincipals` and JWT claim matching without stating that RequestAuthentication must be enabled. Added that assumption to the introductory sentence.
- The admin user path rule used only `/api/users/*`, which does not match `/api/users` itself. Added `/api/users` so the rule matches the described list endpoint as well as nested user paths.
- The DENY example matched HTTP methods without scoping to a port. Istio documents that missing HTTP attributes in DENY policies can match TCP traffic, so the example now scopes the deny rule to port `8080` and the prose describes blocking on the HTTP port.

## Review Notes
The remaining examples use current Istio `security.istio.io/v1` APIs and documented fields including `methods`, `notMethods`, `paths`, `requestPrincipals`, `principals`, `namespaces`, and `request.auth.claims[...]`. The service-account and namespace source examples require mTLS-derived peer identity, which is consistent with Istio mesh usage but may be worth calling out in a future revision.
