# Validation Summary: How to Use the Calico BGPFilter Resource in Real Clusters

## Status
validated

## Post Type
Tutorial / Production configuration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BGPFilter resources
- BGPPeer resources
- BGPConfiguration service route advertisement
- calicoctl
- kubectl

## Sources Consulted
- Calico BGPFilter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico service IP advertisement guide: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- Added a prerequisite clarifying that service VIP export examples require Calico `BGPConfiguration` to advertise the relevant service CIDRs. BGPFilter controls routes imported from or exported to peers, but it does not by itself cause Kubernetes service IPs to be advertised.
- Fixed the route reflector `nodeSelector` from `!route-reflector == 'true'` to `route-reflector != 'true'`. Calico selectors support `!=` for matching resources without a label value, and the previous expression was not a valid way to negate that equality check.

## Review Notes
- The BGPFilter API group, kind, rule fields, `Accept`/`Reject` actions, `In` match operator, IPv4/IPv6 rule sections, and `BGPPeer.spec.filters` usage match current Calico documentation.
- Calico applies BGPFilter rules sequentially and defaults to `Accept` if no rule matches, so the final broad reject rules are important for the intended default-deny behavior.
- The example CIDRs should still be replaced with each cluster's actual pod CIDRs, service CIDRs, and approved external or data center ranges before production use.
