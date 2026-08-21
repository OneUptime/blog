# Validation Summary: How to Build StatefulSet FQDNs with a Custom Cluster Domain

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes StatefulSets
- Headless Services and EndpointSlices
- Kubernetes Pod and Service DNS
- Custom cluster domains
- CoreDNS and NodeLocal DNSCache
- Kubelet configuration
- `kubectl`, `dig`, and `jq`
- ConfigMaps and the Downward API
- IPv4/IPv6 dual-stack Services

## Sources Consulted
- [Kubernetes StatefulSet stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes DNS-Based Service Discovery specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md)
- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes Service API, including `publishNotReadyAddresses`](https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes IPv4/IPv6 dual-stack Services](https://kubernetes.io/docs/concepts/services-networking/dual-stack/#services)
- [Kubernetes KubeletConfiguration `clusterDomain`](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- [Kubernetes viewing the live kubelet configuration](https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/#viewing-the-kubelet-configuration)
- [Kubernetes Downward API fields](https://kubernetes.io/docs/concepts/workloads/pods/downward-api/)
- [Kubernetes debugging DNS resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes debugging Services and custom cluster domains](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [Kubernetes Customizing DNS Service](https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/)
- [Kubernetes `kubectl run`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/), [`kubectl wait`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/), [`kubectl exec`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/), and [`kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) references
- [Kubernetes `agnhost` image Dockerfile](https://github.com/kubernetes/kubernetes/blob/release-1.32/test/images/agnhost/Dockerfile) and [`netexec` source](https://github.com/kubernetes/kubernetes/blob/release-1.32/test/images/agnhost/netexec/netexec.go)
- [CoreDNS Kubernetes plugin](https://coredns.io/plugins/kubernetes/)
- [ISC BIND 9 `dig` manual](https://bind9.readthedocs.io/en/stable/manpages.html#dig-dns-lookup-utility)
- [RFC 1034: Domain Names—Concepts and Facilities](https://www.rfc-editor.org/rfc/rfc1034)

## Issues Found
- The resolver-discovery instruction selected any search suffix beginning with `svc.`. That is ambiguous when the namespace is named `svc`, the cluster domain begins with `svc`, or a custom search entry has that prefix. It now selects the standard `<namespace>.svc.<cluster-domain>` suffix and removes the known `<namespace>.svc.` prefix.
- The trailing-dot explanation did not distinguish normal resolver search behavior from BIND `dig`. Because `dig` does not use the search list by default, the exact absolute-name command would not perform search expansion even without the dot. The text now explains that `dig` requires `+search` and that the trailing dot makes the name unambiguously absolute.
- The dual-stack diagnostic was conditioned on dual-stack Pods, but the governing Service's configured IP families determine which endpoint address families are published through Service DNS. The text now refers to a governing Service configured with both IP families.
- The live kubelet configuration command assumed that `/configz` was available. The text now states that the kubelet's `configz` debug endpoint must be enabled in addition to the administrator having node-proxy access.

## Review Notes
- The Service and StatefulSet YAML use current `v1` and `apps/v1` APIs, their selectors and named ports match, and the manifest decodes successfully with `kubectl` v1.34.1.
- `registry.k8s.io/e2e-test-images/agnhost:2.53` exists. Its default `pause` command keeps the diagnostic Pod running, it contains `dig`, and `netexec --http-port=7000` is valid.
- Without `publishNotReadyAddresses: true`, the ordinal Pod records are published only when the Pods are ready. The example's TCP readiness probe is independent of peer DNS, so the manifest remains valid; applications that need DNS for bootstrap may need that Service field.
- The sample assumes that the `data` namespace already exists.
- The `/etc/resolv.conf`, `cat`, and shell diagnostics are Linux-oriented. Windows Pods have different DNS resolver behavior.
- NodeLocal DNSCache is normally a caching and forwarding layer; the upstream DNS provider remains authoritative for Kubernetes records.
- Node-proxy access is security-sensitive and may be restricted even when kubelet debugging handlers are enabled.
