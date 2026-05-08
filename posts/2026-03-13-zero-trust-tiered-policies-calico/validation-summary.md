# Validation Summary: Zero Trust with Calico Tiered Policies in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico Tier resources
- Calico GlobalNetworkPolicy resources
- Calico NetworkPolicy resources
- kubectl

## Sources Consulted
- Calico Open Source policy tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Open Source 3.30 policy tiers documentation: https://docs.tigera.io/calico/3.30/network-policy/policy-tiers/tiered-policy
- Calico Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Tigera announcement for Calico OSS 3.29 policy tiers: https://www.tigera.io/blog/whats-new-in-calico-fall-2024-enhancements-for-kubernetes-networking-and-security/

## Issues Found
- The post claimed Calico v3.26+ was sufficient for Calico Open Source tiered policies. Tigera's Calico OSS 3.29 announcement identifies policy tiers as introduced in Calico OSS 3.29, so I changed the prerequisite to Calico v3.29+.
- The policy examples described tiered policies but did not create a `Tier` or set `spec.tier` on the policies. Without an explicit tier, Calico places policies in the default tier. I added a `zero-trust` `Tier` and set `tier: zero-trust` on both example policies.
- The `GlobalNetworkPolicy` default deny used `selector: all()`, which can also select host endpoints in addition to workload endpoints. I scoped it to Kubernetes workload endpoints with `projectcalico.org/orchestrator == "k8s"` to match the pod-focused zero trust example.

## Review Notes
The example still assumes the `unauthorized-pod`, `protected-service`, namespace, DNS service behavior, and `trust == 'verified'` labels already exist in the reader's cluster. That is acceptable for a compact guide, but a future revision could include setup commands for a fully reproducible test.
