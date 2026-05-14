# Validation Summary: How to Choose L3 Interconnect Fabric with Calico for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- iBGP and eBGP
- Route reflectors
- Top-of-rack networking
- VXLAN overlay networking

## Sources Consulted
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico service IP advertisement documentation: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico over IP fabrics architecture documentation: https://docs.tigera.io/calico/latest/reference/architecture/design/l3-interconnect-fabric

## Issues Found
- The external route advertisement example used `BGPConfiguration.spec.serviceExternalIPs` to advertise a pod CIDR. Calico documents `serviceExternalIPs` as the CIDR list for Kubernetes Service external IPs, not pod CIDR advertisement. I replaced the example with a `BGPPeer` that peers selected nodes with a ToR router, which is the relevant Calico mechanism for advertising workload routes to external BGP peers.
- The route reflector `BGPPeer` example combined `peerSelector` with `asNumber`. Calico's `BGPPeer` reference states that `asNumber` must be empty when `peerSelector` is set. I removed `asNumber` and added `nodeSelector: all()` to match the documented route reflector peering pattern.
- The route reflector setup labeled nodes but did not configure `projectcalico.org/RouteReflectorClusterID`, which Calico requires for a node to act as a route reflector when using the Kubernetes API datastore. I added the required `kubectl annotate node` commands.
- The BGP readiness table said TCP 179 must be allowed "between nodes." That is true for node-to-node mesh, but incomplete for ToR or route-reflector peering. I changed it to "between BGP peers."
- The best practice calling a single route reflector a SPOF for "all routing" overstated the data-plane role. Calico route reflectors are control-plane components, so I changed the wording to "control-plane SPOF for routing updates."

## Review Notes
The post remains version-neutral. The reviewed Calico documentation was Calico Open Source 3.32 latest as of 2026-05-14.
