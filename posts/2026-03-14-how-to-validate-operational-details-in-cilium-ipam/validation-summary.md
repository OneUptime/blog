# Validation Summary: Validating Cilium IPAM Operational Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNode and CiliumEndpoint CRDs
- Cilium CLI
- kubectl
- jq
- IP address management (IPAM)

## Sources Consulted
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/cluster-pool/
- Cilium CRD-backed Cluster-Pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool.html
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/crd/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium Helm reference for IPAM settings: https://docs.cilium.io/en/stable/helm-reference/
- Cilium operator command reference for cluster-pool flags: https://docs.cilium.io/en/stable/cmdref/cilium-operator.html

## Issues Found
- The pool capacity script assumed each node PodCIDR had exactly 254 usable IPv4 addresses by multiplying the number of CIDRs by 254. Cilium cluster-pool IPAM uses configurable per-node mask sizes, so this was only accurate for `/24` IPv4 PodCIDRs. Updated the jq script to parse each IPv4 CIDR prefix and calculate usable capacity from the actual mask.

## Review Notes
- The examples focus on Cilium cluster-pool style `spec.ipam.podCIDRs` validation. Other Cilium IPAM modes, such as CRD-backed individual IP pools, ENI, Azure, or multi-pool IPAM, expose different operational details and may need mode-specific validation.
- The CIDR non-overlap snippet prints the relevant service, pod, and node network values for review; it does not perform an automated overlap calculation.
