# Validation Summary: How to Use the Calico BGPPeer Resource in Real Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico BGPPeer resources
- Calico BGPConfiguration resources
- Calico BGPFilter references
- Kubernetes node labels and annotations
- BGP route reflectors and external peering
- calicoctl
- kubectl

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico route reflector BGP peering guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/configure-bgp-peering
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPFilter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico selector syntax reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status

## Issues Found
- Route reflector examples did not disable Calico's default node-to-node mesh. Official Calico documentation states that BGPPeer-based node peering, including route reflector topologies, requires `nodeToNodeMeshEnabled: false` in the default BGPConfiguration to avoid the default full mesh. Added the required BGPConfiguration snippet and apply command to Pattern 2, and referenced the same configuration from Pattern 3.
- The non-route-reflector selector used `!route-reflector == 'true'`, which is easy to misread. Replaced it with the equivalent and documented Calico selector operator `route-reflector != 'true'`, which also matches nodes where the label is absent.
- Several examples referenced BGPFilter names such as `external-upstream-filter`, `cross-site-filter`, and `upstream-filter` without defining the corresponding BGPFilter resources. Since Calico BGPPeer `filters` entries must refer to BGPFilter resources, removed those dangling references rather than inventing route policy rules.

## Review Notes
- The examples use current Calico `projectcalico.org/v3` APIs and valid BGPPeer/BGPConfiguration fields.
- `calicoctl get bgppeer -o wide` and `calicoctl node status` are valid verification commands per the official calicoctl references.
- Real production upstream and cross-site peering should still add explicit BGPFilter resources for import/export policy, but those policies are environment-specific and were not added here.
