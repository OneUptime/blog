# Validation Summary: How to Migrate to Route Reflectors in Calico Safely

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Route reflectors
- calicoctl
- BGPPeer, BGPConfiguration, Node, and CalicoNodeStatus resources

## Sources Consulted
- Calico Open Source documentation: Configure BGP peering and route reflectors - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Open Source documentation: BGPPeer resource - https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source documentation: calicoctl patch - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source documentation: CalicoNodeStatus resource - https://docs.tigera.io/calico/latest/reference/resources/caliconodestatus
- Calico Open Source hard way guide: Configure BGP peering with route reflectors - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/configure-bgp-peering

## Issues Found
- The post disabled node-to-node mesh before creating replacement BGPPeer resources. Calico documentation warns this can break pod networking until replacement peerings are configured, so the post now creates BGPPeer resources first and disables the mesh only after the new peerings are established.
- The prerequisites only recommended non-worker route reflector nodes. Calico documentation notes that adding `routeReflectorClusterID` removes a node from the node-to-node mesh immediately and can briefly disrupt workloads on that node, so the prerequisites now require dedicated unschedulable nodes or drained existing nodes.
- The `calicoctl patch` examples used `--type merge`, but current `calicoctl patch` documentation lists JSON merge patch as not implemented. The examples now use the default patch behavior shown in Calico's official examples.
- The verification commands selected an RR node pod while the comment said to check from a worker node, and they used BIRD-specific commands. The post now uses the officially documented `sudo calicoctl node status` command and a CalicoNodeStatus example for Kubernetes-based status checks.
- The architecture diagram showed workers peering with only one route reflector each, while the text and BGPPeer resources configure all workers to peer with all route reflectors. The diagram now shows each worker peering with both route reflectors.

## Review Notes
- CalicoNodeStatus is intended for troubleshooting a small number of nodes and can add API server and node overhead if created broadly or with short update intervals.
- The examples assume Calico's Kubernetes API datastore and BGP networking are in use.
