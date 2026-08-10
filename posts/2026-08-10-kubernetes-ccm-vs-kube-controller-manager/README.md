# What Does Kubernetes cloud-controller-manager Actually Do—and What Still Belongs to kube-controller-manager?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, kube-controller-manager, Control Plane, Cloud Provider, Troubleshooting

Description: Separate the cloud-controller-manager's node, route, and load-balancer duties from the cloud-independent control loops that remain in kube-controller-manager.

---

Kubernetes has two similarly named control-plane components with deliberately different boundaries. `kube-controller-manager` runs the control loops that understand Kubernetes objects. A provider-specific `cloud-controller-manager` (CCM) runs the control loops that must understand an infrastructure API.

That distinction is the fastest way to choose the right logs during an incident. A Deployment that has too few replicas is not a CCM problem. A new virtual machine whose Node lacks its zone, provider ID, or cloud-known addresses probably is.

## The Ownership Map

| Symptom or resource | Primary owner | Why |
| --- | --- | --- |
| Deployment, ReplicaSet, StatefulSet, Job, or namespace reconciliation | `kube-controller-manager` | These are cloud-independent Kubernetes API control loops |
| Node `Ready` becoming `False` or `Unknown`, the corresponding `not-ready` or `unreachable` taints, and taint-based Pod eviction | `kube-controller-manager` node-lifecycle and taint-eviction controllers | Node lifecycle evaluates Node status and Lease heartbeats; taint eviction acts on `NoExecute` taints |
| Initial cloud identity, topology labels, provider ID, and cloud-reported Node addresses | CCM node controller | The values come from the provider API |
| Checking whether an unresponsive Node's backing server was deleted | CCM cloud node lifecycle controller, where implemented | Only the provider can authoritatively answer whether the instance exists |
| Assigning Pod CIDRs to Nodes | Usually `kube-controller-manager` node IPAM | Allocation is a Kubernetes cluster concern |
| Programming provider network routes for those Pod CIDRs | CCM route controller, if the provider and network model support it | This mutates cloud route tables |
| `ClusterIP` allocation and EndpointSlice reconciliation | Kubernetes API server and `kube-controller-manager` | Neither operation creates cloud infrastructure |
| Provisioning a provider load balancer for a `type: LoadBalancer` Service | CCM service controller or another selected load-balancer controller | This calls the infrastructure API |
| Persistent volume provisioning, attachment, and node mount | CSI controllers and CSI node plugin, plus Kubernetes storage controllers | CCM is not the cloud storage driver |

Provider implementations can split the standard CCM node work into separate node initialization and cloud node lifecycle controllers. They can also add provider-specific controllers. Treat the provider's release documentation and manifests as authoritative for the exact set.

## What the CCM Node Controller Changes

With an external provider, a kubelet registers a Node but does not perform cloud-provider initialization; it can still supply a provider ID or bootstrap node IP explicitly. The CCM queries the provider for the matching server and initializes or reconciles cloud-derived fields such as:

```bash
kubectl get node worker-1 -o jsonpath='{.spec.providerID}{"\n"}'
kubectl get node worker-1 -o jsonpath='{.status.addresses}{"\n"}'
kubectl get node worker-1 --show-labels
```

Common results include a provider-specific `.spec.providerID`, `topology.kubernetes.io/region`, `topology.kubernetes.io/zone`, instance-type labels, and `InternalIP` or `ExternalIP` entries. Before that second initialization finishes, a kubelet configured with `--cloud-provider=external` adds the `node.cloudprovider.kubernetes.io/uninitialized:NoSchedule` taint. The CCM removes it after successful initialization.

This is different from ordinary Node health monitoring. The kubelet continues to update Node status and its Lease. The cloud-independent node lifecycle controller in `kube-controller-manager` observes those signals, updates the Node's `Ready` condition, and manages the corresponding `not-ready` or `unreachable` taints. The separate taint-eviction controller, also in `kube-controller-manager`, handles taint-based Pod eviction. The CCM's cloud lifecycle check adds a separate fact: whether the backing server still exists at the provider.

## Routes: Allocation Is Not Programming

A common diagnostic mistake is to treat Pod CIDR allocation and cloud route creation as one operation. They are separate:

