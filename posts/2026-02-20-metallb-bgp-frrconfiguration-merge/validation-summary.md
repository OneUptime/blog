# Validation Summary: How to Merge FRRConfiguration with MetalLB BGP Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- FRR-K8s
- FRRConfiguration custom resources
- BGP
- FRRouting
- kubectl

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/index.html
- MetalLB advanced BGP configuration documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB release notes: https://metallb.io/release-notes/
- FRR-K8s README and configuration documentation: https://github.com/metallb/frr-k8s
- FRR-K8s v1beta1 API reference: https://pkg.go.dev/github.com/metallb/frr-k8s/api/v1beta1
- FRRouting documentation: https://docs.frrouting.org/
- FRRouting vtysh manual reference: https://www.mankier.com/1/vtysh

## Issues Found
- The post described this as MetalLB "FRR mode", but FRRConfiguration merging is a feature of FRR-K8s mode. Updated the terminology throughout the setup, flow diagram, prerequisites, and verification steps.
- The post stated MetalLB v0.14.0 introduced FRRConfiguration support. MetalLB release notes show the experimental FRR-K8s backend was added in v0.14.2, with FRR-K8s becoming the recommended/default BGP backend in later releases. Updated the prerequisite.
- The flow diagram and explanation implied MetalLB writes a base FRR config file that FRR-K8s overlays. Updated this to reflect that MetalLB generates FRRConfiguration resources and FRR-K8s merges compatible FRRConfiguration resources before rendering FRR config.
- Several verification commands used `vtysh` inside MetalLB speaker pods. In FRR-K8s mode, status is exposed through `BGPSessionState` and `FRRNodeState`, and FRR CLI access belongs in the FRR-K8s pod's `frr` container. Updated the commands accordingly.
- The merge behavior section incorrectly claimed FRRConfiguration wins on conflicts. FRR-K8s rejects incompatible merged configuration and keeps the previous valid config. Updated the diagram and rules.
- The rawConfig examples did not mention that rawConfig is unsupported and intended for experimentation. Added the caveat and included `raw.priority` to show the documented ordering mechanism.
- The local validation command used `zebra --dryrun`, which is not the right check for an integrated FRR config containing BGP route-map directives. Updated it to use `vtysh -C -f /etc/frr/frr.conf`.
- The common pitfalls table incorrectly said duplicate `router bgp` blocks are categorically rejected. Replaced that with the documented conflict model for incompatible router or neighbor values.

## Review Notes
The rawConfig route-map examples are technically plausible as FRR snippets, but rawConfig remains an unsupported escape hatch in FRR-K8s. For production documentation, prefer type-safe FRR-K8s and MetalLB APIs wherever they cover the required behavior.
