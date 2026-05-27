# Validation Summary: How to Tune BFD Receive and Transmit Intervals in MetalLB

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Kubernetes
- MetalLB FRR mode
- MetalLB `BFDProfile` and `BGPPeer` custom resources
- Bidirectional Forwarding Detection (BFD)
- FRRouting BFD CLI
- `kubectl`

## Sources Consulted
- MetalLB API reference for `BFDProfile` and `BGPPeer`: https://metallb.io/apis/
- MetalLB configuration guide for enabling BFD with FRR-based modes: https://metallb.io/configuration/
- FRRouting BFD documentation for timer fields, jitter, and `show bfd` commands: https://docs.frrouting.org/en/latest/bfd.html
- RFC 5880, Bidirectional Forwarding Detection, especially timer calculation and packet transmission rules: https://datatracker.ietf.org/doc/html/rfc5880
- Kubernetes `kubectl top pod` reference for label selector usage: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes documentation for `kubectl patch` merge patch usage: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found
- The post described BFD transmit negotiation correctly at a high level, but omitted protocol jitter. Updated the explanation and packet-rate guidance to note that FRR/BFD jitters control packet transmission, so observed packet counts are approximate.
- The packet-rate section labeled detection time as if it depended only on the local configured interval and multiplier. Updated the table heading and summary to clarify that the simple formula is an approximation for symmetric configurations.
- The baseline measurement section said the BFD interval itself must be larger than worst-case latency. RFC 5880 defines failure based on detection time, not a bare interval, so this was changed to say detection time must cover delay, jitter, and processing pauses.
- The multiplier section said higher packet rates are useful for "catching intermittent issues." The more precise behavior is tolerance of brief packet-loss bursts within the same detection window, so the wording was corrected.
- The asymmetric interval example implied MetalLB's receive interval alone determines MetalLB's router-failure detection time. RFC 5880 calculates local detection from the peer's detect multiplier and agreed transmit interval, so the example now states its router-side assumptions and notes that exact values depend on the router's advertised timers and multiplier.

## Review Notes
The `BFDProfile` snippets use the current `metallb.io/v1beta1` API and valid fields: `receiveInterval`, `transmitInterval`, `detectMultiplier`, `echoMode`, `passiveMode`, and `minimumTtl`. The `BGPPeer` `bfdProfile` patch is consistent with the current `metallb.io/v1beta2` `BGPPeer` schema. The FRR commands `show bfd peers` and `show bfd peers counters` match current FRRouting documentation. Local `kubectl` and `vtysh` binaries were not available in this workspace, so command verification used official Kubernetes and FRRouting documentation.
