# Validation Summary: Why a Kubernetes Headless Service Returns No Pod IPs

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes Services and headless Services
- Kubernetes EndpointSlices and the legacy Endpoints API
- Pod selectors, readiness probes, startup probes, and readiness gates
- Kubernetes DNS service discovery and Pod DNS policy
- CoreDNS and its `kubernetes` plugin
- `kubectl`, JSONPath, and BIND `dig`

## Sources Consulted

- [Kubernetes Services and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes EndpointSlice v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [DNS for Kubernetes Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes DNS-Based Service Discovery specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md)
- [Kubernetes Pod probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes Pod lifecycle and readiness gates](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-readiness)
- [Debugging DNS resolution in Kubernetes](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [`kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [CoreDNS `kubernetes` plugin](https://coredns.io/plugins/kubernetes/)
- [ISC BIND `dig` manual](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- [Kubernetes registry manifest for `agnhost:2.39`](https://registry.k8s.io/v2/e2e-test-images/agnhost/manifests/2.39)

## Issues Found

- The terminating-endpoint explanation implied that `serving` meant only serving existing work. It now states the documented behavior: Service proxies normally ignore terminating endpoints but may route to endpoints that are both `serving` and `terminating` when all available endpoints are terminating.
- The readiness section referred to a "per-Pod DNS record," although the demonstrated query is for the headless Service's shared A/AAAA answer. It now says that a selected Pod must normally be ready before its address is published in that answer.
- The DNS test used the nonexistent image `registry.k8s.io/e2e-test-images/dnsutils:1.3`. It now uses the current Kubernetes DNS-debug image, `registry.k8s.io/e2e-test-images/agnhost:2.39`, which contains both `dig` and `cat`.
- `dig +noall +answer` suppressed the DNS header, making `NXDOMAIN`, `SERVFAIL`, and an empty `NOERROR` response look identical. The command now adds `+comments` so the response status remains visible.
- The resolver-inspection command attempted to use `kubectl exec` after the preceding `kubectl run --rm` had deleted the Pod. It now starts a separate self-cleaning test Pod to read `/etc/resolv.conf`.

## Review Notes

The post was reviewed against the current Kubernetes v1.36 documentation. EndpointSlice `serving` and `terminating` conditions are stable from Kubernetes v1.26, and the legacy Endpoints API is deprecated from v1.33. Manually managed EndpointSlices may omit condition values; consumers interpret unset `ready` and `serving` as true and unset `terminating` as false, so the JSONPath command can legitimately display blank values. Current CoreDNS watches endpoint discovery through EndpointSlices, although standard CoreDNS RBAC manifests may retain list/watch permission for the legacy Endpoints resource.
