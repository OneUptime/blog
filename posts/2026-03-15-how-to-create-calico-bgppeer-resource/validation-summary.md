# Validation Summary: How to Create the Calico BGPPeer Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico BGPPeer resources
- Calico BGPConfiguration resources
- Calico BGPFilter resources
- Kubernetes node labels and annotations
- calicoctl
- kubectl
- BGP peering and route reflectors

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico route reflector hard-way guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/configure-bgp-peering
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The route reflector example did not configure `routeReflectorClusterID` on reflector nodes. Added `kubectl annotate node ... projectcalico.org/RouteReflectorClusterID=244.0.0.1` commands because Calico requires a route reflector cluster ID for a node to act as a route reflector.
- The non-reflector node selector used `!route-reflector == 'true'`, which is not the documented selector form. Changed it to `route-reflector != 'true'`, which matches nodes without that label or with a different value.
- The route reflector workflow did not disable the default node-to-node BGP mesh. Added the documented `calicoctl patch bgpconfiguration default -p '{"spec": {"nodeToNodeMeshEnabled": false}}'` command after applying replacement BGPPeer resources.
- The password-authenticated peer section only created the secret. Updated the text to state that the secret must be in the same namespace as the `calico/node` pod and readable by the `calico-node` service account.
- The verification text said `calicoctl node status` shows the correct AS number. The documented output shows peer state and info, not AS number, so the text now says to look for state `up` and info `Established`.

## Review Notes
- Calico documentation notes that changing BGP topology can cause temporary pod networking disruption, and route reflector migrations should be planned carefully in production.
- Calico documentation notes that `calicoctl node status` communicates with the local Calico agent and should be run on the node whose status is being checked.
