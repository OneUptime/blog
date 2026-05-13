# Validation Summary: MetalLB BGP Mode with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MetalLB
- BGP
- FRR
- BFD
- Flux CD
- Kubernetes
- Helm
- Kustomize

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB BGP configuration documentation: https://metallb.io/configuration/
- MetalLB BGP concepts documentation: https://metallb.io/concepts/bgp/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB network addon compatibility documentation: https://metallb.io/installation/network-addons/
- MetalLB Helm chart templates and values for v0.15.3: https://github.com/metallb/metallb/tree/v0.15.3/charts/metallb
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- RFC 6996 private-use AS number reservation: https://www.rfc-editor.org/rfc/rfc6996.html

## Issues Found
- The introduction overstated BGP mode as "production-recommended" and "true load balancing." Updated the wording to describe BGP mode as a common production configuration that enables router-side ECMP and failover.
- The prerequisites incorrectly warned against Flannel with default configuration. MetalLB's compatibility documentation lists Flannel as compatible, so the warning was removed.
- The HelmRelease example placed resources in `metallb-system` without creating the namespace. Added a `Namespace` manifest with the privileged Pod Security Admission labels required by MetalLB speaker pods.
- The Helm chart version constraint used the older `0.14.x` line. Updated it to `0.15.x`, matching the current MetalLB release line checked during review.
- The BGP peer referenced `bfdProfile: default` without defining a matching `BFDProfile`. Added a `BFDProfile` resource and made FRR mode explicit in Helm values because BFD-backed BGP sessions require FRR mode.
- The BGPAdvertisement comment said `aggregationLength: 32` reduces BGP table size. A /32 advertises individual IPv4 service IPs, so the comment now explains that lower values aggregate larger pools.
- The Flux Kustomization health check watched the Helm-managed Deployment directly. Updated it to health-check the `HelmRelease`, matching Flux's recommended pattern for Kustomizations that contain HelmRelease objects.
- The test Service had no backing workload, so MetalLB would assign an IP but not reliably advertise it via BGP. Added a test nginx Deployment before creating the LoadBalancer Service.
- The troubleshooting commands used outdated labels and `gobgp neighbor`, which does not apply to the FRR-mode chart configuration. Updated the log selector to Helm chart labels and replaced the GoBGP command with `vtysh -c "show bgp summary"` in the FRR container.
- The private ASN range omitted the 32-bit private-use range from RFC 6996. Added `4200000000-4294967294`.
- The conclusion and failover guidance implied generic fast failover. Updated it to tie faster detection to FRR mode and BFD timers.

## Review Notes
The YAML snippets were parsed successfully after edits. The examples remain environment-specific: router ASN, peer addresses, service IP range, BGP communities, and Flux source names must still be adjusted for the reader's network and repository layout.
