# Validation Summary: Why Istio Cannot Route Directly from One VirtualService to Another—and What to Model Instead

## Status
validated

## Post Type
Technical guide and troubleshooting reference.

## Technologies Covered
- Istio VirtualService, HTTP delegation, DestinationRule, ServiceEntry, and gateways
- Kubernetes Services, Pod labels, namespaces, and kubectl
- Envoy routes, clusters, endpoints, access logs, connection pools, and tracing
- HTTP redirects, rewrites, and direct responses
- YAML and istioctl commands

## Sources Consulted
- [Istio Virtual Service reference](https://istio.io/latest/docs/reference/config/networking/virtual-service/): destination identity, delegation example and restrictions, matching, redirects, rewrites, and direct responses.
- [Istio Traffic Management concepts](https://istio.io/latest/docs/concepts/traffic-management/): service registry and routing model.
- [Istio Destination Rule reference](https://istio.io/latest/docs/reference/config/networking/destination-rule/): subsets and endpoint labels.
- [Istio Service Entry reference](https://istio.io/latest/docs/reference/config/networking/service-entry/): registry entries, resolution, ports, and visibility.
- [Istio Egress Gateways](https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/): mesh and gateway routing legs and gateway Service destinations.
- [Istio Configuration Scoping](https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/): configuration visibility.
- [Istio Traffic Management Best Practices](https://istio.io/latest/docs/ops/best-practices/traffic-management/): merging resources and undefined ordering across fragments.
- [Istio Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/): effective proxy configuration and synchronization.
- [istioctl command reference](https://istio.io/latest/docs/reference/commands/istioctl/): analyze, proxy-status, proxy-config aliases, resource arguments, output formats, and filters.
- [Istio ReferencedResourceNotFound](https://istio.io/latest/docs/reference/config/analysis/ist0101/): missing resource diagnostics.
- [Kubernetes kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/): resource queries and server-side dry-run.
- [Envoy Substitution Formatter](https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html): NR, NC, and UH response flags.
- [Envoy Connection pooling](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/connection_pooling): connection reuse and multiplexing.
- [Istio Distributed Tracing overview](https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/): tracing providers, configuration, and sampling.
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html): redirect responses and client behavior.

## Issues Found
1. **Incomplete NR interpretation.** The post described NR only as a missing HTTP route. Added the missing listener filter-chain case, which Envoy also reports with NR and is relevant when troubleshooting gateways.
2. **Dry-run versus live proxy inspection.** The candidate validation commands moved directly from server-side dry-run to inspecting a running gateway. Added a comment making actual application in a test cluster and proxy synchronization prerequisites for that inspection. Dry-run does not persist resources or update Envoy.
3. **Unconditional observability claims.** The post claimed a gateway hop produces two spans and two upstream connections. Replaced that with two routing stages and upstream legs for the illustrated path, noting connection reuse and tracing configuration/sampling. Also qualified the second request after a redirect: it occurs only if the client follows the response.

## Review Notes
- The central distinction between a VirtualService object and a service destination is correct. The intentionally invalid opening example is invalid as an attempt to reference another rule object; the same hostname could legitimately identify a separately registered service.
- Reviewed YAML fields and indentation against the current official API examples. The networking.istio.io/v1 resources are current. Several snippets are intentionally fragments, not standalone apply-ready manifests.
- The delegate fallback with no explicit match is consistent with Istio's official delegation example; it remains constrained by the root match. Deployment requires the referenced Gateway, orders Service, v1/v2 DestinationRule subsets, matching endpoints, and cross-namespace visibility. The billing example likewise assumes its Service exposes port 8080.
- Host-fragment merging is supported for ingress gateways, not general sidecar host composition. Cross-resource ordering is undefined; a route dump should not be treated as a guarantee of stable ordering across conflicting fragments.
- Verified command forms and flags against official references. Pod names, namespaces, candidate directory, cluster domain, service port, and cluster names must match the reader's environment.
- All seven technical documentation links in the post resolve to the intended official resources. The author profile link is plausible and is not technical evidence.
- Validation was documentation-based. No live Kubernetes resources were applied, no istioctl runtime checks were executed, and no end-to-end requests were sent. Runtime behavior still requires the post's proxy and request checks in a configured test environment.
- Kept the post's sections, examples, and writing style intact; changes were limited to technical corrections.
