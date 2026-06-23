# Validation Summary: How to Enable BFD for Fast Failover with MetalLB

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- MetalLB
- Kubernetes
- BGP
- BFD
- FRRouting (FRR)
- FRR-K8s
- Prometheus
- Grafana

## Sources Consulted
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB configuration guide: https://metallb.universe.tf/configuration/
- MetalLB BGP concepts and backend modes: https://metallb.universe.tf/concepts/bgp/
- MetalLB installation guide: https://metallb.universe.tf/installation/
- MetalLB Prometheus metrics reference: https://metallb.universe.tf/prometheus-metrics/
- MetalLB release notes: https://metallb.universe.tf/release-notes/
- FRRouting BFD documentation: https://docs.frrouting.org/en/latest/bfd.html
- RFC 5880 - Bidirectional Forwarding Detection: https://datatracker.ietf.org/doc/html/rfc5880
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- Corrected the BFD detection-time wording. The original text implied 50-300 ms detection broadly, but detection depends on negotiated timers and the detect multiplier.
- Corrected prerequisites. MetalLB currently documents Kubernetes 1.13.0 or later as the baseline, and BFD support first appeared in experimental FRR mode in v0.12.0; current CRD-based examples still require MetalLB v0.13.0 or later.
- Updated the architecture text from direct FRR mode only to FRR-based backends, noting that FRR-K8s is current default and direct FRR mode is deprecated.
- Corrected the basic BFD profile comment from approximately 300 ms detection to approximately 900 ms detection for a 300 ms interval and multiplier of 3.
- Updated `BGPPeer` examples from deprecated `metallb.io/v1beta1` to `metallb.io/v1beta2`.
- Corrected echo-mode guidance. Echo mode is not generally safe to enable just because a router supports BFD; FRR documents compatibility limitations and no multihop support.
- Removed misleading `minimumTtl: 254` usage from single-hop examples and clarified that `minimumTtl` applies to multihop BFD sessions.
- Fixed the complete configuration example where `autoAssign: true` contradicted the comment about requiring explicit annotations.
- Corrected the BGPAdvertisement `localPref` comment. `localPref` influences route selection in iBGP; it is not AS-path prepending.
- Updated BFD verification and troubleshooting commands for current FRR-K8s deployments, while keeping a note for deprecated FRR mode.
- Replaced outdated `metallb_bfd_*` metrics and non-existent state-change/control-packet metric names with current `frrk8s_bfd_*` metrics from MetalLB documentation.
- Corrected the ServiceMonitor example to target the FRR-K8s metrics service and `frrmetricshttps` port.
- Fixed shell script examples so `#!/bin/bash` appears as the first line when users create scripts from the snippets.
- Updated the validation checklist to inspect BFD sessions from FRR-K8s pods instead of assuming the FRR container is in a speaker pod.

## Review Notes
The tutorial is technically relevant and useful. Some operational examples still depend on the deployment mode and cluster topology, especially node draining and where FRR runs, but the post now calls out the current FRR-K8s default and avoids presenting deprecated FRR-sidecar assumptions as universal.
