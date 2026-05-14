# Validation Summary: How to Avoid Common Mistakes with IP Address Allocation by Topology in Calico

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
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico topology-based IP address assignment guide: https://docs.tigera.io/calico/latest/networking/ipam/assign-ip-addresses-topology
- Calico multiple IP pools guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check

## Issues Found
- The IPPool example used `vxlanMode: VXLAN`, but the Calico IPPool API accepts `Always`, `CrossSubnet`, or `Never`. Changed it to `vxlanMode: Always`.
- The IPPool example set both `ipipMode` and `vxlanMode`. Calico documents these fields as mutually exclusive, so the `ipipMode: Never` line was removed.
- The topology-aware IPPool example used `nodeSelector: all()`, which does not constrain allocation by topology. Changed it to `nodeSelector: zone == "west"` to match Calico's documented node selector approach.
- The verification command used `awk '{print $8}'` with `kubectl get pods -A -o wide`, which selects the NODE column rather than the IP column. Changed it to `awk 'NR>1 {print $7}'` to skip the header and print pod IPs.

## Review Notes
The remaining calicoctl commands and IPPool fields match current Calico documentation. The post could be improved in the future by showing the corresponding `kubectl label nodes ... zone=west` step for a complete topology example.
