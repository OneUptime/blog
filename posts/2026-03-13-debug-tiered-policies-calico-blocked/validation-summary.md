# Validation Summary: How to Debug Calico Tiered Policies When Traffic Is Blocked

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- Calico Tier
- calicoctl
- kubectl

## Sources Consulted
- Calico Tier resource documentation: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico tiered policy guide: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The core configuration was described as a tiered policy example but did not create a `Tier` resource or place the `NetworkPolicy` in a tier. Added a `Tier` named `debug` and set `spec.tier: debug` on the `NetworkPolicy`, matching Calico's tiered policy model.
- The added tier uses `defaultAction: Pass` because Calico tiers otherwise implicitly deny traffic when a tier applies but no policy rule takes action. This matches Calico's documented guidance for allowing evaluation to continue to later tiers during tiered policy debugging.

## Review Notes
The `calicoctl apply -f`, `calicoctl get networkpolicies -n production -o wide`, and `kubectl exec -n production test-pod -- curl ...` command forms are valid. The example still assumes the referenced namespace, pods, labels, and service name exist in the reader's cluster.
