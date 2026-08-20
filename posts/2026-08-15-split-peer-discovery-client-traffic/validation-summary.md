# Validation Summary: Split Stateful Peer Discovery from Client Traffic

## Status
validated

## Post Type
Technical guide / Kubernetes configuration guide

## Technologies Covered
- Kubernetes
- StatefulSets
- Headless Services
- ClusterIP Services
- EndpointSlices
- Kubernetes DNS and peer discovery
- Readiness probes and graceful Pod termination
- NetworkPolicy
- kubectl and dig

## Sources Consulted
- Kubernetes Service documentation, including headless Services: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes Service v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes StatefulSet stable network identity: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id
- Kubernetes StatefulSet deployment and scaling guarantees: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#deployment-and-scaling-guarantees
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes DNS debugging guide: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes EndpointSlice conditions: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions
- Kubernetes EndpointSlice v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes Service virtual IPs and proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Pod termination flow: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow
- Kubernetes readiness probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/#readiness-probe
- Kubernetes NetworkPolicy prerequisites: https://kubernetes.io/docs/concepts/services-networking/network-policies/#prerequisites
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- ISC BIND 9 dig reference: https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility

## Issues Found
- The headless Service set `targetPort: peer`, but the Service API specifies that `targetPort` is ignored when `clusterIP: None` and should be omitted or equal to `port`. Removed the ignored field; the headless Service continues to publish port 7000.
- The DNS names were presented as universal even though `cluster.local` is the default, configurable cluster domain. Qualified the examples as using the default cluster domain.
- The bare `dig` commands would commonly run on an operator workstation, where Kubernetes Service DNS is not normally resolvable. Clarified that the commands must run from a Pod using cluster DNS and noted that IPv6 addresses require `AAAA` queries.
- The illustrative client ClusterIP value assumed an IPv4 address in the `10.0.0.0/8` range. Replaced it with an address-family-neutral `<assigned-IP>` placeholder.
- The post said new connections go only to ready backends. Service proxies normally prefer ready, non-terminating endpoints, but may use endpoints that are both serving and terminating when all available endpoints are terminating. Updated the introduction, connection-level explanation, and conclusion to include that exception.
- The EndpointSlice explanation did not distinguish the `publishNotReadyAddresses` override from actual Pod readiness. Clarified that the peer slice reports `ready: true` while `serving` continues to reflect Pod readiness, whereas the ordinary client Service reports an unready Pod as `ready: false`.
- The post described the normal Service as centralizing proxy selection and broadly associated DNS-cache staleness with role changes. Clarified asynchronous propagation through EndpointSlices and Service proxies, existing-connection persistence, and the backend-address DNS-cache concern for headless role Services.
- The NetworkPolicy recommendation referred generically to CNI support. Updated it to the Kubernetes documentation's more precise requirement that the cluster network plugin enforce NetworkPolicy.
- The rollout description could imply that Kubernetes drains peer connections automatically. Clarified that the application must drain existing peer connections during the grace period and that the peer address can remain published during termination.

## Review Notes
- All manifests use current, non-deprecated APIs (`v1` for Services and `apps/v1` for the StatefulSet). The combined YAML decoded and passed client-side schema validation with kubectl v1.34.1.
- The `data` namespace must already exist, and `example.invalid/ledger:1.0.0` is intentionally a non-runnable placeholder that the post tells readers to replace.
- StatefulSets default to `podManagementPolicy: OrderedReady`. An application whose first replica cannot become ready until multiple peers exist may need `Parallel` Pod management or bootstrap/readiness behavior that permits sequential startup; early DNS publication alone does not create later replicas.
