# Validation Summary: How to Configure IP Address Allocation by Topology in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source documentation: Assign IP addresses based on topology - https://docs.tigera.io/calico/latest/networking/ipam/assign-ip-addresses-topology
- Calico Open Source documentation: Create multiple IP pools - https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico Open Source documentation: IPPool resource reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: kubectl label - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The IPPool example used `nodeSelector: all()`, which does not allocate addresses by topology. Changed the example to use two topology-specific pools selected by `topology.kubernetes.io/zone` node labels.
- The IPPool example used `vxlanMode: VXLAN`, but valid `vxlanMode` values are `Always`, `CrossSubnet`, and `Never`. Changed the value to `Always`.
- The verification command used `kubectl get pods -A -o wide | awk '{print $8}'`, which prints the node column rather than the pod IP column when namespaces are included. Changed it to use `--no-headers` and print field 7.
- The configuration steps did not show applying topology labels to nodes, which are required for Calico IPPool node selectors to work. Added example `kubectl label nodes` commands.

## Review Notes
The post is technically valid after the corrections. In a production cluster, operators should ensure every node is selected by at least one enabled IPPool; otherwise, workloads on unselected nodes may fail to receive pod IP addresses.
