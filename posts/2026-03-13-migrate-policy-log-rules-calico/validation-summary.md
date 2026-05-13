# Validation Summary: How to Migrate Existing Rules to Calico Policy Log Rules in Calico

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico Open Source network policy
- Calico `NetworkPolicy` and `GlobalNetworkPolicy` resources
- Calico policy log rules
- Kubernetes `NetworkPolicy`
- `calicoctl` and `kubectl`

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: GlobalNetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: calicoctl get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl user reference and resource aliases - https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The introduction described Calico log rules as providing security controls. Calico `Log` rules are diagnostic: they log matching traffic and policy evaluation continues to the next rule. Updated the wording to describe diagnostic visibility.
- The replacement policy example did not include an `action: Log` rule, so it was not actually a policy logging example. Added a `Log` rule before the existing `Allow` rule so matching traffic is logged while preserving the allow behavior.

## Review Notes
- The `calicoctl get networkpolicies --all-namespaces -o yaml` command uses a documented Calico resource alias and valid `--all-namespaces` flag.
- The Calico `NetworkPolicy` API version, namespace placement, `order`, selector syntax, `types`, `ingress`, `source.selector`, and rule `action` fields match the current Calico resource reference.
- Calico documentation warns that log policies can affect cluster performance if left in place, so production migrations should remove temporary log policies after testing.
