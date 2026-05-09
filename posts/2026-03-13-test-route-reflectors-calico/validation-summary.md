# Validation Summary: How to Test Route Reflectors in Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BGP route reflectors
- calicoctl
- kubectl
- BIRD / birdcl

## Sources Consulted
- Calico Open Source documentation: Configure BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Open Source documentation: calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source documentation: BGPPeer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source documentation: BGPConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico Open Source documentation: Node resource: https://docs.tigera.io/calico/latest/reference/resources/node
- RFC 4456, BGP Route Reflection: An Alternative to Full Mesh Internal BGP: https://www.rfc-editor.org/rfc/rfc4456.html

## Issues Found
- The `calicoctl patch` examples used `--type merge`. Current Calico documentation shows the route reflector and BGPConfiguration patch examples without `--type merge`, and the `calicoctl patch` reference documents `merge` as not implemented. I removed `--type merge` from the node and BGPConfiguration patch commands so they use the supported default patch mode.
- The verification snippet said it was checking sessions on a worker node, but selected the `calico-node` pod running on `rr-node-1`. I changed the example to select a worker node pod (`worker-node-1`) and use that pod for both `birdcl show protocols` and `birdcl show route count`.
- The architecture diagram showed each worker peering with only one route reflector, while the BGPPeer configuration and conclusion say workers peer with all route reflectors for high availability. I updated the diagram so each worker peers with both route reflectors.

## Review Notes
- Calico's BGP peering documentation notes that changing BGP topology can briefly disrupt pod networking, and recommends provisioning route reflector nodes and BGPPeer resources before disabling the node-to-node mesh when avoiding disruption matters.
- The post uses the `calico-system` namespace, which is correct for common operator-based Calico installs. Manifest-based or older installs may use `kube-system`, so operators should adjust the namespace if their deployment differs.
