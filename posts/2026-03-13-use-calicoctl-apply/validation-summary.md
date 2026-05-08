# Validation Summary: How to Use calicoctl apply with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes API datastore / Calico CRDs
- GlobalNetworkPolicy
- BGPPeer
- IPPool
- Felix, confd, BIRD / BGP routing

## Sources Consulted
- Calico Open Source 3.32 calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source 3.32 calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source 3.32 calicoctl create reference: https://docs.tigera.io/calico/latest/reference/calicoctl/create
- Calico Open Source 3.32 calicoctl replace reference: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico Open Source 3.32 calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source 3.32 GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source 3.32 BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source 3.32 IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source 3.32 component architecture reference: https://docs.tigera.io/calico/latest/reference/architecture/overview

## Issues Found
- The introduction compared `calicoctl apply` too closely to `kubectl apply`. Calico's documentation says `apply` creates missing resources and replaces the complete spec for existing resources, so the wording was changed to state that full-spec replacement behavior.
- The `calicoctl apply -f policy.yaml --dry-run` command was incorrect for current Calico documentation. The documented offline validation command is `calicoctl validate -f policy.yaml`, so the example and conclusion were updated accordingly.
- The BGPPeer example used `keepOriginalNextHop`, which is deprecated. It was replaced with `nextHopMode: Keep`, the documented replacement field.
- The architecture diagram showed the Tigera Operator watching applied Calico resources and reconciling them into `calico-node / Felix`. That is misleading for these resources. The diagram now shows Calico components such as Felix, confd, and IPAM consuming datastore state and programming `calico-node` behavior.
- The patch example was described as JSON patch, but current `calicoctl patch` defaults to strategic merge patch and documents JSON Patch as not yet implemented. The comment now says strategic merge patch.

## Review Notes
The YAML examples for GlobalNetworkPolicy and IPPool use current `projectcalico.org/v3` resource kinds and valid fields. The default-deny policy is syntactically valid, but in production it should be applied carefully because selecting `all()` globally for both ingress and egress can immediately disrupt workload and host endpoint traffic.
