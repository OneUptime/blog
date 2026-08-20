# Validation Summary: Handle DNS Caching During Headless Service Rolls

## Status

validated

## Post Type

Operational Guide / Reference

## Technologies Covered

- Kubernetes headless Services
- StatefulSets and Pod DNS identity
- EndpointSlices and endpoint conditions
- CoreDNS `kubernetes`, `cache`, and `prometheus` plugins
- NodeLocal DNSCache
- DNS TTLs, positive caching, and negative caching
- `kubectl` and `dig`
- Rolling updates, readiness, connection draining, and connection pools

## Sources Consulted

- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes StatefulSets: stable network identity and negative caching](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes EndpointSlice API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes Pod and EndpointSlice termination flow](https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/)
- [Kubernetes NodeLocal DNSCache](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/)
- [Kubernetes DNS debugging](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes API watch semantics](https://kubernetes.io/docs/reference/using-api/api-concepts/#efficient-detection-of-changes)
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes `kubectl exec` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [CoreDNS `kubernetes` plugin](https://coredns.io/plugins/kubernetes/)
- [CoreDNS `cache` plugin](https://coredns.io/plugins/cache/)
- [CoreDNS `prometheus` plugin](https://coredns.io/plugins/metrics/)
- [BIND 9 `dig` reference](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- [RFC 1035: DNS implementation and TTL semantics](https://www.rfc-editor.org/rfc/rfc1035.html)
- [RFC 2308: DNS negative caching](https://www.rfc-editor.org/rfc/rfc2308.html)

## Issues Found

- The first DNS queries were described as measuring an authoritative answer even though a Pod's configured resolver can traverse application, node-local, and central caches. I renamed the section to describe the result as client-visible and clarified that deployed Corefiles plus observations from each path determine effective behavior.
- NodeLocal DNSCache detection depended too heavily on the nameserver shown in `/etc/resolv.conf`. In kube-proxy's iptables mode, `node-local-dns` listens on both its local address and the `kube-dns` Service IP, so the resolver file can still show the Service IP. I changed the guidance to check the DaemonSet and ConfigMap directly.
- The negative-caching example used an abbreviated, non-literal DNS name and said the cached failure could persist after the Pod starts. By default, a StatefulSet Pod is not published in DNS until it is Ready. I supplied a complete example FQDN and changed the convergence point to DNS eligibility, normally Pod readiness.
- The API-watch paragraph implied that every watch requires EndpointSlice aggregation. I separated the general RBAC, reconnection, and resource-version responsibilities from the aggregation and deduplication required specifically by EndpointSlice consumers.
- The termination paragraph stated unconditionally that a deleted Pod's EndpointSlice endpoint becomes `ready: false`. The EndpointSlice controller makes `ready` true when `publishNotReadyAddresses` is enabled, including while an endpoint is terminating. I scoped the behavior to selector-backed Services using the default `publishNotReadyAddresses: false` and clarified the consequence of enabling the field on readiness-gated client discovery.
- The post stated that cache refreshes are asynchronous. Ordinary CoreDNS cache refresh after expiry is request-driven, while background behavior applies to options such as prefetch and immediate stale serving. I changed the statement to the accurate rollout concern: expirations and refreshes are not synchronized across layers or clients.
- The EndpointSlice watch used the default table output, which does not show `ready`, `serving`, or `terminating` conditions. I added YAML output so the endpoint state discussed in the post is visible during the watch.
- Querying the `kube-dns` Service IP was presented as a direct central-DNS measurement. In kube-proxy's iptables mode that IP can still be handled by NodeLocal DNSCache, and a bare local `dig` may not be able to route to a cluster address. I changed the example to obtain a central DNS backend from the `kube-dns` EndpointSlices and run `dig` inside a routable Pod, with a note to test every ready central endpoint because replicas have independent caches.
- The metrics paragraph did not state that CoreDNS plugin metrics require monitoring to be enabled. I added the `prometheus` plugin condition.

## Review Notes

- The example names assume the default `cluster.local` cluster domain, a `data` namespace, a `members` Service, and an `app-0` Pod with `dig` installed. Clusters with different names, domains, containers, or network policies must substitute appropriate values and ensure the test Pod can reach CoreDNS Pod IPs.
- `dig +noall +answer` shows positive answer TTLs but not an NXDOMAIN negative TTL, which is carried in the SOA record in the authority section. Denial-cache timing should also be checked from the CoreDNS configuration or with authority-section output.
- The CoreDNS DNS programming metric currently does not support the `headless_without_selector` service kind. The rollout described by the post is framed around selector-backed Pods, so this does not invalidate the guidance.
- All external documentation links in the post resolved to the intended current official pages during review.
