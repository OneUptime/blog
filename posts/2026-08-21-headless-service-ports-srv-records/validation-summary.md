# Validation Summary: How Named Ports Produce Headless Service SRV Records

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes headless Services and named Service ports
- Kubernetes StatefulSets and stable Pod network identities
- Kubernetes EndpointSlices and named `targetPort` resolution
- DNS A, AAAA, and SRV records
- CoreDNS Kubernetes plugin
- `kubectl`, JSONPath, and `dig`

## Sources Consulted

- [Kubernetes: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#services)
- [Kubernetes DNS-Based Service Discovery specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md)
- [RFC 2782: A DNS RR for specifying the location of services](https://www.rfc-editor.org/rfc/rfc2782.html)
- [Kubernetes: Service port definitions and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes v1.36.2 EndpointSlice port-resolution source](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/endpointslice/utils.go)
- [Kubernetes: StatefulSet stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes: Job with Pod-to-Pod Communication](https://kubernetes.io/docs/tasks/job/job-with-pod-to-pod-communication/)
- [Kubernetes `agnhost` `netexec` implementation](https://github.com/kubernetes/kubernetes/blob/master/test/images/agnhost/netexec/netexec.go)
- [CoreDNS Kubernetes plugin documentation](https://coredns.io/plugins/kubernetes/)
- [CoreDNS v1.14.7 Kubernetes service lookup implementation](https://github.com/coredns/coredns/blob/v1.14.7/plugin/kubernetes/kubernetes.go)
- [CoreDNS v1.14.7 EndpointSlice conversion implementation](https://github.com/coredns/coredns/blob/v1.14.7/plugin/kubernetes/object/endpoint.go)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [BIND 9 `dig` manual](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)

## Issues Found

No technical issues found.

## Review Notes

- The complete YAML examples decode successfully with `kubectl` client-side dry runs and use current, stable APIs: `v1`, `apps/v1`, and `discovery.k8s.io/v1`.
- The `kubectl` JSONPath expression was exercised successfully, the `dig` syntax is valid, the `registry.k8s.io/e2e-test-images/agnhost:2.53` image exists, and `netexec --http-port=7000` is a supported invocation.
- Kubernetes' published DNS specification describes the headless SRV port using the named Service port number. Current Kubernetes v1.36.2 resolves a named `targetPort` into EndpointSlice ports, and current CoreDNS v1.14.7 uses those EndpointSlice ports for headless SRV answers while using Service ports for ClusterIP SRV answers. The post accurately identifies this implementation-specific distinction and appropriately recommends keeping the values equal for portability or verifying the deployed DNS implementation.
- Current CoreDNS can synthesize an IP-derived SRV target when an EndpointSlice has no explicit hostname. The post's hostname diagnostic remains appropriate when checking for the expected stable StatefulSet target shown in the example.
- The `grpc` and multi-port excerpts are partial configuration examples; selected Pods must expose the referenced named target ports for those EndpointSlice ports and SRV answers to be populated.
