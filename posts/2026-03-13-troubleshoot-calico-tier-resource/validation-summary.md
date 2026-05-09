# Validation Summary: Troubleshoot Calico Tier Resource

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Calico Tier resources
- Calico GlobalNetworkPolicy resources
- Kubernetes RBAC
- `calicoctl`
- `kubectl`
- Python command-line JSON parsing

## Sources Consulted
- Calico Tier resource documentation: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico policy tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico `calicoctl get` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl patch` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- Corrected the Issue 3 explanation of `Pass` and tier fall-through behavior. Calico tiers have an implicit deny when a tier applies to an endpoint but takes no action, unless the tier has `defaultAction: Pass`; a tier with no policy applying to the endpoint is skipped.
- Replaced the Issue 3 `calicoctl get globalnetworkpolicies -o wide | grep "tier.*order"` command with JSON parsing that lists policies containing `Pass` rules, because the original command relied on fragile table output and did not reliably inspect rule actions.
- Fixed the Issue 4 Python RBAC filter. The original `'calico\|security\|network' in name.lower()` expression was a literal substring check, not a regex or alternation, so it would not match the intended names.
- Updated the Issue 5 log filter to `grep -Ei "tier"` for clear case-insensitive matching.

## Review Notes
The post is technically relevant and the corrected Calico tier evaluation guidance matches current Calico Open Source documentation. `calicoctl` is not installed in the local review environment, so CLI behavior was verified against official Calico documentation rather than live cluster output.
