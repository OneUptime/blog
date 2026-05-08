# Validation Summary: How to Scale OpenStack Multiple Regions with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack
- Calico for OpenStack
- Calico BGP route reflectors
- Calico BGPPeer and BGPFilter resources
- calicoctl
- Bash scripting
- GitOps-style policy synchronization

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack Ubuntu installation notes: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/ubuntu
- Calico BGP peering and route reflector configuration: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPFilter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl etcd datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd

## Issues Found
- The policy synchronization, monitoring, and verification scripts used `DATASTORE_TYPE=kubernetes` with `KUBECONFIG`, but Calico for OpenStack uses an etcd datastore. Updated the examples to use `DATASTORE_TYPE=etcdv3` and per-region `ETCD_ENDPOINTS` values.
- The compute-to-regional `BGPPeer` matched all regional route reflectors, which contradicted the text saying compute nodes should peer only with their local regional reflector. Scoped the example by `region == 'region-a'` and noted that it should be repeated per region.
- The cross-region `BGPFilter` was shown as a standalone resource, but Calico only uses a BGP filter when it is referenced from a `BGPPeer` `filters` list. Added the filter reference to the cross-region peer example.
- The BGP filter accepted the aggregate and rejected more-specific prefixes inside the aggregate, but because unmatched routes are accepted by default, unrelated routes could still be exported. Added a final reject rule and clarified that the aggregate route must be originated by the routing design.

## Review Notes
The guide remains architecture-level and uses illustrative hostnames, IP ranges, and region names. Operators should adapt endpoint URLs, TLS settings, BGP AS numbers, and aggregation design to their deployment.
