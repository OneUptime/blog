# Validation Summary: How to Monitor IP Address Allocation by Topology in Calico

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
- kubectl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico multiple IP pools and topology-based assignment guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The IPPool example used `vxlanMode: VXLAN`, but Calico IPPool `vxlanMode` accepts `Always`, `CrossSubnet`, or `Never`. Changed it to `vxlanMode: Always`.
- The IPPool example explicitly set `ipipMode: Never` together with `vxlanMode`. The Calico IPPool reference states that `ipipMode` cannot be set at the same time as `vxlanMode`, so the explicit `ipipMode` field was removed.
- The IPPool example used `nodeSelector: all()`, which is valid but does not demonstrate topology-aware allocation. Changed it to select a Kubernetes topology zone label, matching Calico's documented node-selector approach for topology-based IP pools.
- The verification command used `awk '{print $8}'` with `kubectl get pods -A -o wide`, which prints the node column in the standard all-namespaces wide output rather than pod IPs. Changed it to skip the header and print column 7, the pod IP column.

## Review Notes
The remaining calicoctl commands and IPAM consistency check syntax match the current Calico documentation. The post is still a compact monitoring guide rather than a full topology setup walkthrough; a future revision could show multiple pools for different zones to make imbalance detection more concrete.
