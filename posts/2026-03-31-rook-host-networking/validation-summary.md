# Validation Summary: How to Set Up Host Networking for Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- CephCluster CRD (ceph.rook.io/v1)
- iptables (Linux firewall)

## Sources Consulted
- Rook CephCluster CRD network configuration documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/)
- Rook CephCluster CRD spec reference (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph documentation on network configuration and daemon ports (https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/)
- Kubernetes NetworkPolicy documentation regarding hostNetwork pods (https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- Ceph msgr2 protocol documentation for Mon port 3300 (https://docs.ceph.com/en/latest/rados/configuration/msgr2/)

## Issues Found
No technical issues found.

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v19.2.0` (Squid) is a valid release but may not be the latest point release in the v19.x series. Newer point releases with bug fixes and security patches may be available. This is not a technical error but readers should check for the latest stable Squid release.
- The `network.provider: host` syntax is the current correct approach in Rook. Older Rook versions used a top-level `hostNetwork: true` field which has been superseded.
- The `addressRanges` field with `public` and `cluster` sub-fields is correctly used for host networking. This should not be confused with the `selectors` field which is used with the Multus network provider.
- The claim that Kubernetes NetworkPolicies do not apply to host-networked pods is accurate for most CNI implementations and is well-documented in Kubernetes official docs. The recommendation to use node-level firewall rules (iptables) is sound advice.
- All kubectl commands, ss flags, and iptables syntax are correct.
