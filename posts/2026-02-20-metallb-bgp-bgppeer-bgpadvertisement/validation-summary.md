# Validation Summary: How to Configure MetalLB BGP Mode with BGPPeer and BGPAdvertisement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- BGPPeer custom resources
- BGPAdvertisement custom resources
- IPAddressPool custom resources
- kubectl

## Sources Consulted
- MetalLB Installation: https://metallb.io/installation/
- MetalLB Configuration: https://metallb.io/configuration/
- MetalLB Advanced BGP Configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API Reference: https://metallb.io/apis/
- MetalLB BGP Concepts: https://metallb.io/concepts/bgp/
- MetalLB Troubleshooting: https://metallb.io/troubleshooting/
- IANA BGP Well-known Communities Registry: https://www.iana.org/assignments/bgp-well-known-communities/bgp-well-known-communities.xhtml
- RFC 4271, A Border Gateway Protocol 4 (BGP-4): https://datatracker.ietf.org/doc/html/rfc4271

## Issues Found
- The installation command used MetalLB `v0.14.9`, while current official installation documentation uses `v0.16.0` manifest URLs. Updated the manifest URL to `v0.16.0`.
- The sequence diagram showed a BGP UPDATE acknowledgment. BGP UPDATE messages are not acknowledged by another UPDATE message. Replaced that line with a BGP KEEPALIVE message.
- The BGPPeer `holdTime` comment said it must be at least 3x `keepaliveTime`. RFC 4271 describes one third of the hold time as a reasonable maximum keepalive interval, not a strict universal "must" phrased that way. Reworded this as a common value.
- The BGPAdvertisement examples used `65535:65282` while labeling it `NO_EXPORT`. IANA lists `NO_EXPORT` as `0xFFFFFF01`, commonly written as `65535:65281`; `65535:65282` is `NO_ADVERTISE`. Updated both examples to `65535:65281`.
- The `localPref` example was incorrectly described as a delay before advertising a newly assigned IP. Updated the comment to describe BGP LOCAL_PREF behavior.
- The advanced public pool example described `203.0.113.0/28` as public IPs. That range is reserved for documentation examples, so the comment now says to replace it with the user's public allocation.

## Review Notes
The core MetalLB CRD examples use current non-deprecated API versions: `IPAddressPool` and `BGPAdvertisement` use `metallb.io/v1beta1`, while `BGPPeer` uses `metallb.io/v1beta2`. The `component=speaker` selector used in log commands matches labels in the current MetalLB native manifest.
