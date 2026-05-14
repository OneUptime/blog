# Validation Summary: How to Avoid Common Mistakes with L3 Interconnect Fabric with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Route reflectors
- BIRD
- Calico HostEndpoint policy

## Sources Consulted
- Calico documentation: Configure BGP peering, including route reflectors, node-to-node mesh, and `calicoctl node status`: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: BGPConfiguration resource and `nodeToNodeMeshEnabled`: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: calicoctl node status command: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: Calico over IP fabrics and route reflector design guidance: https://docs.tigera.io/calico/latest/reference/architecture/design/l3-interconnect-fabric
- Calico documentation: HostEndpoint forwarded traffic and `applyOnForward`: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- IANA Special-Purpose Autonomous System Numbers registry: https://www.iana.org/assignments/iana-as-numbers-special-registry
- RFC 4271: A Border Gateway Protocol 4 (BGP-4): https://www.rfc-editor.org/rfc/rfc4271
- RFC 4456: BGP Route Reflection: An Alternative to Full Mesh Internal BGP: https://www.rfc-editor.org/rfc/rfc4456
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The route reflector HA recommendation described route reflectors as pods and prescribed pod anti-affinity. Calico documents route reflectors as node-level configuration using a route reflector cluster ID and `BGPPeer` resources, so the text now recommends at least two route reflector nodes spread across failure domains and keeps pod anti-affinity only as an optional case for custom pod-based designs.
- The node-to-node mesh plus route reflector warning said this creates iBGP route reflection loops. BGP route reflection includes loop-prevention mechanisms, and Calico's documented migration path temporarily brings route reflector sessions up before disabling the mesh. The text now describes the concrete issue as redundant BGP sessions that can mask route reflector configuration problems.
- The BGP flapping causes listed "BGP hold timer mismatch" and "Felix restarting and disrupting BIRD." BGP peers negotiate hold time, so the issue is better described as overly aggressive timers for the path. Felix and BIRD are separate components inside `calico/node`, so the restart cause now refers to `calico/node` or BIRD restarting.
- The HostEndpoint policy recommendation did not mention `applyOnForward`. Calico HostEndpoint policies do not apply to forwarded traffic by default, so the post now specifies `applyOnForward: true` for external-to-pod forwarded traffic.

## Review Notes
- The `calicoctl patch bgpconfiguration default -p '{"spec":{"nodeToNodeMeshEnabled":false}}'` command matches Calico documentation. Calico warns that replacement `BGPPeer` resources should be configured before disabling the mesh to avoid pod networking breakage, which the post already states.
- `birdcl` troubleshooting is still plausible for BIRD-backed Calico deployments, but Calico's documented troubleshooting interface is `calicoctl node status` or `CalicoNodeStatus`. A future post revision could prefer those interfaces for portability.
