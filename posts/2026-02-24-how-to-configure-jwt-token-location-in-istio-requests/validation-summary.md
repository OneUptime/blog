# Validation Summary: How to Configure JWT Token Location in Istio Requests

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio RequestAuthentication
- Istio JWT authentication
- Kubernetes custom resources
- kubectl
- curl
- HTTP headers and query parameters

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- RFC 9110 HTTP Semantics: https://httpwg.org/specs/rfc9110.html

## Issues Found
- The post stated that Istio does not have native cookie extraction for JWTs. Current Istio documents `fromCookies` on `JWTRule`, so the cookie section was updated to use `fromCookies` directly.
- The post stated that Istio checks multiple token locations in order and uses the first one containing a token. Istio documents that requests with multiple tokens at different locations are not supported and the output principal is undefined, so the section now says clients should send the token in only one configured location.
- The common mistakes list described header names as case-sensitive. HTTP field names are case-insensitive under RFC 9110, so the wording was changed to "Using the wrong header name."
- The introduction listed only `fromHeaders` and `fromParams`; it was updated to include `fromCookies`.

## Review Notes
The RequestAuthentication manifests use the current `security.istio.io/v1` API and documented fields including `fromHeaders`, `fromParams`, `fromCookies`, `audiences`, and `forwardOriginalToken`. The examples validate JWTs but do not by themselves require authentication for requests without credentials; enforcing that still requires an AuthorizationPolicy using `requestPrincipals`, as documented by Istio.
