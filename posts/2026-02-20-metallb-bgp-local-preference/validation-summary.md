# Validation Summary: How to Use BGP Local Preference in MetalLB for Traffic Engineering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- BGP LOCAL_PREF
- MetalLB BGPPeer, IPAddressPool, and BGPAdvertisement CRDs
- kubectl
- FRRouting

## Sources Consulted
- MetalLB API reference: https://metallb.io/apis/
- MetalLB advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB BGP mode concepts: https://metallb.io/concepts/bgp/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes external LoadBalancer service documentation: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- RFC 4271, BGP-4 LOCAL_PREF and route selection: https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The introduction stated that routers spread traffic across all announcing nodes by default. MetalLB's documentation says this behavior depends on router multipath support and configuration, so the text now says traffic can spread when routers are configured for BGP multipath.
- The BGPPeer examples used `peerASN: 64500` and `myASN: 64501`, making the sessions eBGP. RFC 4271 specifies that LOCAL_PREF is sent to internal peers and not external peers, so the examples now use `myASN: 64500` for iBGP and the prerequisites mention using iBGP or setting local preference with inbound router policy for eBGP.
- The local preference overview stated a universal default value of 100. This was narrowed to say many routers use 100 by default, while MetalLB's default advertisements do not set a custom local preference.
- The BGP peer manifest comment used a different filename from the apply command. The comment now matches `bgp-peers.yaml`.

## Review Notes
The MetalLB CRD API versions and fields used in the examples are current in the official API reference: `BGPPeer` uses `metallb.io/v1beta2`, while `IPAddressPool` and `BGPAdvertisement` use `metallb.io/v1beta1`. The kubectl commands and FRRouting route inspection command are syntactically consistent with current documentation. In production, failover timing will depend on BGP hold timers, BFD configuration, router policy, and whether the service uses `externalTrafficPolicy: Local`.
