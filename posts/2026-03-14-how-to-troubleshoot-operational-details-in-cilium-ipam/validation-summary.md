# Validation Summary: Troubleshooting Cilium IPAM Operational Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium IPAM
- Kubernetes
- CiliumNode and CiliumEndpoint custom resources
- Cilium CLI and cilium-dbg
- kubectl
- jq

## Sources Consulted
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/
- Cilium CRD-backed Cluster-Pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium IPAM overview: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium cilium-dbg status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference: https://docs.cilium.io/en/latest/cmdref/
- Cilium API reference for CiliumEndpoint networking fields: https://docs.cilium.io/en/stable/api.html
- Cilium operator command reference for cluster-pool flags: https://docs.cilium.io/en/latest/cmdref/cilium-operator/

## Issues Found
- The post used `cilium status | grep IPAM` to inspect IPAM allocation details. The Cilium CLI `status` command reports installation status, while the documented IPAM allocation output is exposed by `cilium-dbg status`. Changed the examples to run `cilium-dbg status` through the Cilium DaemonSet.
- The per-node exhaustion check subtracted `.status.ipam.used` from `.spec.ipam.pool`. That pool field applies to CRD-backed IPAM, not cluster-pool PodCIDR allocation. Changed the command to calculate IPv4 availability from `.spec.ipam.podCIDRs` and `.status.ipam.used`.
- Operator log and resource commands used the `name=cilium-operator` selector. Cilium's current CLI documentation uses `io.cilium/app=operator` as the default operator pod selector, so the examples now use that selector.
- The troubleshooting guidance said to reduce `clusterPoolIPv4MaskSize` to give nodes smaller pools. A smaller numeric mask gives larger CIDRs, and Cilium documents `clusterPoolIPv4MaskSize` as not changeable on an existing cluster-pool. Changed the guidance to add a new CIDR to `clusterPoolIPv4PodCIDRList` and avoid changing existing CIDR entries or the mask size on an existing cluster.

## Review Notes
The guide is focused on Cilium cluster-pool behavior. Some commands may need adjustment for non-default IPAM modes such as AWS ENI, Azure IPAM, GKE, multi-pool, or fully external CRD-backed IPAM.
