# Validation Summary: How to Implement External Authorization with Istio and OPA

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio MeshConfig extension providers
- Istio AuthorizationPolicy with CUSTOM action
- Envoy external authorization (ext_authz)
- Open Policy Agent (OPA)
- OPA-Envoy plugin
- Rego policy language
- Kubernetes Deployments, Services, ConfigMaps, HPA, and PDB
- Prometheus ServiceMonitor

## Sources Consulted
- Istio External Authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- OPA-Envoy plugin documentation: https://www.openpolicyagent.org/docs/envoy
- OPA configuration reference: https://www.openpolicyagent.org/docs/configuration
- OPA HTTP built-in caching documentation: https://www.openpolicyagent.org/docs/policy-reference/builtins/http
- OPA monitoring documentation: https://www.openpolicyagent.org/docs/monitoring
- OPA time built-ins documentation: https://www.openpolicyagent.org/docs/policy-reference/builtins/time
- Envoy ext_authz filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter

## Issues Found
- The Istio `envoyExtAuthzGrpc` example used `includeRequestHeadersInCheck` and `includeAdditionalHeadersInCheck`, but those fields are part of Istio's HTTP external authorization provider, not the gRPC provider. Removed those fields from the gRPC MeshConfig snippet.
- The JWT test created only a base64url-encoded JSON payload, not a signed JWT. Replaced it with a minimal HS256 JWT generation flow using `openssl` and the demo policy's `your-jwt-secret-key` secret.
- The Rego `valid_jwt` rule assigned JWT payload claims locally and described them as stored for later use, but that binding was not visible outside the rule. Removed the misleading local assignment while keeping the validation behavior intact.
- The direct OPA query example assumed the OPA container included `curl`. Changed it to port-forward the OPA service and run `curl` locally.
- The `opa eval` troubleshooting command used a stdin here-doc through `kubectl exec` without `-i`. Added `-i` so the input document is passed to the container.
- The performance section described OPA as caching final authorization decisions by input hash. OPA's documented cache is an inter-query cache for eligible built-in function results, such as cached `http.send` responses. Updated the heading, explanation, diagram, and comments accordingly.
- The monitoring table used non-documented OPA metric names such as `opa_cache_hits_total`. Replaced them with documented OPA metrics and an Envoy ext_authz denied-stat pattern.

## Review Notes
The central OPA service deployment is technically valid, though OPA's documentation often recommends running OPA-Envoy close to Envoy as a sidecar to avoid an extra network hop. The post now states a workable configuration, but production deployments should still validate latency, availability, and failure-mode choices in their own mesh.
