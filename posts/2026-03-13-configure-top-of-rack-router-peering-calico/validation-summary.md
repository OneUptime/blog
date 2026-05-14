# Validation Summary: How to Configure Top-of-Rack Router Peering with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Top-of-rack router peering
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Configure BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: BGP peer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: BGP configuration resource: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: calicoctl apply command: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get command: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node status command: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The original guide described configuring top-of-rack router peering but only included verification commands. Added a `BGPPeer` manifest using the documented `projectcalico.org/v3` API, `peerIP`, `asNumber`, and `nodeSelector` fields so the post actually shows how to configure ToR peering.
- Added `calicoctl apply -f rack1-tor.yaml`, `calicoctl get bgppeer -o wide`, and `calicoctl node status` checks. These align the configuration and verification steps with Calico's documented BGP peer resources and BGP session status workflow.

## Review Notes
The commands and resource fields are valid for current Calico documentation. The `calico-system` namespace check is appropriate for operator-managed Calico installations; manifest-based installations may use a different namespace such as `kube-system`.
