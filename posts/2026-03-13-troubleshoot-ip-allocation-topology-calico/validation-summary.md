# Validation Summary: How to Troubleshoot IP Address Allocation by Topology in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl

## Sources Consulted
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source multiple IP pools and topology-based assignment guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico Open Source IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico Open Source calicoctl IPAM overview: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source calicoctl IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes kubectl JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The IPPool example used `vxlanMode: VXLAN`, but the Calico IPPool API accepts `Always`, `CrossSubnet`, or `Never`. Changed it to `vxlanMode: Always`.
- The example used `nodeSelector: all()`, which does not demonstrate topology-aware allocation. Changed it to a zone label selector and added a matching prerequisite that nodes must be labeled with the topology key.
- The pod verification command used `awk '{print $8}'`, which prints the node column for typical `kubectl get pods -A -o wide` output rather than the pod IP. Replaced it with a kubectl JSONPath expression that reads `.status.podIP` directly.
- The post used `calicoctl ipam check`, which is documented in Calico Enterprise but is not listed in the Calico Open Source IPAM command reference. Replaced it with `calicoctl ipam show --show-blocks`, which is documented for open-source Calico.

## Review Notes
The corrected example assumes nodes are labeled with `topology.kubernetes.io/zone=zone-a` and that the pool CIDR is within the cluster's intended pod address space. In operator-managed installs, topology-based pools are commonly configured through the `Installation` resource; this post uses the `projectcalico.org/v3` IPPool API, which is valid when managing pools directly.
