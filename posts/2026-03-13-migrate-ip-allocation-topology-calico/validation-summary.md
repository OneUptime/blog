# Validation Summary: How to Migrate to IP Address Allocation by Topology in Calico Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico topology-based IP address assignment guide: https://docs.tigera.io/calico-cloud/networking/ipam/assign-ip-addresses-topology
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The IPPool example used `vxlanMode: VXLAN`, but Calico accepts `Always`, `CrossSubnet`, or `Never`. Changed it to `vxlanMode: Always`.
- The IPPool example used `nodeSelector: all()`, which is valid but does not demonstrate topology-based allocation. Changed it to `nodeSelector: zone == "west"` to match Calico's documented topology allocation pattern using node labels.
- The pod allocation verification command printed the eighth column from `kubectl get pods -A -o wide`, which is the node column for the standard all-namespaces output. Changed it to print the seventh column after skipping the header so it lists pod IPs.
- The pool utilization check used `calicoctl ipam show --show-configuration`, which displays IPAM configuration such as affinity settings rather than utilization. Changed it to `calicoctl ipam show`.

## Review Notes
The post is technically valid after these fixes. For a fuller future migration guide, consider adding explicit steps to label nodes, create one IPPool per topology segment, and ensure every node is selected by at least one pool before disabling or narrowing an existing pool.
