# Validation Summary: How to Integrate Istio with Open Policy Agent (OPA) for AuthZ

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Open Policy Agent (OPA)
- OPA-Envoy plugin
- Envoy external authorization
- Rego
- Kubernetes Deployments, Services, and ConfigMaps
- Istio AuthorizationPolicy and MeshConfig extension providers

## Sources Consulted
- OPA-Envoy Plugin documentation: https://www.openpolicyagent.org/docs/envoy
- OPA Istio tutorial: https://www.openpolicyagent.org/docs/envoy/tutorial-istio
- OPA Rego token/JWT built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/tokens
- OPA time built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/time
- OPA bundle management documentation: https://www.openpolicyagent.org/docs/management-bundles
- Istio External Authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Docker Hub OPA image variant reference: https://hub.docker.com/r/openpolicyagent/opa

## Issues Found
- The OPA Deployment and bundle examples used `openpolicyagent/opa:latest`, but the Envoy external authorization gRPC server is provided by the Envoy-enabled image variant. Changed the examples to `openpolicyagent/opa:latest-envoy`.
- The Rego example used pre-OPA-1.0 rule syntax. Updated it to Rego v1 style with `import rego.v1`, `:=`, and `if` rule bodies.
- The JWT example manually decoded a token payload and trusted the claims without signature verification. Replaced it with `io.jwt.decode_verify` and an example signing secret placeholder.
- The service-to-service payment rule relied on a custom `x-destination-service` header that Istio/Envoy does not automatically provide. Changed it to use `input.attributes.destination.principal`, which is part of the Envoy authorization check attributes.
- The time-based access rule did not make clear that `time.clock(time.now_ns())` evaluates UTC by default. Updated the comment to state that the example is UTC-based.
- The Istio `envoyExtAuthzGrpc.port` examples used a quoted string even though the MeshConfig field is a numeric port. Changed the examples to use `9191`.
- The introduction mentioned request body authorization without noting that Istio must be configured to buffer and send request bodies to the external authorizer. Added that caveat.

## Review Notes
- The example JWT secret is only a placeholder. Production deployments should use the identity provider's JWKS or public certificate and verify issuer, audience, and token lifetime constraints.
- The examples use `latest-envoy` for readability, but production deployments should pin a tested OPA image tag.
