# Do You Need a Cloud Controller Manager on Bare-Metal Kubernetes?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Bare Metal, Cloud Controller Manager, MetalLB, CSI, Networking

Description: Decide whether a bare-metal cluster needs a cloud-controller-manager, and map load balancing, routing, node metadata, and storage to the right alternatives.

---

Most bare-metal Kubernetes clusters do not need a cloud-controller-manager (CCM). Kubernetes does not require one merely because the cluster is self-managed. You need a CCM only when you have an infrastructure API and a compatible provider integration that should initialize Nodes, program infrastructure routes, manage `LoadBalancer` Services, or perform provider-specific lifecycle checks.

The word “cloud” can be misleading. A private virtualization platform or bare-metal provisioning system may offer a CCM. A rack of manually managed servers may not. Decide from the capabilities you want Kubernetes to reconcile, not from where the hardware sits.

## What Works Without a CCM

The Kubernetes control plane, scheduler, kubelet, workload controllers, Services, DNS, and a CNI can all work without cloud integration. A cluster can run Deployments, StatefulSets, Jobs, ClusterIP and NodePort Services, NetworkPolicies, and persistent storage provided by a suitable CSI driver.

What is not automatic is infrastructure that Kubernetes core deliberately does not implement:

- a provider load balancer and external address for `type: LoadBalancer`;
- cloud API-derived Node addresses, instance identity, region, zone, and instance type;
- provider route-table entries for per-Node Pod CIDRs;
- a cloud check that deletes a stale Node object after its backing server disappears; and
- provider storage, which is handled separately through CSI rather than by the CCM.

If no installed controller watches a `LoadBalancer` Service, its external address normally remains pending. This does not mean the API server or scheduler is broken. It means the request has no implementation.

## Do Not Set `--cloud-provider=external` Without a Provider

For current Kubernetes releases, `external` tells the kubelet and `kube-controller-manager` that a separate CCM will perform cloud initialization. A kubelet using this mode adds the following taint while it waits:

```text
node.cloudprovider.kubernetes.io/uninitialized:NoSchedule
```

If you set the flag but deploy no compatible CCM, new Nodes can remain unschedulable indefinitely. Check before changing anything:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints,PROVIDER_ID:.spec.providerID
kubectl get pods -n kube-system -o wide
```

For a conventional bare-metal cluster with no provider integration, leave `--cloud-provider` empty or unset. In Kubernetes v1.31 and later, the valid values are the empty string and `external`; historical in-tree provider names are no longer valid.

Do not “fix” a mismatched configuration by repeatedly removing the uninitialized taint. Correct the component configuration and restart it through the cluster's provisioning tool. A manually removed taint can let workloads schedule before required topology or address data exists, and it may return when the Node is recreated.

## Replace Capabilities Individually

You do not need one monolithic bare-metal CCM. Use the extension that owns each capability.

| Requirement | Typical bare-metal implementation |
| --- | --- |
| Pod networking and cross-Node reachability | A CNI plugin using overlay networking, native routing, or BGP |
| External IPs for `LoadBalancer` Services | MetalLB, kube-vip, Cilium LB IPAM/BGP, PureLB, or another Service load-balancer controller |
| HTTP routing | An Ingress controller or Gateway API implementation, usually exposed by NodePort or a load-balancer implementation |
| Persistent storage | A CSI driver for Ceph, Longhorn, local storage, SAN/NAS, vSphere, OpenStack, or another storage system |
| Server provisioning and replacement | Cluster API infrastructure provider, Metal3, an Ironic-based system, or external automation |
| Region and zone topology | Static or automated Node labels, or a compatible infrastructure provider that supplies them |

These components are independent. Installing a Service load-balancer controller does not populate `.spec.providerID`. Installing a CSI driver does not make `LoadBalancer` Services work. Installing a CNI does not provision disks.

## When a Bare-Metal Environment Does Have a CCM

Use a CCM when the underlying platform publishes an official, supported integration and you want its behavior. Examples can include Kubernetes running on an infrastructure cloud such as OpenStack or vSphere, or on a hosted bare-metal provider with a CCM. Even though the physical servers are dedicated, an API can still expose instances, networks, load balancers, and lifecycle state.

Before installing one, answer these questions from the provider's official documentation:

1. Which controllers does it implement: Node, route, Service, or only a subset?
2. Which Kubernetes minor versions does the release support?
3. Does it require `--cloud-provider=external` on kubelets and `kube-controller-manager`?
4. What Node-to-server identity does it expect: hostname, UUID, instance ID, or pre-set provider ID?
5. Which credentials, API endpoints, certificates, and network paths does it require?
6. Does its route controller fit the selected CNI, or must cloud routes be disabled?
7. Does its Service controller own all `LoadBalancer` Services, or only Services selected by class or annotations?

Install the provider manifest as a system component, including its tolerations for control-plane and uninitialized taints. Verify it can bootstrap before scheduling ordinary workloads.

## A Reference Architecture Without a CCM

A provider-free bare-metal cluster can have a clean division of responsibility:

```text
kube-controller-manager  -> Kubernetes workload and core control loops
CNI                      -> Pod connectivity and network policy
MetalLB or kube-vip      -> LoadBalancer address allocation/advertisement
Ingress or Gateway       -> Layer 7 routing
CSI driver               -> storage provisioning, attachment, and mount
external automation      -> server lifecycle and inventory
```

A simple verification flow is:

```bash
# Nodes should not wait for external cloud initialization
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Confirm the networking implementation
kubectl get pods -n kube-system -o wide

# Confirm a load-balancer controller owns the test Service
kubectl describe service test-lb

# Confirm CSI rather than CCM owns storage
kubectl get csidrivers,storageclasses
```

For topology-aware scheduling, apply well-governed labels such as `topology.kubernetes.io/zone` through provisioning automation. Do not let arbitrary node credentials self-label into security-sensitive pools; the NodeRestriction admission plugin protects labels in the reserved `node-restriction.kubernetes.io/` namespace for isolation use cases.

## Avoid Two Owners

Problems often begin when a cluster installs a general CCM and a separate load-balancer controller that both believe they own the same Service. Prefer an explicit selection mechanism supported by the controllers. Kubernetes provides `spec.loadBalancerClass` for non-default implementations; the default implementation ignores a Service with this field set. Some older controllers select by annotation instead.

Likewise, do not enable a CCM route controller while a CNI independently owns the same route table unless both projects explicitly document that design. Two reconcilers can continuously undo one another.

## Official Documentation

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Service type LoadBalancer](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)
- [Kubernetes: Network Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/#network-plugins)
- [Kubernetes: CSI volumes](https://kubernetes.io/docs/concepts/storage/volumes/#csi)
- [Kubernetes: Node labels and NodeRestriction](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [MetalLB official documentation](https://metallb.io/)

## Conclusion

A normal bare-metal cluster does not need a CCM. Leave cloud-provider mode unset, then install a CNI, storage driver, and external-service implementation that fit the network and hardware. Use a CCM only when a supported infrastructure API integration provides specific Node, route, Service, or lifecycle behavior you actually need. The safe question is not “is this bare metal?” but “which external resources should Kubernetes reconcile, and which single controller owns each one?”
