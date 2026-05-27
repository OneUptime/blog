# Validation Summary: How to Use the no-advertise BGP Community with MetalLB

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- BGP communities
- FRR / FRR-K8s
- Cisco IOS BGP verification commands

## Sources Consulted
- MetalLB API reference: https://metallb.io/apis/
- MetalLB advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB BGP concepts, including FRR-K8s default and FRR mode deprecation: https://metallb.universe.tf/concepts/bgp/
- MetalLB release notes for FRR-K8s default backend and FRR mode deprecation: https://metallb.io/release-notes/
- MetalLB troubleshooting guide for native, FRR, and FRR-K8s verification paths: https://metallb.io/troubleshooting/index.html
- RFC 1997, BGP Communities Attribute: https://www.rfc-editor.org/rfc/rfc1997.html

## Issues Found
- The verification examples checked `10.200.0.0/24`, but the configured `aggregationLength: 32` means MetalLB advertises allocated IPv4 service IPs as `/32` routes. Updated the FRR and router verification examples to use an allocated service route, `10.200.0.10/32`, and clarified that readers should replace it with their actual LoadBalancer IP.
- The BGPAdvertisement comment said `aggregationLength: 32` aggregates routes to reduce announcements. MetalLB documents `/32` as the default per-service IPv4 route length, so this does not aggregate the `/24` pool. Updated the comment to say it keeps per-service `/32` announcements.
- The post said MetalLB must be installed in FRR mode and that community support requires FRR mode. MetalLB's BGPAdvertisement `communities` field is part of the CRD, and current MetalLB uses FRR-K8s as the default BGP backend while direct FRR mode is deprecated. Updated the prerequisite and common-mistakes table to distinguish BGP mode, native verification, direct FRR verification, and FRR-K8s verification.
- The FRR verification step said to check FRR logs, but the command shown queries FRR state through `vtysh`. Updated the text to describe checking the FRR container in direct FRR mode.
- The sample BGP output implied every platform will display the community as `no-advertise`. Added a note that equivalent displays such as `NO_ADVERTISE` or `65535:65282` are also valid.
- The Step 2 heading and intro implied the community belonged on the `BGPPeer`, while the YAML correctly omitted it and later attached communities on `BGPAdvertisement`. Updated the heading and intro to avoid that contradiction.

## Review Notes
The core MetalLB resource examples use current API versions and valid fields: `IPAddressPool` `metallb.io/v1beta1`, `BGPPeer` `metallb.io/v1beta2`, `Community` `metallb.io/v1beta1`, and `BGPAdvertisement` `metallb.io/v1beta1`. The well-known `NO_ADVERTISE` value `65535:65282` matches RFC 1997's `0xFFFFFF02` community.
