# Validation Summary: How to Configure CUSTOM Authorization Action in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio MeshConfig extensionProviders
- Envoy external authorization
- Kubernetes Deployments and Services
- Go HTTP services
- Open Policy Agent (OPA)
- Rego

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio MeshConfig / ExtensionProvider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- OPA-Envoy plugin documentation: https://www.openpolicyagent.org/docs/envoy
- OPA policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- OPA `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- OPA Docker documentation: https://www.openpolicyagent.org/docs/deploy/docker

## Issues Found
- The HTTP external authorizer checked `X-Api-Key`, but the Istio `includeRequestHeadersInCheck` examples did not forward `x-api-key` to the authorizer. Added `x-api-key` to both HTTP provider examples so the authorizer receives the header it validates.
- The Go example imported `strings` without using it, which would prevent the program from compiling. Removed the unused import.
- The HTTP provider used `pathPrefix: "/check"`, which sends authorization checks for `/api/...` to paths like `/check/api/...`. Added a `/check/` handler registration so the sample authorizer handles prefixed subpaths as well as `/check`.
- The OPA deployment registered a Kubernetes service name in Istio, but the Kubernetes example only created a Deployment. Added a matching `Service` for `opa-ext-authz` on port `9191`.
- The Rego policy used pre-Rego v1 rule syntax while the example uses the current `openpolicyagent/opa:latest-envoy` image. Added `import rego.v1` and changed the rules to `allow if { ... }`.
- The failure behavior example used `statusOnError: "200"` and described it as fail-open. In Istio, `statusOnError` controls the status code returned on network error, while `failOpen: true` allows requests when the authorizer fails or returns HTTP 5xx. Replaced the example with `failOpen: true` and corrected the explanation.

## Review Notes
The remaining Istio CUSTOM action explanation, provider references, policy evaluation order, and OPA-Envoy plugin path configuration are consistent with current official documentation. Go tooling was not installed in the review environment, so the Go snippet could not be formatted or compiled locally.
