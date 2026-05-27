# Validation Summary: How to Scope IPAddressPool Allocation to Specific Namespaces in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Services of type LoadBalancer
- MetalLB
- MetalLB IPAddressPool custom resources
- Kubernetes namespace labels and label selectors

## Sources Consulted
- MetalLB Advanced AddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB API reference for IPAddressPool and ServiceAllocation: https://metallb.io/apis/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The fallback pool comment said it is used only when no namespace-specific pool matches. MetalLB sorts all matching pools by priority and uses the highest-priority matching pool with available IPs, so the fallback pool may also be used when a more specific matching pool is exhausted. Updated the wording to reflect priority-based selection.
- The allocation flow said MetalLB skips the default pool. Because the unscoped fallback pool also matches the service, MetalLB considers it after higher-priority matching pools. Updated the note to say MetalLB uses the highest-priority matching pool with available IPs.
- The testing section used `frontend` and `backend` namespaces and expected `10.0.10.0/28` and `10.0.20.0/28`, but the earlier examples configured `team-a`, `team-b`, `10.0.1.0/28`, and `10.0.2.0/28`. Updated the commands and expected ranges to match the configured examples.
- The common pitfalls table described same-priority pool selection as undefined. MetalLB documentation states that if multiple matching IPAddressPools have the same priority, the choice is random. Updated the wording.

## Review Notes
The MetalLB CRD examples use the current `metallb.io/v1beta1` IPAddressPool API and valid `serviceAllocation` fields. The kubectl examples use valid `kubectl expose`, `kubectl label`, and JSONPath output syntax. The example address `203.0.113.0/28` is from the documentation-only TEST-NET-3 range; it is acceptable as an example but should be replaced with an address range routable in the user's actual network before deployment.
