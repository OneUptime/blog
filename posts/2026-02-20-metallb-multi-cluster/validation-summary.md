# Validation Summary: How to Run MetalLB Across Multiple Clusters Without IP Conflicts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services and kubectl
- MetalLB IPAddressPool
- MetalLB L2Advertisement
- MetalLB BGPPeer, BGPAdvertisement, and Community CRDs
- BGP routing concepts
- Bash scripting
- Python ipaddress and PyYAML
- ARP conflict detection with arping

## Sources Consulted
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- iputils arping manual page: https://man7.org/linux/man-pages/man8/arping.8.html
- Python ipaddress documentation: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The static partitioning section said non-overlapping ranges eliminate conflicts entirely. Changed this to say they prevent MetalLB from assigning overlapping addresses, because conflicts can still occur if other infrastructure uses the same IPs.
- The CIDR example described `/26` blocks as 62 usable host addresses and commented ranges as `.1-.62` and `.65-.126`, while the configured CIDR prefixes cover `.0-.63` and `.64-.127`. Updated the comments to match the actual CIDR blocks and remind readers to reserve infrastructure addresses according to their network design.
- The BGP strategy implied unique ASNs were sufficient to avoid route confusion. Added a clarification that unique ASNs do not replace non-overlapping address pools and that advertising the same service IP from multiple clusters must be intentional.
- The ARP conflict script treated `Received 2` from `arping -c 2` as a conflict, but that only means one live host replied twice. Replaced it with a script that keeps ARP requests as broadcasts and reports a conflict only when more than one unique MAC address answers for the same IP.
- The pool usage script used a JSONPath expression without explicit delimiters and parsed only same-/24 hyphen ranges by splitting on the last octet. Replaced it with JSON plus jq for assigned IPv4 LoadBalancer IPs and Python `ipaddress` parsing for CIDR, explicit ranges, and single IP entries.

## Review Notes
The MetalLB CRD apiVersions and field names shown in the post are current according to the official MetalLB API reference. The validation script in the GitOps section compiles, but in a future improvement it could be extended to validate reserved gateway or infrastructure addresses in addition to inter-cluster overlaps.
