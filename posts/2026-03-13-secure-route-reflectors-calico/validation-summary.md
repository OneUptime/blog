# Validation Summary: How to Secure Route Reflectors in Calico

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Calico (CNI plugin for Kubernetes)
- BGP (Border Gateway Protocol) and iBGP route reflection (RFC 4456)
- Kubernetes (kubectl, node labels, namespaces)
- calicoctl
- BIRD routing daemon (`birdcl`)
- Calico v3 API resources: Node, BGPConfiguration, BGPPeer

## Sources Consulted
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico BGPConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- RFC 4456 (BGP Route Reflection)

## Issues Found
- **Misleading comment in verify section**: The shell snippet under "Verify Route Reflection" was prefixed with `# On a worker node, check sessions are with RRs only`, but the command immediately below selects the calico-node pod on `rr-node-1` (the route reflector) and stores it in a variable named `RR_NODE_POD`. The comment was inconsistent with the actual target. Updated the comment to `# On a route reflector node, check it has sessions to all workers` so it matches what the code does.

No other technical errors were found:
- The full-mesh session count math (100 nodes → 4,950 sessions via n*(n-1)/2) is correct.
- `spec.bgp.routeReflectorClusterID` is the correct field path on the Node resource.
- `nodeToNodeMeshEnabled` is the correct field on BGPConfiguration.
- The selector grammar `has(label)` / `!has(label)` is valid Calico selector syntax.
- `calico-system` namespace with label selector `k8s-app=calico-node` is correct for Tigera operator installs.
- `birdcl show protocols` and `birdcl show route count` are valid BIRD CLI commands available inside the calico-node pod.
- `calicoctl patch node ... --type merge --patch '{...}'` syntax is correct.
- `244.0.0.1` is the cluster ID value used in Calico's own documentation examples (an arbitrary 32-bit identifier per RFC 4456; it sits in the 240.0.0.0/4 reserved space, not multicast).
- Custom label keys (e.g., `calico-route-reflector=true`) are acceptable — Calico does not mandate a specific label key.

## Review Notes
- Manifest-based (non-operator) Calico installs place the calico-node DaemonSet in `kube-system` rather than `calico-system`. Readers using the manifest install method will need to adjust the namespace in the verify section.
- The post's title and description mention "Secure" route reflectors and "BGP authentication", but the body does not actually demonstrate BGP MD5/TCP-AO authentication configuration (the `password` field on BGPPeer). The body only covers RR designation, mesh disablement, and peering. This is a scope/content gap rather than a technical inaccuracy, so it was not modified.
- The cluster ID value `244.0.0.1` is in the IANA-reserved 240.0.0.0/4 block. Calico's own docs use this same value, so it is consistent with upstream conventions, but a brief note that the cluster ID is an opaque 32-bit ID (not a routable address) could help readers.
- For high-availability designs, RRs commonly use distinct cluster IDs per RR or a shared cluster ID with redundancy considerations per RFC 4456 §8. The post uses the same cluster ID on both RRs, which is a valid common pattern but worth being aware of when scaling further.
