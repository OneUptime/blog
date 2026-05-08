# Validation Summary: How to Validate Calico Policy Log Rules Before Production in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico `GlobalNetworkPolicy` and `NetworkPolicy` resources
- Calico log rules and `Log` actions
- `calicoctl`
- Kubernetes `kubectl`
- GitHub Actions
- YAML and Python validation scripts

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: Global network policy resource and rule actions - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Network policy resource and selectors - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: `calicoctl validate` - https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico documentation: `calicoctl apply` - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes documentation: `kubectl get` and label selector flag - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes documentation: Labels and selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- GitHub Actions checkout documentation - https://github.com/actions/checkout

## Issues Found
- The schema validation command used `calicoctl apply -f "$f" --dry-run`, but current `calicoctl apply` documentation does not list a `--dry-run` flag. Changed it to `calicoctl validate -f "$f"`, which is the documented offline validation command for Calico resource structure, syntax, selectors, and Calico-specific rules.
- The selector validation script parsed a Calico selector by splitting on `==` and passed only the label key to `kubectl -l`, which would test label existence rather than the intended key/value selector. Updated the script to translate only simple Calico equality selectors and `has(label)` selectors to Kubernetes label selectors, skip complex Calico selectors, use `--no-headers`, and report `kubectl` failures.
- The CI example invoked `yamllint` without installing it and did not run Calico schema validation. Added an installation step for `yamllint` and `calicoctl`, updated `actions/checkout` from v3 to v4, and added `calicoctl validate -f "$f"` to the validation loop.
- The architecture diagram implied that a log rule directly allows or blocks traffic. Calico documentation states that after a `Log` action, processing continues with the next rule. Updated the diagram to show logging followed by the later allow or deny verdict.
- The introduction described "Policy Log Rules" as if they were a separate fine-grained control mechanism. Adjusted wording to describe Calico log rules as policy visibility using `Log` actions in `GlobalNetworkPolicy` and `NetworkPolicy`.
- The conclusion recommended maintaining comprehensive logging, but Calico documentation warns temporary log rules can add significant overhead and should be removed when testing is complete. Updated the conclusion to include removing temporary log rules after validation.

## Review Notes
The post remains a concise guide rather than a complete production workflow. Future improvements could include showing a concrete `GlobalNetworkPolicy` or `NetworkPolicy` with `action: Log` followed by an explicit `Allow` rule, because Calico recommends pairing log actions with a following allow rule when testing policy behavior.
