# Validation Summary: Cilium IPAM Cluster Scope (Default)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium cluster-pool IPAM
- Helm
- kubectl
- jq
- Prometheus Operator

## Sources Consulted
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium CRD-Backed Cluster-Pool IPAM tutorial: https://docs.cilium.io/en/latest/network/kubernetes/ipam-cluster-pool/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium Monitoring & Metrics reference: https://docs.cilium.io/en/latest/observability/metrics/

## Issues Found
- The post said `clusterPoolIPv4MaskSize` could be changed for new nodes after deployment. Cilium documentation states changing `clusterPoolIPv4MaskSize` is not possible for an existing cluster pool, so the remediation was changed to advise planning the mask before deployment or migrating to a new cluster.
- The troubleshooting example labeled a jq command as a CIDR conflict check, but it only generated CIDR pairs and did not test overlaps. It was replaced with a command that accurately lists allocated CIDRs for review.
- The validation section claimed to verify no CIDR overlaps while only listing node CIDRs. The wording was corrected to describe what the command actually does.
- The Prometheus alert used incompatible IPAM metric names for cluster-pool monitoring. It was updated to use current Cilium agent metrics, `cilium_ipam_capacity` and `cilium_ip_addresses`, and the alert text was narrowed to allocated PodCIDR IP capacity.
- The node allocation troubleshooting flow did not include the documented Operator status field. A `jsonpath` check for `.status.ipam.operator-status` was added.

## Review Notes
The post remains a practical cluster-pool IPAM guide. The current Cilium docs caution against changing existing entries in `clusterPoolIPv4PodCIDRList`; adding new CIDR list entries is the documented expansion path.
