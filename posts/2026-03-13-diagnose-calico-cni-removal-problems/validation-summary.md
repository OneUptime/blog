# Validation Summary: How to Diagnose Problems During Calico CNI Removal

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico CNI
- Kubernetes
- Calico CRDs and IPAM resources
- kubectl
- iptables

## Sources Consulted
- Calico documentation: Kubernetes system requirements and CNI paths, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: calicoctl ipam release, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico documentation: Decommission a node, https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- Calico documentation: Install calico/node, including CRD RBAC resources and the calico-node preStop shutdown hook, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Kubernetes documentation: Finalizers, https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/

## Issues Found
- The post used the invalid CRD name `caliconcalicos.crd.projectcalico.org`. I changed the stuck-CRD example to inspect `ipamblocks.crd.projectcalico.org`, which is a valid Calico CRD.
- The finalizer check only listed IPAMBlocks, while the surrounding text also discussed IPAMHandles and related IPAM cleanup state. I changed the command to inspect `ipamblocks`, `ipamhandles`, and `blockaffinities` in the `crd.projectcalico.org` API group.
- The root-cause list said Calico RBAC resources block a new CNI's ClusterRole. Kubernetes ClusterRoles are independent resources, and leftover Calico RBAC is not normally what prevents another CNI from initializing. I replaced this with the more accurate node-level cause: stale Calico CNI configuration still being selected by kubelet.
- The post referred to missing cleanup scripts. Current Calico manifests document a `calico-node` preStop hook that runs `/bin/calico-node -shutdown`, so I changed the wording to refer to abrupt termination or the shutdown hook not completing.
- The prevention guidance said to use `calicoctl` to clean up IPAM allocations before removing the DaemonSet. I narrowed this to documented workflows: `calicoctl ipam check`, `calicoctl ipam release --from-report` for confirmed leaked allocations, and `calicoctl delete node <nodeName>` when manual node decommissioning is required.

## Review Notes
The guide is version-neutral and remains technically relevant. The node-level checks assume Linux nodes with direct host access and iptables; clusters using Calico's nftables or eBPF dataplanes, Windows nodes, or managed Kubernetes environments may need adjusted inspection commands.
