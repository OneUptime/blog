# Validation Summary: How Dual-Stack Headless Services Publish A and AAAA Records

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes IPv4/IPv6 dual-stack networking
- Kubernetes headless Services and Service IP-family policies
- Kubernetes EndpointSlices (`discovery.k8s.io/v1`)
- Kubernetes DNS and CoreDNS A/AAAA record publication
- Kubernetes Deployments, StatefulSets, and Pod readiness
- `kubectl` JSONPath and custom-column output
- BIND `dig` and `curl` family-specific connectivity tests

## Sources Consulted

- [Kubernetes: IPv4/IPv6 dual-stack](https://kubernetes.io/docs/concepts/services-networking/dual-stack/)
- [Kubernetes: Headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes: DNS A/AAAA records for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#a-aaaa-records)
- [Kubernetes DNS-Based Service Discovery specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md#24---records-for-a-headless-service)
- [CoreDNS Kubernetes plugin documentation](https://coredns.io/plugins/kubernetes/)
- [Kubernetes: EndpointSlice address types](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#address-types)
- [Kubernetes EndpointSlice v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes: Validate IPv4/IPv6 dual-stack](https://kubernetes.io/docs/tasks/network/validate-dual-stack/)
- [Kubernetes StatefulSet stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes readiness probe documentation](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/)
- [Kubernetes `kubectl` JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes v1.36.4 API-server Service IP-family allocation source](https://github.com/kubernetes/kubernetes/blob/v1.36.4/pkg/registry/core/service/storage/alloc.go#L232-L275)
- [Kubernetes v1.36.4 headless Service IP-family update validation](https://github.com/kubernetes/kubernetes/blob/v1.36.4/pkg/apis/core/validation/validation.go#L9260-L9273) and [validation tests](https://github.com/kubernetes/kubernetes/blob/v1.36.4/pkg/apis/core/validation/validation_test.go#L20419-L20465)
- [Kubernetes `agnhost:2.53` Dockerfile](https://github.com/kubernetes/kubernetes/blob/534003da8a5df5d90f1e0c9daaf3bce03a50fecc/test/images/agnhost/Dockerfile) and [`netexec` implementation](https://github.com/kubernetes/kubernetes/blob/534003da8a5df5d90f1e0c9daaf3bce03a50fecc/test/images/agnhost/netexec/netexec.go)
- [BIND 9 `dig` manual](https://bind9.readthedocs.io/en/v9.20.23/manpages.html#dig-dns-lookup-utility)
- [`curl` command-line manual](https://curl.se/docs/manpage.html)

## Issues Found

- The `RequireDualStack` and `PreferDualStack` behavior was stated without the selectorless-headless exception. Narrowed the statement to the selector-based Service shown in the post and documented that a selectorless headless Service can carry both `ipFamilies` even when the cluster has only one configured Service family, because its endpoints are managed independently.
- The post said that the primary family of every existing Service is immutable. Kubernetes API-server validation deliberately permits headless Services to change their `ipFamilies`, including their order, because no family-specific VIP is allocated. Limited the immutability statement to Services with allocated ClusterIPs and documented the headless exception.
- The selectorless guidance could be read as requiring both IPv4 and IPv6 EndpointSlices even when `SingleStack` was selected. Clarified that separate manually managed slices for each family are required when publishing both families.

## Review Notes

- The Service and Deployment YAML passed client-side parsing with `kubectl` v1.34.1. The current `v1` Service, `apps/v1` Deployment, named target port, and TCP readiness probe fields are valid.
- The `registry.k8s.io/e2e-test-images/agnhost:2.53` tag still resolves, its entry point is `/agnhost`, and `netexec --http-port=8080` is valid. `agnhost` is an upstream test image rather than a production application image.
- The JSONPath expressions, EndpointSlice label/custom columns, `dig` invocations, and `curl -4`/`curl -6` flags are valid. All links in the post resolve; the original Service API URL redirects to the current canonical URL.
- The examples assume that the `apps` namespace already exists and that `<pod-name>` is replaced with a real Pod name.
- Actual A/AAAA publication and IPv4/IPv6 reachability remain dependent on the cluster, CNI, Pod addresses, routing, readiness, policy, and application listeners, as the post states.
