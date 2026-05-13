# Validation Summary: How to Configure Route Reflectors in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Calico route reflectors
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source documentation: Configure BGP peering, including route reflector setup, disabling node-to-node mesh, and verification guidance: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Open Source hardway guide: Configure BGP peering with route reflectors and BGPPeer selectors: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/configure-bgp-peering
- Calico Node resource reference for `spec.bgp.routeReflectorClusterID`: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico BGPPeer resource reference for `nodeSelector`, `peerSelector`, and selector syntax: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico calicoctl patch reference for supported `--patch` and `--type` behavior: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The `calicoctl patch` examples used `--type merge`. The current Calico reference documents `merge` as not implemented for `calicoctl patch`, so I removed `--type merge` and kept the JSON patch payloads using the supported default strategic patch behavior.
- The post disabled the node-to-node mesh before showing the replacement BGPPeer resources. Calico documentation notes that disabling the mesh before replacement peerings exist can break pod networking, so I moved the disable command after the BGPPeer resources and updated the comment accordingly.
- The verification snippet said it checked a worker node but selected the `calico-node` pod on `rr-node-1`. I changed the variable and field selector to target `worker-node-1`, matching the stated verification goal.

## Review Notes
- The route reflector cluster ID field, BGPPeer API version, `nodeSelector` / `peerSelector` fields, and `has(...)` selector usage match current Calico Open Source documentation.
- The post uses direct `birdcl` commands for route checks. Calico documentation more commonly recommends `calicoctl node status` or a `CalicoNodeStatus` resource for BGP session status, but `birdcl` remains a plausible low-level check in BGP mode.
