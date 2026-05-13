# Validation Summary: How to Configure Consul Intentions with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Consul service mesh
- Consul ServiceIntentions CRD
- Kubernetes
- Flux CD v2
- Kustomize
- Envoy sidecar proxies
- Prometheus scraping through service mesh intentions

## Sources Consulted
- HashiCorp Consul service intentions configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- HashiCorp Consul create and manage service intentions documentation: https://developer.hashicorp.com/consul/docs/secure-mesh/intention/create
- HashiCorp Consul service mesh intentions overview: https://developer.hashicorp.com/consul/docs/secure-mesh/intention
- HashiCorp Consul intention CLI command documentation: https://developer.hashicorp.com/consul/commands/intention
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux reconcile kustomization command documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The introduction said the guide covered both legacy config entries and the modern CRD-based approach, but the post only uses the Kubernetes `ServiceIntentions` CRD. Updated the wording to match the actual content.
- The prerequisites said Consul ACLs are required for intention enforcement. HashiCorp documents TLS/mTLS as required for L4 intention enforcement, while ACLs govern management permissions and default behavior when enabled. Updated the prerequisite to mention service mesh mTLS.
- The Prometheus example used `destination.name: "*"` together with L7 HTTP `permissions`. Consul does not support L7 permissions with wildcard destinations. Changed the example to a concrete `api-service` destination and added a note to repeat the pattern per destination service.
- The denied connection test said the request should fail with "Connection refused". Intention denial is more accurately surfaced as an upstream authorization or proxy error, depending on protocol and proxy behavior. Updated the expected wording.
- The best-practices bullet for Prometheus implied a single wildcard L7 intention could cover all services. Updated it to recommend per-service `/metrics` intentions.

## Review Notes
The Consul `ServiceIntentions` API version and field names used by the corrected examples match current HashiCorp documentation. The Flux `Kustomization` resource and `flux reconcile kustomization` command are current. The `consul intention list` command is still documented, but HashiCorp marks the broader `consul intention` command group as deprecated for managing intentions in favor of service-intentions config entries; using it only for listing during validation is acceptable.
