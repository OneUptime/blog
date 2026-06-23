# Validation Summary: How to Configure MetalLB with FRR for Advanced BGP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB
- Kubernetes Services and CustomResourceDefinitions
- FRRouting (FRR)
- FRR-K8s
- BGP
- BFD
- VRF
- Helm
- Prometheus metrics

## Sources Consulted
- MetalLB official documentation: https://metallb.io/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced BGP configuration documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.io/apis/index.html
- MetalLB Prometheus metrics documentation: https://metallb.io/prometheus-metrics/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB Helm chart values for v0.16.1: https://raw.githubusercontent.com/metallb/metallb/v0.16.1/charts/metallb/values.yaml
- FRR-K8s repository documentation: https://github.com/metallb/frr-k8s
- BGP RFC 4271: https://www.rfc-editor.org/rfc/rfc4271
- BFD RFC 5880: https://www.rfc-editor.org/rfc/rfc5880

## Issues Found
- The post treated the deprecated FRR sidecar mode as the current recommended backend. Updated the wording to distinguish the recommended FRR-K8s backend from the deprecated direct FRR sidecar mode.
- The Helm values used non-existent `controller.metrics` settings and did not disable the default FRR-K8s backend while enabling the deprecated FRR sidecar. Replaced the metrics values with the chart's top-level `prometheus.serviceMonitor` structure and added `frrk8s.enabled: false`.
- The FRR image tag in the Helm example was outdated relative to the current MetalLB chart defaults. Updated it to `10.5.3`.
- `BGPPeer` examples used deprecated `metallb.io/v1beta1`. Updated all `BGPPeer` resources to `metallb.io/v1beta2`.
- The service examples used legacy `metallb.universe.tf/*` annotations. Updated them to the current `metallb.io/address-pool` and `metallb.io/loadBalancerIPs` annotations.
- The route-policy section described an unsupported ConfigMap override mounted into the FRR container. Replaced it with an FRR-K8s `FRRConfiguration` example and clarified that this applies to FRR-K8s, not the deprecated FRR sidecar mode.
- BFD `detectMultiplier` and `minimumTtl` comments were imprecise. Updated them to match the MetalLB API reference: detection is based on the remote transmit interval and `minimumTtl` applies to multi-hop sessions.
- The metrics section did not mention the current FRR-K8s `frrk8s_` prefix. Added the distinction between deprecated FRR sidecar `metallb_` metrics and default FRR-K8s metrics.
- The MetalLB documentation link used the older `metallb.universe.tf` domain. Updated it to `https://metallb.io/`.

## Review Notes
The guide intentionally preserves the deprecated FRR sidecar installation path because the original post is written around that pod topology and `vtysh` access pattern. For new deployments, MetalLB's official documentation recommends FRR-K8s mode instead.
