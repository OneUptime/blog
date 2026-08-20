# Validation Summary: Why Headless Services Do Not Load-Balance Requests

## Status
validated

## Post Type
Technical Guide

## Technologies Covered
- Kubernetes Services and headless Services
- Kubernetes EndpointSlices and Pod readiness
- Kubernetes DNS service discovery
- CoreDNS and NodeLocal DNSCache
- DNS A, AAAA, and SRV records
- Client-side load balancing
- Connection pooling and multiplexing
- Retry, deadline, idempotency, and circuit-breaking behavior

## Sources Consulted
- Kubernetes Service and headless Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes virtual IPs and Service proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Service v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes DNS-Based Service Discovery specification: https://github.com/kubernetes/dns/blob/master/docs/specification.md
- Kubernetes EndpointSlice controller port-resolution source: https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/endpointslice/utils.go
- CoreDNS `kubernetes` plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS `loadbalance` plugin documentation: https://coredns.io/plugins/loadbalance/
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/stable/manpages.html#dig-dns-lookup-utility
- RFC 1034, DNS concepts, caching, and TTLs: https://www.rfc-editor.org/rfc/rfc1034.html
- RFC 2308, DNS negative responses and NODATA: https://www.rfc-editor.org/rfc/rfc2308.html
- RFC 2782, DNS SRV records: https://www.rfc-editor.org/rfc/rfc2782.html
- RFC 8767, bounded serving of stale DNS data: https://www.rfc-editor.org/rfc/rfc8767.html
- RFC 9110, HTTP idempotency and retry semantics: https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2
- RFC 9112, HTTP/1.1 persistent connections and retry behavior: https://www.rfc-editor.org/rfc/rfc9112.html
- RFC 9113, HTTP/2 streams and multiplexing: https://www.rfc-editor.org/rfc/rfc9113.html

## Issues Found
- The post said that resolving once could turn a Pod "restart" into a client outage. The kubelet can restart failed containers within an existing Pod; when a workload controller replaces a deleted or irrecoverably failed Pod, the replacement is a different Pod and may have a different IP address. Changed "Pod restart" to "Pod replacement" so the stale-address failure mode is described accurately.
- The post used "an empty RRset" as a DNS refresh outcome. That is not the precise response category: RFC 2308 defines NODATA as a `NOERROR` response with no relevant records in the answer section. Changed the wording to `NOERROR`/`NODATA` (no A or AAAA answers) so it is distinct from `NXDOMAIN`, timeout, and `SERVFAIL`.

## Review Notes
- The Service manifest uses the stable core/v1 API and passed `kubectl create --dry-run=client` with kubectl v1.34.1. The named `targetPort: rpc` is resolved when Kubernetes builds EndpointSlices for the selector-backed Service; selected Pods must therefore declare a TCP container port named `rpc` for the intended SRV port to be published.
- The `dig` syntax and flags are valid. The example names assume the default `cluster.local` cluster domain and access to the cluster DNS service; the cluster domain is configurable.
- The connection-selection, membership refresh, bounded stale-state, pool-draining, retry, deadline, idempotency, and long-lived-connection guidance is technically sound.
- The connection-path diagrams describe the normal/default case. `publishNotReadyAddresses: true` can publish otherwise-not-ready endpoints, and Service proxies have limited traffic-policy-specific fallback behavior for serving-and-terminating endpoints.
- No deprecated Kubernetes APIs or version-specific claims were found.
