# Validation Summary: How to Configure MetalLB BGP for Rack-and-Spine Network Topologies

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- MetalLB
- MetalLB BGPPeer, IPAddressPool, and BGPAdvertisement CRDs
- BGP and ECMP
- FRRouting / FRR-K8s
- Leaf-spine data center networking

## Sources Consulted
- MetalLB BGP concepts: https://metallb.io/concepts/bgp/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The post described the deployment as using multi-hop peering, but the configuration peers each node directly with its local leaf switch and does not set `ebgpMultiHop`. Updated the description and introduction to refer to rack-local/per-rack peering instead.
- The prerequisites recommended MetalLB FRR mode, which is deprecated in current MetalLB documentation. Updated the prerequisite to recommend FRR-K8s mode while allowing FRR mode for older installations.
- The ECMP guidance did not mention that spines may need multipath relaxation when receiving equal-length paths from different leaf ASNs. Added a short caveat with the FRR `bgp bestpath as-path multipath-relax` command.
- The FRR-mode verification command did not select the `frr` container explicitly. Updated the `kubectl exec` command to include `-c frr`.
- The verification command only covered the older FRR sidecar-style query path. Added an FRR-K8s verification loop that execs into the `frr` container of `frr-k8s` pods.
- The rack failure section implied any full rack loss would automatically preserve service availability. Clarified that this is true only when the service IP is still advertised from other racks.
- The best-practices table said to aggregate routes at the leaf, but the MetalLB example performs aggregation through BGPAdvertisement. Reworded the practice to "Aggregate routes where appropriate."

## Review Notes
The MetalLB CRD examples use current API versions and valid field names. The Kubernetes node labeling commands and FRR `show bgp summary` command are valid. Device-specific Cisco syntax was treated as illustrative; production deployments should confirm exact ECMP and multipath commands for the target switch OS.
