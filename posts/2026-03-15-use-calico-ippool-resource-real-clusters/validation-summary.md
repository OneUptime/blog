# Validation Summary: How to Use the Calico IPPool Resource in Real Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico IPPool resources
- Calico IPAM
- Kubernetes namespaces, nodes, labels, and pod inspection
- calicoctl
- Prometheus metrics for Calico

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico topology-based IP address assignment: https://docs.tigera.io/calico/latest/networking/ipam/assign-ip-addresses-topology
- Calico CNI plugin annotations for per-namespace and per-pod IP pools: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico restricted IP pool annotation guide: https://docs.tigera.io/calico/latest/networking/ipam/legacy-firewalls
- Calico IPAM overview and block behavior: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico FAQ on network and broadcast addresses in pools: https://docs.tigera.io/calico/latest/reference/faq
- calicoctl ipam show command reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Kubernetes node labels reference: https://kubernetes.io/docs/reference/node/node-labels/

## Issues Found
- The production pool example used `node-role.kubernetes.io/worker == "true"`, but common Kubernetes role labels use an empty string value. Changed it to `node-role.kubernetes.io/worker == ""` to match the style used later for `node-role.kubernetes.io/control-plane`.
- The capacity planning section said a `/16` gives 65,534 usable IPs. Calico is fully routed and can use all addresses in a pool, including addresses normally treated as network or broadcast addresses. Changed this to 65,536 Calico addresses.
- The verification command `kubectl get pods -A -o wide | grep us-east-1a` would not reliably work because pod wide output does not include node zone labels. Replaced it with commands that first list nodes in the zone and then inspect pods scheduled to a selected node.
- The troubleshooting section referred to `VXLANCrossSubnet`, which is not the IPPool field/value syntax. Changed it to `vxlanMode: CrossSubnet`.
- The troubleshooting section referenced non-existent Felix IPAM metrics from calico-node: `felix_ipam_allocations` and `felix_ipam_blocks`. Replaced them with kube-controllers IPAM metrics documented by Calico: `ipam_allocations_in_use` and `ipam_blocks`.

## Review Notes
The IPPool field names and values (`cidr`, `vxlanMode`, `natOutgoing`, `nodeSelector`, and `blockSize`) match the current Calico IPPool resource reference. The namespace annotation format for `cni.projectcalico.org/ipv4pools` is correct, and Calico documents that pod annotations take precedence over namespace annotations. Custom `blockSize` values are valid for modern Calico versions, but Calico notes that block size can only be set when a pool is created.
