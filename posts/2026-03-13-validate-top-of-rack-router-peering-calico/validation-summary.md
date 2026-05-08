# Validation Summary: How to Validate Top-of-Rack Router Peering with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- Top-of-rack router peering
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: BGPConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: Configure calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Kubernetes documentation: kubectl quick reference - https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
- The original validation commands did not actually verify BGP peering state. Calico documents `calicoctl node status` as the command that checks the local Calico node instance and BGP peering states, so I added `sudo calicoctl node status` to the command list.
- The Calico component check used the `calico-system` namespace. That is valid for operator-based Calico installations, so I clarified the command comment to avoid implying it applies to every installation layout.

## Review Notes
The post is technically valid after the fixes, but it remains a high-level checklist. For future improvement, a more complete ToR validation guide should include expected `calicoctl node status` output, checks from the ToR/router side, and route-table verification appropriate to the specific network device.
