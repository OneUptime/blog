# Validation Summary: Tune CoreDNS TTLs for Fast Headless Service Updates

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes Services, StatefulSets, EndpointSlices, and cluster DNS
- CoreDNS `kubernetes`, `cache`, `reload`, and `prometheus` plugins
- NodeLocal DNSCache
- DNS TTLs, positive caching, negative caching, prefetching, and stale answers
- `kubectl` and `dig`
- Prometheus metrics for CoreDNS

## Sources Consulted

- [CoreDNS kubernetes plugin](https://coredns.io/plugins/kubernetes/)
- [CoreDNS cache plugin](https://coredns.io/plugins/cache/)
- [CoreDNS cache plugin source and parser](https://github.com/coredns/coredns/tree/master/plugin/cache)
- [CoreDNS reload plugin](https://coredns.io/plugins/reload/)
- [CoreDNS prometheus plugin](https://coredns.io/plugins/metrics/)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes StatefulSet stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes NodeLocal DNSCache](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/)
- [Kubernetes DNS debugging](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes kubeadm CoreDNS reconfiguration](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/#applying-coredns-configuration-changes)
- [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), [`kubectl rollout restart`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/), and [`kubectl rollout status`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [BIND 9 `dig` reference](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- [RFC 1035: Domain Names - Implementation and Specification](https://www.rfc-editor.org/rfc/rfc1035), [RFC 2308: Negative Caching of DNS Queries](https://www.rfc-editor.org/rfc/rfc2308), and [RFC 8767: Serving Stale Data to Improve DNS Resiliency](https://www.rfc-editor.org/rfc/rfc8767)

## Issues Found

- The introduction's phrase "setting every cache to zero" could imply that a CoreDNS cache maximum TTL can be set to zero, but the cache plugin rejects non-positive maximum TTLs. It now refers to driving cache horizons toward zero.
- The ConfigMap command was described as reading the effective configuration, even though it only reads the stored Corefile and does not prove that every replica loaded it. The wording now identifies it as the Corefile stored in the standard ConfigMap.
- The post said that `kubernetes ttl 0` prevents caching without accounting for the cache plugin's default five-second `MINTTL`. The explanation now states that the relevant `success` and `denial` minimum TTLs must also be zero, or those caches must be disabled, to preserve TTL zero through CoreDNS.
- The bare `dig` loop did not identify where it must run. The text now specifies a representative application Pod or a debug Pod with the same DNS path and `dig` installed, so the query exercises cluster DNS and any NodeLocal layer.
- The load-reduction list included jitter without distinguishing average query volume from synchronized peaks. Its introduction now covers both query-volume reduction and peak smoothing.
- The restart example discussed paths that require a Deployment restart but only ran `kubectl rollout status`, which does not initiate a restart. A conditional `kubectl rollout restart deployment/coredns` command was added.
- The logs command selected only one Pod from the Deployment by default, despite the instruction to verify every CoreDNS replica. It now uses `--all-pods=true` and prefixes each line with its source.

## Review Notes

- The configuration syntax, cache capacities, TTL arithmetic, prefetch behavior, `serve_stale` modes, `keepttl` warning, `SERVFAIL` behavior, NodeLocal DNSCache description, QPS example, and listed metrics are otherwise consistent with current official documentation.
- Kubernetes documents that `coredns_kubernetes_dns_programming_duration_seconds` does not currently support the `headless_without_selector` service kind.
- Headless-Service and StatefulSet Pod records normally depend on endpoint readiness unless the Service sets `publishNotReadyAddresses: true`.
- In NodeLocal DNSCache's iptables mode, a Pod's `/etc/resolv.conf` can still list the kube-dns Service IP because the node-local agent also listens on that address; inspect the DaemonSet and ConfigMap as the post recommends.
