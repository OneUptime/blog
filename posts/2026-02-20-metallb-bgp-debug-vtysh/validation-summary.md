# Validation Summary: How to Debug MetalLB BGP Sessions Using vtysh Commands

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubectl
- MetalLB
- BGP
- FRRouting (FRR)
- vtysh
- BFD

## Sources Consulted
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB documentation home and FRR-K8s default backend note: https://metallb.io/
- MetalLB installation documentation for FRR and FRR-K8s modes: https://metallb.io/installation/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- FRR vtysh documentation: https://docs.frrouting.org/en/latest/vtysh.html
- FRR BGP command documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRR BFD command documentation: https://docs.frrouting.org/en/latest/bfd.html
- FRR Zebra route command documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRR basic commands and logging documentation: https://docs.frrouting.org/en/latest/basic.html
- RFC 5881, Bidirectional Forwarding Detection for IPv4 and IPv6 Single Hop: https://datatracker.ietf.org/doc/html/rfc5881
- RFC 5883, Bidirectional Forwarding Detection for Multihop Paths: https://datatracker.ietf.org/doc/html/rfc5883

## Issues Found
- Clarified that the speaker-pod `frr` container workflow applies to MetalLB direct FRR mode. Current MetalLB documentation says FRR-K8s is the default BGP backend, while direct FRR mode is a separate mode.
- Replaced the `show logging` log-viewing example with `kubectl logs -n metallb-system "$SPEAKER_POD" -c frr`. FRR `show logging` displays logging configuration and destination status, not the emitted container log output.
- Replaced `show logging` in the vtysh command mindmap with `terminal monitor`, which is the vtysh command for live log messages.
- Corrected the BFD port guidance to distinguish single-hop control packets on UDP 3784, echo mode on UDP 3785, and multihop BFD on UDP 4784.
- Revised the received-routes explanation to avoid implying that ECMP normally requires routers to advertise prefixes back to MetalLB speakers.
- Fixed the troubleshooting flowchart so BGP checks occur after a service has an External IP. BGP session state does not control Kubernetes LoadBalancer IP assignment.

## Review Notes
The main vtysh command examples are consistent with FRR command syntax and MetalLB's direct FRR mode troubleshooting workflow. Future updates could add a separate FRR-K8s command path for clusters using the current default backend.
