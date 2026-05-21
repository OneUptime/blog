# Validation Summary: How to Handle Dynamic Authorization Policies in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio meshConfig extensionProviders
- Envoy External Authorization gRPC API
- Kubernetes ConfigMaps, Services, Deployments, and kubectl
- Go gRPC service implementation
- Redis
- Open Policy Agent (OPA) and OPA-Envoy
- Rego

## Sources Consulted
- Istio External Authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio meshConfig extensionProviders reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy External Authorization proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/service/auth/v3/external_auth.proto
- Envoy go-control-plane auth/v3 package docs: https://pkg.go.dev/github.com/envoyproxy/go-control-plane/envoy/service/auth/v3
- OPA-Envoy plugin docs: https://www.openpolicyagent.org/docs/envoy
- OPA Istio tutorial: https://www.openpolicyagent.org/docs/envoy/tutorial-istio
- OPA Docker image documentation: https://hub.docker.com/r/openpolicyagent/opa

## Issues Found
- The OPA section referred to OPA/Gatekeeper and deployed the standard `openpolicyagent/opa:latest` image. That image does not expose Envoy's External Authorization gRPC API by default, and Gatekeeper is an admission control project rather than Istio's runtime request authorizer. Changed the section to OPA-Envoy, used `openpolicyagent/opa:latest-envoy`, added the OPA-Envoy plugin config, exposed port `9191`, and added a Service so Istio can reach the authorizer.
- The OPA example mounted `/policies` but did not pass the policy file path to `opa run`. Added `/policies/policy.rego` to the OPA arguments.
- The Rego examples used pre-OPA-v1 rule syntax. Updated the rules to `allow if { ... }`, matching current OPA examples.
- The OPA section said policies are pushed to the OPA server as bundles. Updated the wording to say bundles are published for OPA to download, which matches OPA's bundle model.
- The Go ext_authz example implemented the service without embedding `UnimplementedAuthorizationServer`, despite current generated gRPC guidance recommending it for forward compatibility. Added the embedded type.
- The Go example accessed protobuf fields directly and could panic on missing attributes. Switched to generated getter methods for `Attributes`, `Source`, `Principal`, and HTTP path.
- The latency section labeled `statusOnError` as caching, but that field configures error response behavior. Renamed the item and quoted `"403"` because Istio documents `statusOnError` as a string.

## Review Notes
- The post remains a conceptual guide and does not include complete production manifests for every dependency, such as Redis or the custom Go authorizer Deployment and Service.
- The OPA image uses a floating `latest-envoy` tag for brevity. Production deployments should pin an OPA versioned `-envoy` tag.