1. A Node receives `.spec.podCIDR` or `.spec.podCIDRs`, commonly through node IPAM in `kube-controller-manager`.
2. If the cluster uses provider routes, the CCM route controller programs the infrastructure so that traffic for that CIDR reaches the correct Node.
3. If the CNI uses an overlay, BGP, or its own routing integration, the CCM route controller may be unsupported or intentionally disabled.

Therefore, in a cluster configured to allocate per-Node Pod CIDRs, a Node with no Pod CIDR points toward IPAM configuration. In a cluster that expects provider routes, a Node with a Pod CIDR but no corresponding provider route points toward the CCM, its flags, cloud permissions, quotas, or provider support. Never enable cloud-route reconciliation just because the flag exists; it can conflict with the CNI's routing model.

## Services: The CCM Does Not Implement All Service Networking

For a typical `LoadBalancer` Service, Kubernetes first supplies the normal Service machinery and usually a NodePort. The CCM service controller asks the provider for a load balancer, configures its backends and related network resources, and writes the provisioned address to `.status.loadBalancer`.

The CCM does not make ClusterIP forwarding happen. That data plane is implemented by kube-proxy or a replacement such as an eBPF-based CNI. It also does not reconcile an Ingress merely because an Ingress eventually uses a cloud load balancer. An Ingress or Gateway controller owns those APIs. Some provider load-balancer controllers also claim selected Services; `spec.loadBalancerClass` and provider documentation determine ownership.

Use this sequence when a Service is stuck:

```bash
kubectl describe service -n app web
kubectl get service -n app web -o yaml
kubectl get endpointslice -n app -l kubernetes.io/service-name=web
kubectl logs -n kube-system -l k8s-app=cloud-controller-manager --since=20m --tail=-1
```

Adjust the namespace and CCM label selector to match the provider's manifest. Events and `.status.loadBalancer` show the control-plane result. EndpointSlices show which backends the control plane selected. Testing NodePort reachability, when a NodePort was allocated, exercises the backend data path.

## Storage Belongs to CSI, Not CCM

External cloud providers do not turn the CCM into a storage plugin. CSI drivers run their own controller-side components for operations such as provision and attach, and a node-side plugin for stage and mount. Kubernetes still contains generic persistent-volume controllers that coordinate through API objects, but provider storage calls belong behind CSI.

This matters during migration. Moving node, route, and Service integration to an external CCM does not by itself migrate an in-tree volume plugin. CSI migration, the provider's CSI driver, snapshot components when snapshots are used, and credential configuration are separate workstreams.

## A Fast Incident Triage

First inspect the object that is not converging:

```bash
# Cloud initialization
kubectl get nodes -o custom-columns=NAME:.metadata.name,PROVIDER_ID:.spec.providerID,TAINTS:.spec.taints

# Kubernetes workload controller
kubectl describe deployment -n app api

# Cloud load balancer
kubectl describe service -n app api

# Storage integration
kubectl describe pvc -n app data
kubectl get volumeattachment
```

Then choose the controller by the external system it must change. If convergence requires only Kubernetes API objects, start with the relevant core controller. If it requires instance metadata, a cloud route, a provider load balancer, or confirmation that a server was deleted, start with the CCM. If it requires a disk or file service, start with CSI.

Do not restart every controller at once. That destroys evidence and can turn a localized reconciliation failure into a wider control-plane gap. Record events, identify the current leader, capture logs, and verify cloud audit records before changing replicas or credentials.

## Official Documentation

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Components](https://kubernetes.io/docs/concepts/overview/components/)
- [Kubernetes: Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Volumes and out-of-tree CSI plugins](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes: Node Status](https://kubernetes.io/docs/reference/node/node-status/)

## Conclusion

The CCM owns control loops that need cloud knowledge: Node initialization and cloud lifecycle checks, provider routes where supported, and provider load balancers for Services it owns. `kube-controller-manager` retains cloud-independent workload, lifecycle, endpoint, service-account, garbage-collection, and other Kubernetes controllers. CSI drivers own provider-specific storage operations, while an Ingress, Gateway, or specialized load-balancer controller may own additional networking APIs. Match the failing external effect to that boundary and the correct logs become much easier to find.
