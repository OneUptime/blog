# Validation Summary: Why Selectorless Headless Services Have No DNS Records

## Status

validated

## Post Type

Technical guide / Kubernetes troubleshooting tutorial

## Technologies Covered

- Kubernetes Services and headless Services (`v1`)
- Kubernetes EndpointSlices (`discovery.k8s.io/v1`)
- Selectorless Service discovery and manually managed endpoints
- CoreDNS Kubernetes plugin
- Kubernetes A, AAAA, and SRV DNS records
- IPv4 and IPv6 endpoint addressing
- Endpoint readiness and `publishNotReadyAddresses`
- Kubernetes RBAC and DNS troubleshooting
- `kubectl` custom-column inspection and logs
- BIND `dig`

## Sources Consulted

- [Kubernetes Service concepts](https://kubernetes.io/docs/concepts/services-networking/service/) and [Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/) - verified selector-based and selectorless behavior, headless Service semantics, custom EndpointSlice association, endpoint address restrictions, port requirements, `targetPort`, `publishNotReadyAddresses`, and `ExternalName`.
- [Kubernetes EndpointSlice concepts](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/) and [EndpointSlice v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/) - verified API stability, address families, labels, management identity, ports, endpoint hostnames, readiness conditions, deprecated `FQDN` address type, and slice grouping.
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) and [Kubernetes DNS-Based Service Discovery specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md) - verified Service-name formats, configurable cluster domains, A/AAAA publication, named-port SRV queries, endpoint-specific SRV targets, and readiness behavior.
- [CoreDNS Kubernetes plugin documentation](https://coredns.io/plugins/kubernetes/) - verified the EndpointSlice watch, endpoint hostname selection, default TTL, empty-Service behavior, and the conditional `pods verified` mode.
- [CoreDNS v1.14.6 Kubernetes lookup implementation](https://github.com/coredns/coredns/blob/v1.14.6/plugin/kubernetes/kubernetes.go) and [EndpointSlice conversion](https://github.com/coredns/coredns/blob/v1.14.6/plugin/kubernetes/object/endpoint.go) - verified that headless SRV answers use the matching EndpointSlice port, A/AAAA lookups are not gated by a named-port match, omitted readiness is accepted, and the Pod cache is initialized only for `pods verified`.
- [Kubernetes DNS debugging guide](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/) - verified the CoreDNS ConfigMap/log diagnostics and the standard `system:coredns` ClusterRole permissions.
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) - verified label selectors, YAML and custom-column output, log label selection, and `--tail`.
- [BIND 9.20 `dig` manual](https://bind9.readthedocs.io/en/v9.20.23/manpages.html#dig-dns-lookup-utility) - verified the query-type syntax and `+noall +answer` display options.
- [RFC 3849: IPv6 Address Prefix Reserved for Documentation](https://www.rfc-editor.org/info/rfc3849/) - verified that `2001:db8::/32`, including the example address, is documentation space and is not intended to be routed in production.

## Issues Found

1. The example used the non-default `data` namespace and hard-coded `cluster.local` without stating those prerequisites. Clarified that the namespace must already exist and that `cluster.local` is an assumption; clusters with a different cluster domain must adjust the queries.
2. The post said `Service.spec.ports[].targetPort` identifies the backend port in this headless Service. Kubernetes ignores `targetPort` when `clusterIP: None`; it should be omitted or equal to `port`, while `EndpointSlice.ports[].port` is the concrete backend port. Corrected the three port-field descriptions.
3. The port-alignment explanation could imply that a port name, protocol, or number mismatch suppresses every DNS answer. Clarified that CoreDNS matches EndpointSlice port name and protocol for headless SRV records and returns the EndpointSlice port number, whereas A/AAAA records depend on endpoint addresses and readiness rather than port metadata.
4. The readiness explanation omitted two API semantics: an absent `conditions.ready` value is interpreted as true, and `publishNotReadyAddresses: true` changes the Service contract so endpoint agents treat addresses as ready. Added both details and identified the custom EndpointSlice manager's responsibility.
5. The RBAC statement made Pod list/watch access universally mandatory. For this manual EndpointSlice Service lookup, CoreDNS requires Services, namespaces, and EndpointSlices; a Pod watch is conditional, notably for `pods verified`. Corrected the requirement while retaining the broader permissions granted by the standard `system:coredns` role.

## Review Notes

- Both YAML examples passed client-side decoding with `kubectl` v1.34.1 and use current stable API versions. The manifests intentionally assume that the `data` namespace already exists.
- The EndpointSlice label selectors and field paths used by the custom-column command are valid. The `kubectl get`, ConfigMap inspection, and selector-based `kubectl logs --tail=100` commands use current flags.
- All three `dig` commands are syntactically valid. Because `+noall +answer` hides the response header, an empty display does not distinguish NODATA, NXDOMAIN, and SERVFAIL; removing those display filters can help during deeper troubleshooting.
- EndpointSlice `conditions.ready` is optional and an omitted value is interpreted as true. Explicitly setting it in a manually managed slice, as the post does, makes the manager's intent clear.
- `addressType: FQDN` remains deprecated with no defined proxying semantics. The legacy Endpoints API and EndpointSlice mirroring are also deprecated; directly creating EndpointSlices is the current recommendation for selectorless Services.
- Every external link in the post resolved to its intended official documentation page during validation.
