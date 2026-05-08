# Validation Summary: How to Use the Calico BGPConfiguration Resource in Real Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- BGPConfiguration and BGPPeer custom resources
- Kubernetes Services
- BGP route reflectors
- `calicoctl`
- `kubectl`

## Sources Consulted
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering and route reflector configuration: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico service IP advertisement guide: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips

## Issues Found
- The route reflector setup only labeled nodes. Calico route reflector nodes must also be configured with `projectcalico.org/RouteReflectorClusterID` when using the Kubernetes API datastore, so the example now annotates both reflector nodes before applying labels.
- The route reflector `BGPPeer` selected only non-route-reflector nodes as local peers. Calico's documented route reflector pattern uses `nodeSelector: all()` with `peerSelector: route-reflector == 'true'` so route reflector nodes can peer with each other as well as with non-reflector nodes.
- Two verification comments overstated what their commands prove. `calicoctl get bgpconfiguration default -o yaml` verifies the stored configuration, not routes on a peer router, and `kubectl get svc -A -o wide | grep LoadBalancer` lists service IPs for range comparison rather than confirming BGP advertisement by itself.

## Review Notes
The BGPConfiguration fields shown in the examples are current in Calico Open Source 3.32 documentation. Service IP advertisement still depends on matching the cluster's real service CIDRs and on external BGP peers or upstream routers accepting and propagating the routes.
