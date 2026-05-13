# Validation Summary: How to Migrate to Calico Host Endpoint Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source host endpoints
- Calico GlobalNetworkPolicy
- Calico host endpoint policy for forwarded traffic
- Kubernetes
- `calicoctl`
- `kubectl`
- YAML manifests

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host endpoint creation guide: https://docs.tigera.io/calico/latest/reference/host-endpoints/objects
- Calico host forwarded traffic policy guide: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl` user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Felix configuration and health reporting reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The `GlobalNetworkPolicy` example matched destination ports without an explicit protocol. Calico's policy examples specify a Layer 4 protocol when matching ports, and the listed ports are TCP services, so I added `protocol: TCP` to the ingress rule.

## Review Notes
- The `HostEndpoint` fields `interfaceName`, `node`, and `expectedIPs` match the current Calico `projectcalico.org/v3` resource schema.
- The `GlobalNetworkPolicy` fields `selector`, `applyOnForward`, `preDNAT`, `ingress`, `egress`, and `types` match the current Calico resource schema. `applyOnForward: true` is appropriate when the policy should also apply to forwarded traffic through host endpoints.
- Calico documents that creating host endpoints without matching policy or profiles can deny traffic except failsafe rules, so the post's warning about avoiding node lockout is technically important.
- The `calicoctl apply -f` and `calicoctl get hostendpoints -o wide` command shapes are consistent with the official command references; `hostendpoints` is a documented alias for the `HostEndpoint` resource.
