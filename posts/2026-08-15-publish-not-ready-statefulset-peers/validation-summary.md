# Validation Summary: Publish StatefulSet Peers Before They Are Ready

## Status

validated

## Post Type

Technical guide / Kubernetes configuration tutorial

## Technologies Covered

- Kubernetes Services and headless Services
- Kubernetes StatefulSets (`apps/v1`)
- `publishNotReadyAddresses`
- EndpointSlices and endpoint conditions
- Kubernetes DNS, CoreDNS, and A, AAAA, and SRV records
- Readiness probes
- NetworkPolicy
- `kubectl`, JSONPath, and `dig`

## Sources Consulted

- [Kubernetes Service API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes Service concepts, including named target ports and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlice conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes StatefulSets, including stable network identity, ordinals, Pod management policies, rolling updates, and DNS caching](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes StatefulSet API reference](https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/)
- [Kubernetes readiness probe documentation](https://kubernetes.io/docs/concepts/workloads/pods/probes/#readiness-probe)
- [Kubernetes NetworkPolicy documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes JSONPath support for kubectl](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes DNS debugging guidance](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [ISC BIND 9 command reference for dig](https://bind9.readthedocs.io/en/stable/manpages.html)

## Issues Found

- The introduction incorrectly generalized readiness-filtered DNS publication to all Services. A normal ClusterIP Service's A or AAAA record resolves to the Service cluster IP regardless of backend readiness; endpoint-address publication applies to headless Service DNS. The sentence now explicitly refers to a headless Service.
- The StatefulSet used the default `OrderedReady` Pod management policy. That policy waits for each lower-ordinal Pod to become Ready before creating the next one, so a readiness check that requires a quorum could still deadlock before the other replicas existed. Added `podManagementPolicy: Parallel` and explained why it is required for the illustrated bootstrap pattern.
- The client Service used `targetPort: client`, but the Pod template had no container port with that name. Changed it to the numeric `targetPort: 8080`, which does not require named-port resolution.
- The DNS instructions referred ambiguously to a "cluster-DNS Pod," which could be read as a CoreDNS or kube-dns Pod that may not contain `dig`. Changed this to a diagnostic Pod that uses cluster DNS and has `dig` installed.
- The seed and query FQDNs hard-coded `cluster.local`, and the verification commands queried only IPv4 A records. Added caveats that `cluster.local` is the default but configurable cluster domain and that IPv6-only Services require AAAA queries.
- The client Service description implied that only ready, non-terminating endpoints can ever receive traffic. Kubernetes Service proxies may use serving, terminating endpoints when every available endpoint is terminating. Changed this to the accurate phrase "normal readiness-aware routing behavior."
- The security advice said to "expose" only the peer port on the headless Service, which could imply access control. A headless Service publishes Pod IPs directly and its port list is not a firewall. Changed the wording to "advertise" and explicitly warned against treating the port list as a firewall.

## Review Notes

The core `publishNotReadyAddresses` explanation is correct: for Kubernetes-generated EndpointSlices it forces `ready: true`, while `serving` continues to map to Pod readiness and `terminating` continues to report deletion. The Service and StatefulSet APIs are current and non-deprecated, `.spec.ordinals.start` is stable since Kubernetes 1.31, and the shown `kubectl` JSONPath and `dig` syntax are valid. All YAML snippets parsed successfully and were accepted by `kubectl create --dry-run=client --validate=false` using kubectl 1.34.1.

The `example.invalid` image and application-specific arguments and readiness command are illustrative placeholders, so live application bootstrap could not be exercised. The manifests also assume that the `data` namespace already exists.
