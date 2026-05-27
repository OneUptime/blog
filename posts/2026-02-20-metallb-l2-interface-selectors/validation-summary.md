# Validation Summary: How to Select Specific Network Interfaces for L2 Announcements in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- MetalLB `IPAddressPool`
- MetalLB `L2Advertisement`
- Layer 2 ARP/NDP announcements
- `kubectl`

## Sources Consulted
- MetalLB advanced L2 configuration: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB troubleshooting guide: https://metallb.io/troubleshooting/index.html
- MetalLB release notes: https://metallb.io/release-notes/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post claimed that `L2Advertisement.spec.interfaces` supports regex interface matchers. MetalLB's official API reference defines this field as a string array of interface names, and the advanced L2 configuration examples use exact interface names. I replaced the regex section with a supported pattern that combines exact interface names with `nodeSelectors` for nodes that use different interface names.
- The post advised using regex patterns for inconsistent interface naming. I updated that pitfall to recommend separate `L2Advertisement` resources with `nodeSelectors`, or consistent host interface naming.
- The post said MetalLB silently ignores missing interfaces. The official docs warn that interface selection does not affect leader choice, and if the elected leader does not have the selected interface, the service is not announced. I updated the warning to match that behavior.
- The conclusion said `interfaces` supports both exact names and regex patterns. I corrected it to state that `interfaces` supports exact interface names and can be combined with `nodeSelectors`.

## Review Notes
The remaining MetalLB CRD examples use current `metallb.io/v1beta1` resources and field names. The `kubectl apply`, `kubectl get`, and `kubectl logs --tail` commands use valid kubectl syntax. The `arping` verification examples are conceptually correct, but operators must run them from hosts attached to the relevant L2 segment and adjust local interface names as needed.
