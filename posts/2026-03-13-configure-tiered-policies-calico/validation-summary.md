# Validation Summary: How to Configure Calico Tiered Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- Calico Tier
- calicoctl
- kubectl
- YAML

## Sources Consulted
- Calico Open Source Tier resource documentation: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico Open Source tiered policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Open Source NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds

## Issues Found
- The policy example discussed tiered policies but did not create a `Tier` resource or assign the `NetworkPolicy` to a tier. Added a `Tier` named `security` and set `spec.tier: security` on the policy so the example actually demonstrates tiered policy configuration.
- The example test used `http://target-service:8080`, but the egress rule only allowed ports `443` and `80`. Added port `8080` to the egress destination ports so the test traffic matches the policy.
- The ingress rule allowed sources with `app == 'authorized'`, but the test pod was not labeled in the commands. Added a `kubectl label pod` command before the test so the source selector can match.
- The verification command listed network policies without checking the configured tier. Added `calicoctl get tiers` and a `kubectl get networkpolicies.projectcalico.org` command with `--field-selector spec.tier=security` to verify the tiered policy placement.

## Review Notes
The current Calico Open Source documentation describes tiers as ordered collections of Calico `NetworkPolicy` and `GlobalNetworkPolicy` resources, processed by tier order and policy order. It also notes that `Allow` and `Deny` actions are final, while `Pass` continues evaluation into the next applicable tier. Future improvements could include an explicit deny-path test and a short note that `projectcalico.org/v3` resources may be managed directly with `kubectl` when the Calico API server or native v3 CRDs are available.
