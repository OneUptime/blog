# Validation Summary: How to Avoid StatefulSet Bootstrap Deadlocks with Peer DNS

## Status
validated

## Post Type
Technical Guide / Troubleshooting Guide

## Technologies Covered
- Kubernetes StatefulSets (`apps/v1`)
- Kubernetes headless and ClusterIP Services (`v1`)
- `publishNotReadyAddresses`
- Kubernetes EndpointSlices and readiness conditions
- Kubernetes DNS and CoreDNS
- StatefulSet peer discovery and ordinal identities
- Startup, readiness, and liveness probes
- `kubectl`, JSONPath-based custom columns, and `dig`
- Kubernetes `agnhost` test image

## Sources Consulted
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/) - verified ordinal identities, governing-Service DNS names, negative DNS caching, `OrderedReady`, and `Parallel` behavior.
- [StatefulSet API reference](https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/) - verified the current `apps/v1` fields and Pod management policy values.
- [Kubernetes StatefulSet update validation source](https://github.com/kubernetes/kubernetes/blob/v1.36.1/pkg/apis/apps/validation/validation.go) - verified that `podManagementPolicy` is immutable on an existing StatefulSet.
- [Kubernetes Service API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/) - verified `clusterIP: None`, named target ports, and the exact `publishNotReadyAddresses` contract.
- [Kubernetes Services and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services) - verified headless-Service address publication and ordinary ClusterIP Service behavior.
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) - verified StatefulSet-style Pod FQDNs and the readiness requirement for Pod address records unless `publishNotReadyAddresses` is enabled.
- [Kubernetes EndpointSlice conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions) - verified that EndpointSlice `ready` is forced to `true` for Services with `publishNotReadyAddresses: true`.
- [Kubernetes liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/) - verified named TCP probes and the intended semantics of each probe type.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/) - verified the label selectors, output modes, and custom-column expression.
- [Kubernetes DNS troubleshooting](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/) - verified that Service DNS should be tested from a Pod using cluster DNS.
- [Kubernetes `agnhost` netexec source](https://github.com/kubernetes/kubernetes/blob/master/test/images/agnhost/netexec/netexec.go) - verified the `netexec` command and `--http-port` option.

## Issues Found
1. **Ready-only publication was attributed too broadly to the headless Service** - EndpointSlices can contain matching unready Pods with readiness conditions; it is cluster DNS that omits their Pod address records by default. Changed the opening sequence to say that cluster DNS for the headless Service normally publishes only ready endpoint addresses.
2. **`Parallel` behavior was described too broadly** - The post said that `Parallel` removes ordered creation and deletion without scoping that statement to the applicable controller operations. Changed it to state that Pods may be created and terminated concurrently during scaling; rolling updates are governed separately by the update strategy.
3. **The text implied that `podManagementPolicy` could be changed in place** - This field is immutable on an existing StatefulSet. Reworded the comparison as configuration at StatefulSet creation and added that switching policies requires recreating the StatefulSet.
4. **The DNS diagnostic lacked its required execution context** - A bare `dig` from an administrator workstation normally cannot query cluster-only `.svc` DNS. Clarified that the query must run from a Pod using cluster DNS and that `cluster.local` must be replaced when the cluster uses another domain.

## Review Notes
- All three YAML manifests passed client-side decoding and validation with `kubectl v1.34.1`. They use current, non-deprecated `v1` and `apps/v1` APIs; selectors, labels, named ports, and probe fields align.
- The `registry.k8s.io/e2e-test-images/agnhost:2.53` image manifest is available, and `netexec --http-port=8080` is valid.
- The `kubectl get` commands, EndpointSlice label selector, custom-column Ready-condition filter, and `dig +noall +answer` options are valid.
- The `A` query checks IPv4. An IPv6-only cluster should query `AAAA` instead.
- EndpointSlice `.conditions.serving` still reflects Pod readiness even though `.conditions.ready` is forced to `true` by `publishNotReadyAddresses`.
- The legacy Endpoints API is deprecated in favor of EndpointSlice, but the explanatory mention remains accurate and mirrors the current Service API wording; the operational command correctly uses EndpointSlice.
- Every external link in the post returned HTTP 200. The Service API and probe links redirect to their current canonical paths.
