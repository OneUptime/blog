# Validation Summary: How to Install MetalLB on MicroK8s Without Breaking Existing Services

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes Services of type LoadBalancer
- MicroK8s MetalLB addon
- MetalLB standalone installation
- MetalLB IPAddressPool and L2Advertisement CRDs
- Helm
- Layer 2 ARP advertisement

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool documentation: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MicroK8s MetalLB addon documentation: https://canonical.com/microk8s/docs/addon-metallb
- MicroK8s addon usage documentation: https://microk8s.io/docs/howto-addons
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The migration overview said to install standalone MetalLB before disabling the MicroK8s addon, while the detailed steps correctly disabled the addon first. Running two MetalLB instances can lead to conflicting announcements, so the overview was changed to prepare the standalone configuration first, then disable the addon and install standalone MetalLB back to back.
- The standalone manifest example used MetalLB v0.14.9 and linked to the older `metallb.universe.tf` installation URL. The example was updated to the current official v0.16.0 native manifest URL and `https://metallb.io/installation/`.
- The standalone multi-pool Service example used the older `metallb.universe.tf/address-pool` annotation. The current MetalLB documentation uses `metallb.io/address-pool`, so the snippet was updated.
- The firewall pitfall described strict iptables rules as a cause of dropped ARP responses. Since ARP is not ordinary IP traffic, the wording was changed to ARP filtering, anti-spoofing rules, or firewall controls.
- The introduction implied a no-downtime migration. Because disabling the addon can temporarily remove external IP handling, the wording was adjusted to "as little disruption as possible."

## Review Notes
The reviewed YAML snippets use current MetalLB `metallb.io/v1beta1` APIs for `IPAddressPool` and `L2Advertisement`. The post uses the native MetalLB manifest, which is appropriate for the L2 setup shown; MetalLB currently recommends the FRR-K8s manifest for production BGP deployments, so a short caveat was added near the install command.
