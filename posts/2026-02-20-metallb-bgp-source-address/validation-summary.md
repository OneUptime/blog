# Validation Summary: How to Configure the BGP Source Address in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- BGPPeer custom resources
- Linux networking commands
- FRRouting verification commands

## Sources Consulted
- MetalLB API reference: https://metallb.io/apis/
- MetalLB advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB BGP configuration guide: https://metallb.io/configuration/
- MetalLB BGP concepts: https://metallb.io/concepts/bgp/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- RFC 4271, Border Gateway Protocol 4: https://datatracker.ietf.org/doc/html/rfc4271
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Linux ip-route manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux ss manual: https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- The original examples used `sourceAddress` without `nodeSelectors`. MetalLB documents that `sourceAddress` is usually meaningful only for per-node peers because the address must exist locally on the node where the speaker runs. I added `nodeSelectors` to the example `BGPPeer` resources and clarified that the peer should be scoped to the node that owns the source address.
- The original post implied that `sourceAddress` always overrides kernel source selection and that MetalLB simply cannot use a missing local address. MetalLB's documentation states that if the configured address is not found locally, the default kernel source address selection behavior takes place. I updated the comments, common mistakes section, and summary to reflect that behavior.
- The "Wrong subnet" mistake was too narrow. A BGP source address does not strictly need to be on the same subnet as the peer in all routed designs, but the node and router must have working reachability for traffic sourced from that address. I changed the item to focus on reachability from the selected address.

## Review Notes
The MetalLB `BGPPeer` examples use the current `metallb.io/v1beta2` API, and the `sourceAddress`, `myASN`, `peerASN`, `peerAddress`, and `nodeSelectors` fields match the current MetalLB API reference. The Kubernetes commands are syntactically valid, but `kubectl` was not installed in the local environment, so command verification used the official Kubernetes reference instead of local `kubectl --help` output.
