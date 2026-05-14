# Validation Summary: Avoid Mistakes in Node CIDR Planning for Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes networking
- kubeadm
- Calico CNI and Calico IPAM
- Calico IPPool resources
- Python `ipaddress`
- CIDR planning

## Sources Consulted
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes Nodes documentation: https://kubernetes.io/docs/concepts/architecture/nodes/
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 6598, IANA-Reserved IPv4 Prefix for Shared Address Space: https://www.rfc-editor.org/rfc/rfc6598
- IANA IPv4 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv4-special-registry

## Issues Found
- The post incorrectly stated that all ranges, including the node network and VPC CIDR, must be non-overlapping. Node IPs commonly come from a subnet inside the VPC or datacenter network, so I changed the guidance to require pod and service CIDRs to avoid routed infrastructure networks while requiring the node subnet to be inside the VPC/datacenter range.
- The CIDR validation script failed with the sample values because `10.0.1.0/24` intentionally overlaps `10.0.0.0/16`. I updated the script to validate that the node CIDR is a subnet of the VPC CIDR, then check pod and service CIDRs for conflicts with node and routed infrastructure ranges.
- The bash sizing example escaped quotes inside a bash code block, causing a syntax error when copied. I removed the unnecessary escaping and verified the snippet runs.
- The kubeadm example placed an inline comment after a line-continuation backslash. I moved the comment above the command so the multi-line command is valid shell.
- The Calico IPPool example advised using `/25` for 110 pods per node. Calico documentation says the default IPv4 block size is `/26`, hosts can receive additional blocks, and custom block size planning is a route-scaling tradeoff. I changed the example to use `/26` and clarified the caveat.
- The best-practice statement that none of the CIDR settings can be changed without full cluster recreation was too absolute. I changed it to state that pod and service CIDR changes are disruptive and Calico IPPool changes require a planned migration.

## Review Notes
- The post remains a high-level planning guide. It does not cover provider-specific subnet address reservations, dual-stack clusters, or managed Kubernetes limitations, which should be checked separately for production designs.
