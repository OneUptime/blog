# Validation Summary: How to Migrate to Top-of-Rack Router Peering with Calico Safely

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
- Calico Open Source documentation: Configure BGP peering, https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Open Source documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: BGPConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico Open Source documentation: BGPPeer resource, https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The description claimed migration from overlay networking to top-of-rack BGP peering could be done "without workload disruption." Calico's official BGP peering documentation warns that significant BGP topology changes, including moving from full mesh to top-of-rack peering, may temporarily disrupt pod network connectivity and should be planned carefully. Changed the description to say the migration should be planned while minimizing workload disruption.

## Review Notes
The listed commands are syntactically valid: `calicoctl get bgpconfiguration default -o yaml`, `kubectl get nodes -o wide`, and `kubectl get pods -n calico-system`. In future revisions, the guide would benefit from concrete `BGPPeer` examples and an explicit warning to configure replacement BGP peerings before disabling Calico's node-to-node mesh.
