# Validation Summary: How to Use Gatekeeper External Data Provider for Dynamic Policy Decisions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- OPA Gatekeeper
- Gatekeeper External Data Providers
- Rego policies
- Go HTTP services
- Docker
- Prometheus client metrics

## Sources Consulted
- Gatekeeper External Data documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/externaldata/
- Gatekeeper dummy external data provider implementation: https://github.com/open-policy-agent/gatekeeper/blob/master/test/externaldata/dummy-provider/provider.go
- Gatekeeper dummy external data policy template: https://github.com/open-policy-agent/gatekeeper/blob/master/test/externaldata/dummy-provider/policy/template.yaml
- Gatekeeper Runtime Flags documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags
- Ratify Gatekeeper policy authoring documentation for the Rego response object shape: https://ratify.dev/docs/quickstarts/gatekeeper-policy-authoring
- Kubernetes Deployment and Service concepts: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ and https://kubernetes.io/docs/concepts/services-networking/service/
- Prometheus Go client package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus

## Issues Found
- The provider API version used `externaldata.gatekeeper.sh/v1alpha1`, while current Gatekeeper documentation lists the Provider API as `externaldata.gatekeeper.sh/v1beta1`. Updated the Provider manifests and example request/response payloads to `v1beta1`.
- The Go provider used a simplified request body of `{"keys": [...]}` and response body of `{"responses": [...]}`. Gatekeeper sends a nested `ProviderRequest` with `apiVersion`, `kind`, and `request.keys`, and expects a nested `ProviderResponse` with `response.items` and optional `response.systemError`. Updated the Go structs, handler loop, and curl example accordingly.
- The Rego examples treated `external_data` as returning a map addressable as `response[image]`. Gatekeeper exposes provider results through response fields such as `responses`, `errors`, and `system_error`. Updated the Rego examples to read matching entries from `response.responses`, check `response.errors`, and handle `response.system_error`.
- Current Gatekeeper documentation states that TLS or mTLS is required for external data providers starting with Gatekeeper v3.11. Updated Provider URLs to HTTPS, added `caBundle` placeholders, and adjusted the deployment/service example to expose a TLS port backed by a mounted certificate secret while keeping the HTTP port for local testing.

## Review Notes
Gatekeeper has its own external data provider response cache starting with v3.13, configurable with `--external-data-provider-response-cache-ttl`; the provider-side cache shown in the post is still a valid application-level optimization. Local `go` and `opa` binaries were not available in the workspace, so snippet validation was performed by static review against official documentation rather than local compilation or Rego parsing.
