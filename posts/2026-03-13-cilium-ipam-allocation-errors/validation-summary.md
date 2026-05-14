# Validation Summary: Cilium IPAM Allocation Errors: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium IPAM
- CiliumNode and CiliumEndpoint CRDs
- Helm
- Prometheus Operator PrometheusRule

## Sources Consulted
- Cilium cluster-pool IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium cluster-pool IPAM tutorial: https://docs.cilium.io/en/latest/network/kubernetes/ipam-cluster-pool/
- Cilium Kubernetes host-scope IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium metrics documentation: https://docs.cilium.io/en/latest/observability/metrics/
- CiliumEndpoint documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html

## Issues Found
- The post implied `clusterPoolIPv4MaskSize` can be increased as a direct live fix for existing node CIDRs. Cilium documents that `clusterPoolIPv4MaskSize` cannot be changed for existing allocations, so the wording now says larger per-node CIDRs apply to newly allocated node CIDRs.
- The cluster pool expansion example did not warn against changing existing pool entries. Cilium documents that exhausted cluster pools should be expanded by adding a new CIDR, not changing or removing existing CIDRs, so that warning was added.
- The cloud IPAM example mixed AWS ENI prefix delegation and EKS tag settings while describing pre-allocation. It now uses the documented AWS ENI settings `eni.enabled=true` and `ipam.nodeSpec.ipamMinAllocate=10`.
- The troubleshooting commands used non-documented CiliumNode fields `.status.ipam.available` and `.status.ipam.allocated` for cluster-pool/kubernetes IPAM. They were replaced with documented `spec.ipam.podCIDRs`, Kubernetes Node `spec.podCIDRs`, `status.ipam.operator-status`, and `cilium-dbg status --all-addresses` checks.
- The stale allocation example read allocated IPs from an incorrect CiliumNode status field and used a broad `grep` against pod output. It now reads local agent allocation output and compares exact pod IP columns.
- The CiliumEndpoint check assumed a node-name field under `.status.networking.node`. CiliumEndpoint documentation describes endpoint status data but does not provide that node-name filter; the post now compares pods scheduled to the node with CiliumEndpoint objects instead.
- The monitoring examples used metric names `cilium_ipam_available_ips` and `cilium_ipam_allocated_ips`, which are not the documented current names. They were replaced with `cilium_ipam_capacity`, `cilium_ip_addresses`, `cilium_operator_ipam_available_ips`, and `cilium_operator_ipam_used_ips`.
- The Prometheus alert used the wrong metric and label. It now uses the documented operator cloud IPAM metric `cilium_operator_ipam_available_ips` and `target_node` label.

## Review Notes
The post is technically relevant and useful after correction. The monitoring section now distinguishes agent IPAM metrics from operator cloud-IPAM metrics; future improvements could add separate alert examples for cluster-pool capacity and cloud IPAM node capacity.
