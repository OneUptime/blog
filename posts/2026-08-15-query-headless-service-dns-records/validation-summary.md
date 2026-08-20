# Validation Summary: Query Headless Service A, AAAA, and SRV Records with dig

## Status
validated

## Post Type
Technical tutorial and troubleshooting guide

## Technologies Covered
- Kubernetes headless Services (`v1`)
- Kubernetes StatefulSets (`apps/v1`) and stable network identity
- Kubernetes EndpointSlices and IPv4/IPv6 dual-stack discovery
- CoreDNS and the CoreDNS Kubernetes plugin
- DNS A, AAAA, and SRV records
- BIND `dig` and `kubectl`
- YAML Kubernetes manifests

## Sources Consulted
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes Services and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes IPv4/IPv6 dual-stack](https://kubernetes.io/docs/concepts/services-networking/dual-stack/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes StatefulSet stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes DNS debugging](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes `kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Kubernetes DNS-Based Service Discovery specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md)
- [CoreDNS Kubernetes plugin documentation](https://coredns.io/plugins/kubernetes/)
- [CoreDNS SRV generation and de-duplication source](https://github.com/coredns/coredns/blob/master/plugin/backend_lookup.go)
- [CoreDNS Kubernetes endpoint-to-record source](https://github.com/coredns/coredns/blob/master/plugin/kubernetes/kubernetes.go)
- [Kubernetes `agnhost:2.53` Dockerfile](https://github.com/kubernetes/kubernetes/blob/534003da8a5df5d90f1e0c9daaf3bce03a50fecc/test/images/agnhost/Dockerfile)
- [Kubernetes `agnhost:2.53` netexec source](https://github.com/kubernetes/kubernetes/blob/534003da8a5df5d90f1e0c9daaf3bce03a50fecc/test/images/agnhost/netexec/netexec.go)
- [ISC BIND 9 `dig` manual](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- [RFC 2782: A DNS RR for specifying the location of services](https://www.rfc-editor.org/rfc/rfc2782)
- [RFC 2308: Negative Caching of DNS Queries](https://www.rfc-editor.org/rfc/rfc2308)
- [RFC 7766: DNS Transport over TCP](https://www.rfc-editor.org/rfc/rfc7766)

## Issues Found
- The toolbox command referenced `registry.k8s.io/e2e-test-images/dnsutils:1.3`, for which the official registry has no manifest. It was replaced with the available `registry.k8s.io/e2e-test-images/agnhost:2.53`. The exact image installs `bind-tools`, provides `/bin/sh`, and was runtime-checked to contain `dig`.
- The A-record explanation did not state the default readiness filter precisely. It now says that ready endpoints are published by default and documents the `spec.publishNotReadyAddresses: true` exception for controller-generated endpoints.
- The SRV explanation said there was one answer per published endpoint. This is ambiguous for dual-stack endpoints because CoreDNS de-duplicates identical SRV targets across address families. It now describes one answer per backing Pod in the normal case, more generally one per unique target-and-port pair.
- The single SRV example used weight `100`, which is not representative of the shown three-ready-endpoint CoreDNS case. It now uses a representative weight of `33` and explicitly notes that Kubernetes does not prescribe SRV priority or weight and that CoreDNS derives weight from its candidate set.
- The TCP troubleshooting text said to retry over TCP. It now says that `+tcp` forces the query over TCP; BIND `dig` otherwise begins with UDP and automatically retries a response marked truncated over TCP.

## Review Notes
- The Service and StatefulSet manifests use current, non-deprecated API versions. Their selectors and named ports align, and `agnhost netexec --http-port=7000` provides the described TCP listener.
- The commands assume that the `data` namespace already exists.
- The sample Service omits `ipFamilyPolicy`, so it defaults to `SingleStack`. Testing both A and AAAA on a dual-stack cluster requires a Service configured for both families, such as with `PreferDualStack` or `RequireDualStack`.
- The examples use the default `cluster.local` cluster domain; clusters configured with another domain must substitute it in the absolute query names.
