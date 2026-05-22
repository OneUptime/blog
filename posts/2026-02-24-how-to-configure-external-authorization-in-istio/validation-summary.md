# Validation Summary: How to Configure External Authorization in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio MeshConfig extension providers
- Envoy ext_authz filter
- Kubernetes Deployments, Services, probes, and HPAs
- Python Flask
- Open Policy Agent (OPA) and Rego

## Sources Consulted
- Istio External Authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy ext_authz API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ext_authz/v3/ext_authz.proto.html
- Envoy ext_authz filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter.html
- OPA-Envoy plugin documentation: https://www.openpolicyagent.org/docs/envoy
- OPA Envoy policy primer: https://www.openpolicyagent.org/docs/envoy/primer
- OPA JWT token verification reference: https://www.openpolicyagent.org/docs/policy-reference/builtins/tokens
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The Flask authorizer only registered `/authz`, but the Istio HTTP provider example sets `pathPrefix: "/authz"`, which makes Envoy send authorization checks to the prefixed original path. Updated the Flask routes to handle both `/authz` and `/authz/<path:original_path>`.
- The Flask sample tried to read `X-Forwarded-Method` and `X-Forwarded-Uri`, which are not the core Envoy ext_authz HTTP request fields. Updated it to use the check request method and the route-captured path derived from the configured prefix.
- The Kubernetes Deployment used readiness and liveness probes for `/healthz`, but the Flask app did not implement `/healthz`. Added a minimal health endpoint returning HTTP 200.
- The OPA example decoded JWTs with `io.jwt.decode` and then trusted the claims. OPA documentation states JWTs must be verified before claims are trusted. Updated the policy to use `io.jwt.decode_verify` with a verification key loaded from OPA data.

## Review Notes
- The Istio `CUSTOM`, `DENY`, and `ALLOW` evaluation order in the post matches the official Istio AuthorizationPolicy reference.
- The Istio extension provider fields used in the examples match the current MeshConfig reference.
- Could not run `opa`, `kubectl`, or `yamllint` locally because those executables are not installed in this environment. The edited Python snippet was syntax-checked with `python3`.
