# Validation Summary: How to Deploy Liqo for Seamless Multi-Cluster Resource Sharing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Liqo
- liqoctl
- Kubernetes Deployments, Services, Pods, node affinity, and topology spread constraints
- Liqo peering, virtual nodes, namespace offloading, ResourceSlice resource negotiation, and network gateways

## Sources Consulted
- Liqo v1.1.2 liqoctl installation documentation: https://docs.liqo.io/en/v1.1.2/installation/liqoctl.html
- Liqo v1.1.2 liqoctl install command reference: https://docs.liqo.io/en/v1.1.2/usage/liqoctl/liqoctl_install.html
- Liqo v1.1.2 peer two clusters guide: https://docs.liqo.io/en/v1.1.2/usage/peer.html
- Liqo v1.1.2 namespace offloading guide: https://docs.liqo.io/en/v1.1.2/usage/namespace-offloading.html
- Liqo v1.1.2 resource reservation guide: https://docs.liqo.io/en/v1.1.2/usage/resource-reservation.html
- Liqo v1.1.2 service offloading example: https://docs.liqo.io/en/v1.1.2/examples/service-offloading.html
- Liqo v1.1.2 network fabric documentation: https://docs.liqo.io/en/v1.1.2/features/network-fabric.html
- Kubernetes workload and scheduling documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ and https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- Updated the liqoctl download command from v0.10.0 to v1.1.2 and changed the extraction command to match the official current installation example.
- Replaced obsolete `--cluster-name` usage with `--cluster-id` for kubeadm installs, and fixed cloud-provider examples to use current EKS and GKE flags.
- Replaced the deprecated v0.10 out-of-band peering flow with the current `liqoctl peer --remote-kubeconfig` flow, and clarified that Liqo peerings are unidirectional unless a reverse peering is also created.
- Updated `NamespaceOffloading` manifests from `offloading.liqo.io/v1alpha1` to `offloading.liqo.io/v1beta1`.
- Fixed cluster selection guidance to label the Liqo virtual node, because namespace offloading selectors match virtual-node labels rather than `ForeignCluster` labels.
- Replaced the outdated `ResourceOffer` example with current peering-time resource requests using `--cpu`, `--memory`, `--pods`, and `--resource`.
- Corrected the virtual-node examples and peering status output to match current Liqo output and labels.
- Replaced an invalid local-only `nodeSelector` with required node affinity using `liqo.io/type DoesNotExist`.
- Updated monitoring commands from obsolete tunnel endpoint checks to current gateway server/client resources and `liqoctl info peer`.
- Revised the disaster-recovery wording to avoid claiming automatic failover from a failed local cluster; the corrected text describes scheduling critical workloads remotely with `podOffloadingStrategy: Remote`.
- Updated the topology spread key from the stale `liqo.io/cluster-id` label to the current `liqo.io/remote-cluster-id` virtual-node label.

## Review Notes
The post is now aligned with Liqo 1.1.x concepts and command syntax. In a future revision, the author could add environment-specific notes for gateway service exposure, overlapping CIDRs, and GKE credential setup, because those details depend on the target cluster networking and cloud configuration.
