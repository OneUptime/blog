# Validation Summary: How to Set Up MetalLB BGP with FRR (Free Range Routing) Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- MetalLB Helm chart
- BGP
- FRR
- BFD

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB BGP concepts documentation: https://metallb.io/concepts/bgp/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced BGP configuration documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB v0.16.0 Helm chart speaker template: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/charts/metallb/templates/speaker.yaml
- MetalLB release notes: https://metallb.io/release-notes/
- FRR vtysh documentation: https://docs.frrouting.org/en/latest/vtysh.html
- FRR BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRR BFD documentation: https://docs.frrouting.org/en/latest/bfd.html

## Issues Found
- The Helm repository URL used the legacy `https://metallb.universe.tf` endpoint. Updated it to the current official Helm repository, `https://metallb.github.io/metallb`.
- Current MetalLB Helm charts default to FRR-K8s mode, while the post is specifically about deprecated legacy FRR mode. Added `--set frrk8s.enabled=false` alongside `--set speaker.frr.enabled=true` and added a deprecation note.
- The post described FRR mode as enabling generic fine-grained route policies. MetalLB's documented CRDs support route attributes such as communities and local preference, but not arbitrary FRR route-map policy through legacy FRR mode. Reworded the claim to focus on BFD, VRF, and multiprotocol BGP.
- The BFD profile example incorrectly described `minimumTtl` as the minimum echo receive interval. Replaced it with the documented `echoInterval` field and kept `minimumTtl` out of the single-hop example.
- The Helm-installed speaker pod selectors used legacy labels such as `component=speaker`. Updated the commands to use the current Helm chart labels, including `app.kubernetes.io/component=speaker`.
- The architecture explanation attributed FRR config rendering specifically to the controller. Reworded it to say MetalLB reconciles the CRDs into FRR configuration, which avoids incorrectly assigning that responsibility to the controller.

## Review Notes
FRR mode is deprecated as of current MetalLB documentation, and FRR-K8s is now the default and recommended BGP backend. The article is still technically relevant because legacy FRR mode remains available, but future updates should consider changing the post's primary path to FRR-K8s.
