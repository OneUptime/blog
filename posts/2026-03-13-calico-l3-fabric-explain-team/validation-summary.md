# Validation Summary: How to Explain L3 Interconnect Fabric with Calico to Your Team

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BIRD
- Linux routing
- Route reflectors
- Overlay and non-overlay networking

## Sources Consulted
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: Overlay networking - https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: Component architecture - https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: The Calico data path - https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico documentation: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- BIRD User's Guide: Remote control - https://bird.network.cz/doc/bird-4.html

## Issues Found
- The `kubectl exec` examples used `-l k8s-app=calico-node` directly with `kubectl exec`. Current `kubectl exec` syntax accepts a pod or resource name, not a label selector flag. Changed the example to first resolve a Calico node pod with `kubectl get pods ... -o jsonpath=...`, then pass that pod name to `kubectl exec`.
- The Linux route-table comment said Felix programs the table from BGP routes. Calico documentation distinguishes Felix route programming from BIRD/confd BGP route distribution, and Calico troubleshooting documentation describes BIRD-learned routes appearing as `proto bird`. Changed the wording to "BGP-learned routes in the node's Linux routing table."
- The route-reflector explanation claimed 100 nodes x 100 peers equals 10,000 BGP sessions. In a full mesh, 100 nodes have 99 peers each, or 4,950 unique BGP sessions. Corrected the count while preserving the explanation.
- The route-reflector lookup command grepped only for `route-reflector`, which can miss Calico's `routeReflectorClusterID` field. Updated the grep pattern to include both the Calico field and common route-reflector labels.
- The performance explanation claimed "a few microseconds less latency" and "full MTU" as an absolute result. Calico documentation supports avoiding encapsulation overhead, but exact latency and usable MTU depend on the environment. Reworded the claim to "can reduce latency" and "no tunnel header reducing the effective MTU."
- The physical-router explanation implied routers can always optimize for pod-level routes. In Calico BGP mode, routers can do this when pod CIDRs are advertised and routable. Clarified that condition.

## Review Notes
- The examples assume Calico is installed in `calico-system` and that Calico node pods have the `k8s-app=calico-node` label. Some installations use a different namespace or labels, so operators may need to adjust those values.
- `birdcl show protocols` and `birdcl show route` remain valid BIRD commands, and Calico documentation still describes BIRD as the BGP daemon in `calico/node`.
