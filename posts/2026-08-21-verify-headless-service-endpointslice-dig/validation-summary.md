# Validation Summary: How to Verify Headless Service DNS with EndpointSlices and `dig`

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Kubernetes headless Services
- Kubernetes EndpointSlices (`discovery.k8s.io/v1`)
- StatefulSet and Pod DNS records
- `kubectl`
- CoreDNS and its `kubernetes` and `cache` plugins
- DNS A, AAAA, and SRV records
- BIND `dig` and `nslookup`
- Kubernetes `agnhost` diagnostic image

## Sources Consulted

- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes EndpointSlice v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes Service documentation](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes StatefulSet documentation](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes Debugging DNS Resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes DNS-Based Service Discovery specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Kubernetes `kubectl wait` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [Kubernetes `kubectl exec` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes EndpointSlice controller port-resolution source](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/endpointslice/utils.go)
- [Kubernetes `agnhost` v2.53 version marker](https://raw.githubusercontent.com/kubernetes/kubernetes/v1.32.2/test/images/agnhost/VERSION)
- [Kubernetes `agnhost` v2.53 Dockerfile](https://raw.githubusercontent.com/kubernetes/kubernetes/v1.32.2/test/images/agnhost/Dockerfile)
- [Kubernetes upstream CoreDNS manifest and RBAC](https://github.com/kubernetes/kubernetes/blob/master/cluster/addons/dns/coredns/coredns.yaml.base)
- [CoreDNS `kubernetes` plugin](https://coredns.io/plugins/kubernetes/)
- [CoreDNS `cache` plugin](https://coredns.io/plugins/cache/)
- [BIND 9 `dig` manual](https://bind9.readthedocs.io/en/stable/manpages.html#dig-dns-lookup-utility)

## Issues Found

- The opening implied that failure to resolve a named Service `targetPort` could remove an endpoint address from headless A/AAAA results. The EndpointSlice controller retains the endpoint address and omits the unresolved port; this affects the associated SRV answer instead. Reworded the sentence to distinguish missing address records from a missing SRV answer.
- The CoreDNS permission checklist omitted the legacy core/v1 Endpoints resource and described the listed permissions as a universal runtime minimum. Rephrased it to state what the standard `system:coredns` ClusterRole grants: list/watch access to Services, Endpoints, EndpointSlices, Pods, and namespaces.

## Review Notes

- The Service and EndpointSlice YAML fields are current, and `discovery.k8s.io/v1` is the stable EndpointSlice API. No deprecated API is used.
- The `kubectl` commands, label selectors, JSONPath expressions, custom-column expressions, and `dig` options are syntactically valid. The `registry.k8s.io/e2e-test-images/agnhost:2.53` image contains `dig`, `nslookup`, and `cat`, and its default `pause` command keeps the diagnostic Pod running for `kubectl exec`.
- EndpointSlice condition fields are optional. Per the v1 API, absent `ready` and `serving` values are interpreted as true, and an absent `terminating` value is interpreted as false. This does not invalidate the post's controller-generated examples, where the conditions are populated.
- The API permits multiple addresses in one logical endpoint, but the Kubernetes EndpointSlice controller currently generates exactly one address per endpoint. The post's broader field description remains valid.
- Negative DNS cache lifetime is normally conveyed through the SOA data in the authority section. The post already directs readers to full `dig` output when they need authority information.
- All external documentation links in the post were checked and point to the intended official resources.
