# Validation Summary: How to Fix MetalLB Invalid FRR Configuration Reload Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- MetalLB
- FRR
- FRR-K8s
- BGP
- kubectl
- YAML custom resources

## Sources Consulted
- MetalLB BGP concepts: https://metallb.io/concepts/bgp/
- MetalLB troubleshooting guide: https://metallb.io/troubleshooting/index.html
- MetalLB API reference: https://metallb.io/apis/
- MetalLB installation guide: https://metallb.io/installation/index.html
- MetalLB v0.16.0 direct FRR manifest: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/config/manifests/metallb-frr.yaml
- MetalLB v0.16.0 FRR-K8s manifest: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/config/manifests/metallb-frr-k8s.yaml
- MetalLB v0.16.0 BGPPeer API source: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/api/v1beta2/bgppeer_types.go
- MetalLB v0.16.0 BGPAdvertisement API source: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/api/v1beta1/bgpadvertisement_types.go
- RFC 6996 private ASN reservation: https://www.rfc-editor.org/rfc/rfc6996.html

## Issues Found
- The post described FRR as the BGP backend for modern MetalLB versions. Current MetalLB defaults to FRR-K8s, while direct FRR mode is deprecated. Updated the introduction and log-checking note to scope the guide to direct FRR mode and point FRR-K8s users to FRR-K8s logs and `FRRNodeState` resources.
- The post stated that MetalLB does not speak BGP directly. MetalLB can use native BGP, FRR-K8s, or deprecated direct FRR mode. Updated the explanation to say this applies specifically to direct FRR mode.
- The generated direct FRR configuration path was shown as `/etc/frr/frr.conf`. In the official direct FRR manifest, MetalLB writes the generated config to `/etc/frr_reloader/frr.conf`, with the reloader applying it to FRR. Updated the inspection and conclusion commands accordingly.
- The router ID section claimed duplicate router IDs across speaker pods cause FRR reload rejection and suggested there is no explicit `routerID` field. Current `BGPPeer` has `spec.routerID`, and the documented FRR-mode limitation is inconsistent router IDs across peers in one generated config. Updated the section and example.
- The address-family section claimed IPv4/IPv6 family mismatch causes FRR reload failures and only showed separate advertisements. Current `BGPPeer` supports `dualStackAddressFamily` for exchanging both address families over a session. Updated the explanation and snippet.

## Review Notes
The guide is valid for deprecated direct FRR mode. For new MetalLB deployments, FRR-K8s is the recommended/default backend and has a different pod topology and troubleshooting flow.
