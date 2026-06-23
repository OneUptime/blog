# Validation Summary: How to Install MetalLB on Bare-Metal Kubernetes

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- MetalLB
- Kubernetes Services and LoadBalancer behavior
- kubectl
- Helm
- kube-proxy IPVS strict ARP
- MetalLB CRDs: IPAddressPool, L2Advertisement, BGPPeer, BGPAdvertisement
- BGP, ARP, NDP, BFD, and Prometheus metrics

## Sources Consulted
- MetalLB official installation documentation: https://metallb.io/installation/
- MetalLB official configuration documentation: https://metallb.io/configuration/
- MetalLB official usage documentation: https://metallb.io/usage/
- MetalLB official concepts documentation: https://metallb.io/concepts/
- MetalLB official network addon compatibility documentation: https://metallb.io/installation/network-addons/
- MetalLB official cloud compatibility documentation: https://metallb.io/installation/clouds/
- MetalLB GitHub releases page: https://github.com/metallb/metallb/releases
- MetalLB Helm chart values for v0.16.1: https://raw.githubusercontent.com/metallb/metallb/v0.16.1/charts/metallb/values.yaml
- MetalLB native manifest for v0.16.1: https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-native.yaml

## Issues Found
- The manifest installation and upgrade examples used MetalLB v0.14.9 while describing the command as the stable release. Updated both examples to v0.16.1, the current release referenced by official documentation and GitHub releases at review time.
- The Helm values example used non-current metrics keys under `controller.metrics`. Replaced this with the current chart's `prometheus.scrapeAnnotations`, `prometheus.metricsPort`, and `prometheus.serviceMonitor.enabled` structure.
- The Helm values example described `speaker.frr.enabled` as enabling advanced BGP features. Current MetalLB marks the direct FRR sidecar mode as deprecated and uses FRR-K8s as the default BGP backend. Updated the comments and added `frrk8s.enabled: false` to make the sample explicitly use the lightweight native backend.
- The Helm namespace creation command did not add the Pod Security Admission labels required for MetalLB speaker pods on clusters enforcing Pod Security. Added the official privileged namespace labels.
- The service annotation examples used the deprecated `metallb.universe.tf/*` prefix. Updated them to the current `metallb.io/address-pool` and `metallb.io/loadBalancerIPs` annotations.
- The BFD comment did not state that BFD requires an FRR-based backend. Added a concise caveat.
- The prerequisites did not mention MetalLB's memberlist port requirement. Added the TCP/UDP 7946 requirement.

## Review Notes
The post remains technically relevant and valid as a MetalLB installation guide. The native manifest and the sample Helm values now intentionally favor the lightweight/native backend; operators who need FRR-K8s-only features such as BFD or IPv6 BGP should omit the `frrk8s.enabled: false` override or use the FRR-K8s manifest.
