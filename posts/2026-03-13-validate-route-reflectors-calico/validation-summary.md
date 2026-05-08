# Validation Summary: How to Validate Route Reflectors in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BGP route reflectors
- BGPPeer and BGPConfiguration resources
- calicoctl
- BIRD / birdcl

## Sources Consulted
- Calico BGP configuration and route reflector documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico hard way BGP peering route reflector example: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/configure-bgp-peering
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico troubleshooting commands for BGP status and BIRD routing table inspection: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands

## Issues Found
- The `calicoctl patch` examples used `--type merge`, but the official `calicoctl patch` reference lists JSON Merge Patch as not implemented. Removed `--type merge` so the commands use the documented default strategic merge patch behavior.
- The verification block said to check a worker node but selected the `calico-node` pod on `rr-node-1`. Updated the example to select `worker-node-1` and renamed the variable to `WORKER_NODE_POD`, so the `birdcl show protocols` and route-count checks match the text.
- The architecture diagram showed each worker peering with only one route reflector, while the BGPPeer configuration and conclusion describe every worker peering with all route reflectors. Updated the diagram arrows to show each worker peering with both route reflectors.

## Review Notes
- The route reflector BGPPeer examples match Calico's documented selector-based route reflector pattern.
- The post assumes an operator-style Calico namespace (`calico-system`). Calico's troubleshooting documentation notes that manifest-based installs may use `kube-system` instead.
