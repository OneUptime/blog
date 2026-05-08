# Validation Summary: Configuring Operational Details in Cilium IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium IPAM
- Helm
- kubectl
- CiliumPodIPPool

## Sources Consulted
- Cilium IP Address Management documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool.html
- Cilium CRD-Backed Cluster-Pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium Multi-Pool IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/multi-pool/
- Cilium CRD-Backed Multi-Pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-multi-pool/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes requirements documentation: https://docs.cilium.io/en/stable/network/kubernetes/requirements/

## Issues Found
- The prerequisites claimed Kubernetes v1.25+ generally. Current Cilium releases have version-specific Kubernetes support matrices, so this was changed to require a Kubernetes version supported by the installed Cilium release.
- The mask-size diagram labeled the whole usable host range as pod IPs. Cilium also consumes internal addresses such as router and health endpoint addresses from the node allocation, so the diagram now refers to usable addresses and includes that caveat.
- The pre-allocation example repeated cluster-pool settings and did not configure pre-allocation. It was corrected to a Multi-Pool IPAM example using `ipam.multiPoolPreAllocation`.
- The garbage collection command used `endpointGCInterval`, but the current Helm value is `operator.endpointGCInterval`. The command and surrounding explanation were corrected to describe CiliumEndpoint garbage collection.
- The Multi-Pool IPAM section omitted that `CiliumPodIPPool` is used with `ipam.mode=multi-pool`. The section now states that requirement.
- The troubleshooting guidance suggested reducing the cluster-pool mask size on exhaustion. Cilium documents that changing `clusterPoolIPv4MaskSize` on an existing cluster is not supported, so the guidance now recommends adding another CIDR and notes the limitation.
- The cluster-pool description and slow-startup/conclusion wording overgeneralized IPAM tuning behavior. These were narrowed to match Cilium's documented mode-specific controls.

## Review Notes
The post is technically valid after the corrections. Future improvements could include adding explicit version examples for Cilium releases and noting that existing cluster-pool CIDR list entries should be extended rather than changed.
