# Validation Summary: Keep Terminating Pod IPs Out of Headless Service Clients

## Status

validated

## Post Type

Technical guide / operational troubleshooting guide

## Technologies Covered

- Kubernetes Services, including headless and ClusterIP Services
- Kubernetes EndpointSlice (`discovery.k8s.io/v1`) conditions
- Pod readiness, graceful termination, lifecycle hooks, and stop signals
- Kubernetes cluster DNS, CoreDNS, and NodeLocal DNSCache
- DNS A/AAAA records, TTLs, and positive/negative caching
- Client connection pools, connection draining, and bounded retries
- `kubectl`, JSONPath, `watch`, and `dig`

## Sources Consulted

- Kubernetes EndpointSlice conditions: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions
- Kubernetes EndpointSlice v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes EndpointSlice controller condition calculation: https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/endpointslice/utils.go
- Kubernetes Service and headless Service behavior: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes Service v1 API reference (`publishNotReadyAddresses`): https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Pod lifecycle, termination flow, and stop signals: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination
- Kubernetes container lifecycle hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes Pod and endpoint termination tutorial: https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/
- Kubernetes DNS records for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes DNS-Based Service Discovery specification: https://github.com/kubernetes/dns/blob/master/docs/specification.md
- Kubernetes NodeLocal DNSCache: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes virtual IP and terminating-endpoint behavior: https://kubernetes.io/docs/reference/networking/virtual-ips/#traffic-to-terminating-endpoints
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- CoreDNS Kubernetes and cache plugins: https://coredns.io/plugins/kubernetes/ and https://coredns.io/plugins/cache/
- RFC 1035, DNS TTL and RRset semantics: https://www.rfc-editor.org/rfc/rfc1035.html
- RFC 2308, DNS negative caching: https://www.rfc-editor.org/rfc/rfc2308.html
- RFC 9293, TCP: https://www.rfc-editor.org/rfc/rfc9293.html

## Issues Found

1. **The opening description overgeneralized terminating-endpoint handling.** It said the `ready` condition becomes false and consumers avoid the endpoint without accounting for `publishNotReadyAddresses` or the documented kube-proxy fallback for some terminating local endpoints. The text now states that `publishNotReadyAddresses` is disabled and that ordinary Service consumers *normally* avoid the endpoint.

2. **The shutdown guidance assumed Kubernetes always sends `SIGTERM`.** A container runtime can honor an image's `STOPSIGNAL`, and Kubernetes can also configure a container stop signal. The guidance now says the application must handle its configured stop signal, with `SIGTERM` identified as the default.

3. **The observation command could miss the entire termination window.** `kubectl delete` uses `--wait=true` by default, so the following `watch` command would normally start only after the Pod was gone. Added `--wait=false` so deletion returns immediately and the watch can observe the terminating EndpointSlice state.

## Review Notes

- The Service manifest and partial Pod-spec YAML use current, non-deprecated fields and are structurally valid. The placeholder image, readiness endpoint, and drain command are explicitly identified as placeholders.
- The EndpointSlice JSONPath expression and all `kubectl` resource names, selectors, and output flags are valid. The five documentation links in the post resolve to the intended official Kubernetes pages.
- EndpointSlice `serving` and `terminating` conditions are stable from Kubernetes 1.26; kube-proxy's `ProxyTerminatingEndpoints` behavior is stable from Kubernetes 1.28.
- The DNS loop intentionally demonstrates an A-record query. IPv6 or dual-stack testing should also query AAAA, and clusters with a custom cluster domain should replace `cluster.local`.
- `watch` is an external utility commonly available on Linux but is not bundled with `kubectl` and may need to be installed on other platforms.
