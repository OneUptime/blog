# Validation Summary: Do You Need a Cloud Controller Manager on Bare-Metal Kubernetes?

## Status

validated

## Post Type

Technical guide / reference

## Technologies Covered

- Kubernetes v1.31 and later
- External cloud-controller-manager (CCM)
- kubelet and kube-controller-manager cloud-provider configuration
- Kubernetes Nodes, provider IDs, topology labels, taints, and NodeRestriction
- Kubernetes Services, `LoadBalancer`, NodePort, and `loadBalancerClass`
- CNI networking and NetworkPolicy
- MetalLB, kube-vip, Cilium LB IPAM/BGP, and PureLB
- Ingress and Gateway API
- Container Storage Interface (CSI), CSIDriver, and StorageClass
- Cluster API, Metal3, and Ironic
- OpenStack and vSphere provider integrations
- kubectl

## Sources Consulted

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: removed `DisableCloudProviders` feature gate](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/#disablecloudproviders)
- [Kubernetes v1.31 release: removal of all in-tree cloud-provider integrations](https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/#removal-of-all-in-tree-integrations-with-cloud-providers)
- [Kubernetes: kubelet command reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/) and [kube-controller-manager command reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)
- [Kubernetes v1.31 kubelet Node-registration source](https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/kubelet_node_status.go#L327-L332) and [v1.36 source](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/kubelet/kubelet_node_status.go#L328-L333)
- [Kubernetes: Service and `loadBalancerClass`](https://kubernetes.io/docs/concepts/services-networking/service/#specifying-class-of-load-balancer-implementation)
- [Kubernetes: Network Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/) and [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) and [Gateway API documentation](https://gateway-api.sigs.k8s.io/)
- [Kubernetes: CSI volumes](https://kubernetes.io/docs/concepts/storage/volumes/#csi) and [storage API reference](https://kubernetes.io/docs/reference/kubernetes-api/storage/)
- [Kubernetes: Node labels and NodeRestriction](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-isolation-restriction)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [MetalLB concepts](https://metallb.io/concepts/) and [usage](https://metallb.io/usage/)
- [kube-vip: Kubernetes Load-Balancer Services](https://kube-vip.io/docs/usage/kubernetes-services/) and [kube-vip cloud provider](https://kube-vip.io/docs/usage/cloud-provider/)
- [Cilium LoadBalancer IP Address Management](https://docs.cilium.io/en/stable/network/lb-ipam/) and [PureLB overview](https://purelb.io/docs/overview/)
- [Cluster API documentation](https://cluster-api.sigs.k8s.io/) and [Metal3 documentation](https://book.metal3.io/)
- [Cloud Provider OpenStack](https://github.com/kubernetes/cloud-provider-openstack) and [Cloud Provider vSphere](https://github.com/kubernetes/cloud-provider-vsphere)
- [vSphere CSI Driver](https://github.com/kubernetes-sigs/vsphere-csi-driver), [Ceph CSI](https://github.com/ceph/ceph-csi), and [Longhorn concepts](https://longhorn.io/docs/1.12.0/concepts/)

## Issues Found

- The initialization-taint example omitted the value set by kubelet. Changed it to `node.cloudprovider.kubernetes.io/uninitialized=true:NoSchedule`, matching Kubernetes v1.31 and current source.
- The post could be read as implying that any CNI makes NetworkPolicy effective. Qualified both NetworkPolicy references to state that enforcement requires support from the selected network implementation.
- “These components are independent” was too categorical because provider-specific integrations can have documented dependencies, such as CSI drivers consuming provider identity or topology supplied by a CCM or equivalent automation. Changed the sentence to distinguish separate responsibilities from operational dependencies.
- The provider-free reference architecture credited kube-vip generically with both address allocation and advertisement. kube-vip advertises supplied VIPs and can obtain DHCP VIPs, but its documented pool-based allocation uses the service-only kube-vip cloud provider. Restricted that no-CCM example to MetalLB; kube-vip remains correctly listed as a broader Service load-balancer option.
- The CSI architecture line implied that every driver dynamically provisions and attaches volumes. Qualified provisioning as capability-dependent and attachment as required only for drivers and volumes that use an attach step.
- The Pod listings were limited to `kube-system`, which can miss CCM and network add-ons installed in another namespace. Changed them to all-namespace listings. The verification comments also claimed more than the commands establish, so they now accurately describe inspection of add-ons, Service status and events, registered CSI drivers, and StorageClass provisioners.
- The NodeRestriction wording omitted its Node-authorizer prerequisite and called the protected label key portion a namespace. Updated it to describe enabled NodeRestriction with the Node authorizer and use the documented term “label prefix.”

## Review Notes

The central conclusion is correct: a provider-free bare-metal cluster does not require a CCM, while an external provider integration does. The Kubernetes v1.31-and-later `--cloud-provider` values, CCM controller responsibilities, `loadBalancerClass` behavior, provider examples, and route-owner guidance are current. All kubectl commands are syntactically valid after the edits. Every link already present in the post, including the author link, returned HTTP 200 and resolved to the intended page. Kubernetes v1.36 deprecates the separate Service field `.spec.externalIPs`; the post does not use or recommend that field, so its generic discussion of external addresses for `LoadBalancer` Services is unaffected.
