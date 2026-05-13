# Validation Summary: MetalLB L2 Mode with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB
- MetalLB Layer 2 mode
- ARP and NDP
- Flux CD
- Flux HelmRelease and Kustomization resources
- Kubernetes Services and LoadBalancer configuration
- Helm charts

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/index.html
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced L2 configuration documentation: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB usage documentation: https://metallb.io/usage/index.html
- MetalLB API reference: https://metallb.io/apis/
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB Helm chart repository: https://metallb.github.io/metallb/index.yaml
- MetalLB Helm chart templates and values: https://github.com/metallb/metallb/tree/main/charts/metallb
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The Flux HelmRelease example placed the HelmRelease in the `metallb-system` namespace without creating that namespace. Added a `Namespace` manifest with the privileged Pod Security Admission labels MetalLB documents for the speaker pod.
- The Service example used legacy `metallb.universe.tf/loadBalancerIPs` and `metallb.universe.tf/address-pool` annotations. Updated them to the current documented `metallb.io/loadBalancerIPs` and `metallb.io/address-pool` annotations.
- The speaker log command used the old selector `app=metallb,component=speaker`. Updated it to the Helm chart labels `app.kubernetes.io/name=metallb,app.kubernetes.io/component=speaker`.

## Review Notes
The post pins the Helm chart to `0.14.x`; the MetalLB Helm repository currently lists newer `0.15.x` releases, but the `0.14.x` range remains a valid Helm semver range and the post is version-specific rather than claiming to use the latest chart. The optional `nodeSelectors` example assumes nodes are labeled with `kubernetes.io/role: worker`; that is valid Kubernetes label syntax but may require users to label their worker nodes explicitly.
