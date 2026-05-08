# Validation Summary: How to Use calicoctl patch with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico Enterprise / Calico Cloud
- calicoctl
- Kubernetes networking
- Calico IPPool, BGPConfiguration, GlobalNetworkPolicy, FelixConfiguration, and Node resources
- Bash and jq

## Sources Consulted
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Cloud FelixConfiguration resource reference for flow log settings: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The introduction incorrectly said `calicoctl patch` modifies resources using JSON Merge Patch and implied JSON Merge Patch / JSON Patch are usable with `--type`. Updated it to say `calicoctl patch` defaults to strategic merge patch and that the current help text lists JSON Patch and JSON Merge Patch as not yet implemented.
- The prerequisites and basic syntax still referred to JSON merge patch / `json_patch`. Updated those references to strategic merge patch semantics and a generic patch JSON argument.
- The IPIP and VXLAN examples changed one tunnel mode without clearing the other. Calico IPPool documentation says `ipipMode` and `vxlanMode` cannot both be enabled, so the examples now set the other mode to `Never`.
- The "Conditional Patching" example claimed it disabled IP pools with no allocations but did not check allocations; it disabled every pool. Renamed the example and comment so the description matches the actual script behavior.

## Review Notes
The flow log example uses `flowLogsFlushInterval`, which is not part of the Calico Open Source FelixConfiguration reference but is documented in the Calico Cloud / Enterprise FelixConfiguration reference. The post already labels that example as Calico Enterprise only.
