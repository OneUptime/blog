# Validation Summary: How to Test BGP Security Designs in Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Calico (CNI plugin)
- Kubernetes
- BGP (Border Gateway Protocol)
- BGP MD5 session authentication
- Calico BGPPeer resource
- Calico BGPFilter resource
- kubectl / calicoctl

## Sources Consulted
- Calico latest BGPFilter reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico latest BGPPeer reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico v3.26 BGPFilter reference: https://archive-os-3-26.netlify.app/calico/3.26/reference/resources/bgpfilter
- Calico v3.27 BGPFilter reference: https://archive-os-3-27.netlify.app/calico/3.27/reference/resources/bgpfilter
- Calico v3.28 BGPFilter reference: https://archive-os-3-28.netlify.app/calico/3.28/reference/resources/bgpfilter
- Calico v3.29 BGPFilter reference: https://docs.tigera.io/calico/3.29/reference/resources/bgpfilter
- Calico v3.26 BGPPeer reference: https://archive-os-3-26.netlify.app/calico/3.26/reference/resources/bgppeer
- GitHub issue tracking BGPFilter prefixLength feature: https://github.com/projectcalico/calico/issues/8376

## Issues Found

1. **Incorrect minimum version requirement.** The post listed `calicoctl v3.26+` as a prerequisite. While BGPFilter and BGPPeer's `password.secretKeyRef` and `filters` fields were available in v3.26, the BGPFilter `prefixLength` field (with `min` / `max` sub-fields) used in the prefix length filter example was not added until Calico v3.29 (issue #8376, PR #9114). Verified by checking the v3.26, v3.27, and v3.28 archived BGPFilter docs — none of them list `prefixLength`. The v3.29 docs do. Updated the prerequisite to `calicoctl v3.29+ (required for BGPFilter prefixLength support)`.

2. **Missing `matchOperator` in BGPFilter rules.** The two `Reject` rules under "Configure Prefix Length Filters" specified `cidr: 0.0.0.0/0` together with `prefixLength`, but omitted `matchOperator`. The official Calico v3.29 example for `prefixLength` filtering pairs `cidr` with `matchOperator: In` (e.g. `matchOperator: In, cidr: 55.0.0.0/16, prefixLength: {min: 30}`). Without `matchOperator`, the cidr match semantic is undefined and the rule will not behave as the post describes. Added `matchOperator: In` to both rules so the rules read "reject any IPv4 route whose prefix length falls in the bad range".

## Review Notes

- The BGPPeer `password.secretKeyRef` (with `name` and `key`) field is correct and current.
- The BGPPeer `filters` field accepting a list of BGPFilter names is correct.
- `kubectl create secret generic ... -n calico-system` is correct for operator-based Calico installations; manifest-based installs would use `kube-system` instead. The post implicitly assumes the operator install — this is reasonable but is worth noting.
- The terminal `Accept` rule with no match constraints is intentional and acts as the default-allow tail of the rule chain.
- Stylistic observation only (not changed): the post is titled "Test BGP Security Designs ... with Live Workloads" but only configures the controls; it does not show how to drive route-injection traffic against the peer to verify the rejects actually fire. Future iterations could add a verification step (e.g. `calicoctl node status`, BIRD logs, or peer-side `show ip bgp neighbors` output).
- AS path filtering and session logging appear in the security-layers diagram but are not configured in the post. This is consistent with the introduction noting that prefix length and MD5 are "most relevant" for internal clusters, so no change made.
