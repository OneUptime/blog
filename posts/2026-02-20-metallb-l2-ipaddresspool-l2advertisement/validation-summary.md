# Validation Summary: How to Configure MetalLB Layer 2 Mode with IPAddressPool and L2Advertisement

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services
- kubectl
- MetalLB
- MetalLB Layer 2 mode
- MetalLB IPAddressPool
- MetalLB L2Advertisement
- ARP and NDP

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB configuration guide: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB advanced L2 configuration: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB usage guide: https://metallb.io/usage/index.html
- MetalLB troubleshooting guide: https://metallb.io/troubleshooting/index.html
- MetalLB API reference: https://metallb.io/apis/index.html
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The service annotation used the older `metallb.universe.tf/address-pool` key. Changed it to the current documented `metallb.io/address-pool` annotation.
- The CIDR examples used `192.168.1.240/28`, which includes `192.168.1.255`. In the article's same-subnet LAN example this can collide with the common `/24` broadcast address. Changed the examples to `192.168.1.240/29`, covering `192.168.1.240` through `192.168.1.247`.
- The failover bullet said gratuitous ARP updates MAC tables. MetalLB's documentation describes updating client neighbor caches, so the text now says neighbor caches.
- The troubleshooting note said a Service stuck in `Pending` can mean no `L2Advertisement` covers the pool. MetalLB separates IP assignment from advertisement, so the note now distinguishes pending IP assignment from assigned-but-unreachable advertisement problems.

## Review Notes
The examples use current MetalLB CRDs (`metallb.io/v1beta1` `IPAddressPool` and `L2Advertisement`) and the YAML snippets parse successfully. `kubectl` is not installed in this review environment, so CLI command verification was performed against Kubernetes documentation rather than local `kubectl --help` output.
