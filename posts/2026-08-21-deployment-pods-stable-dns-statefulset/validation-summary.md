# Validation Summary: Why Deployment Pods Lack Stable DNS and When to Use StatefulSets

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes Deployments and ReplicaSets
- Kubernetes StatefulSets
- Kubernetes headless and ClusterIP Services
- EndpointSlices
- CoreDNS and Kubernetes DNS-based service discovery
- `kubectl` and `dig`
- Kubernetes `agnhost` test image

## Sources Consulted

- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes StatefulSet API reference](https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/)
- [Kubernetes Services and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes Service API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes DNS-Based Service Discovery specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes EndpointSlice API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes DNS debugging guide](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes `kubectl exec` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl delete` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/)
- [Kubernetes `kubectl rollout status` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)
- [Kubernetes kubectl rollout status implementation](https://github.com/kubernetes/kubectl/blob/master/pkg/polymorphichelpers/rollout_status.go)
- [CoreDNS Kubernetes plugin](https://coredns.io/plugins/kubernetes/)
- [Kubernetes `agnhost` 2.53 Dockerfile](https://github.com/kubernetes/kubernetes/blob/release-1.33/test/images/agnhost/Dockerfile)
- [Kubernetes `agnhost` netexec source](https://github.com/kubernetes/kubernetes/blob/release-1.33/test/images/agnhost/netexec/netexec.go)

## Issues Found

- The bare `dig` commands lacked execution context. Kubernetes Service DNS is normally available through a Pod's cluster DNS configuration, not the operator workstation's resolver. The commands now use `kubectl exec` in the demonstrated `agnhost` Pods. The text also states that the examples assume the default `cluster.local` domain and that an A query returns IPv4 addresses.
- The DNS wording implied that answers change immediately with EndpointSlice state. Positive DNS caches can briefly retain a removed address, so the text now makes the caching qualification explicit.
- Namespaced `kubectl` commands relied on the current context namespace even though the resources are explicitly in `default`. Added `-n default` to every namespaced command. The later peer and client Service manifests also now set `metadata.namespace: default`, ensuring that they select the demonstrated StatefulSet.
- `kubectl rollout status deployment/api` is not a reliable synchronization barrier after manually deleting a Pod because the deletion does not start a new Deployment rollout, and Deployment status can still describe the already completed rollout. Replaced it with a Pod watch and explicit instruction to continue after the replacement is Ready.
- The Deployment and StatefulSet examples could coexist because object names are unique per kind, and their identical labels would cause the later Services to select both workloads. The earlier headless Service would also retain a named `targetPort` that the StatefulSet does not expose. Clarified that the workload examples are alternatives and added a command to remove the Deployment and its Service before applying the StatefulSet.
- The endpoint-scoped DNS explanation treated all such layouts as implementation details. Kubernetes specifies hostname-based records for ready endpoints of headless Services, while the dashed-IP fallback and optional Pod-name fallback are CoreDNS-specific. Corrected the wording to preserve that distinction.
- The post described StatefulSet lifecycle ordering too broadly. StatefulSet uses ordered deployment and scaling by default, and its default rolling update is ordered, but `podManagementPolicy: Parallel` relaxes scaling order and deleting the StatefulSet itself has no ordered termination guarantee. Restricted the claim to the default deployment, scaling, and rolling-update guarantees.
- The initial StatefulSet example does not set `publishNotReadyAddresses`, so an ordinal DNS record is published only after its Pod becomes Ready. Clarified the publication timing before listing the ordinal names.

## Review Notes

- All complete YAML examples use current GA APIs and passed `kubectl apply --dry-run=client`. Selectors, named ports, readiness probes, `serviceName`, `clusterIP: None`, and `publishNotReadyAddresses` are valid.
- `registry.k8s.io/e2e-test-images/agnhost:2.53` exists, uses `/agnhost` as its entrypoint, includes `dig`, and accepts the shown `netexec --http-port=8080` arguments. It is a Kubernetes test image used here for demonstration.
- The shown A lookups cover IPv4. An IPv6 or dual-stack validation can additionally query AAAA records.
- The StatefulSet example demonstrates stable network identity only; applications needing stable storage must also configure appropriate persistent storage, commonly with `volumeClaimTemplates`.
- No deprecated Kubernetes APIs or broken documentation links were found.
