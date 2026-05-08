# Validation Summary: How to Validate Calico Tiered Policies Before Production in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source policy tiers
- Calico `Tier`, `GlobalNetworkPolicy`, and `NetworkPolicy` resources
- Calico `calicoctl`
- Kubernetes pods and label selectors
- GitHub Actions CI workflows
- YAML and Python validation scripting

## Sources Consulted
- Calico `calicoctl validate` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico `calicoctl apply` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl get` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `Tier` resource documentation: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico `GlobalNetworkPolicy` resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico `calicoctl` installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Official `actions/checkout` repository: https://github.com/actions/checkout

## Issues Found
- The schema validation command used `calicoctl apply -f "$f" --dry-run`, but the documented `calicoctl apply` options do not include `--dry-run`. Changed it to `calicoctl validate -f "$f"`, which is the documented offline validation command for Calico resource structure, syntax, and Calico-specific validation rules.
- The introduction described tiered policy support only through `GlobalNetworkPolicy` and `NetworkPolicy`, omitting the `Tier` resource itself. Updated the sentence to include `Tier`.
- The selector validation script parsed Calico selectors with a simple string split and passed only the label key to `kubectl -l`, which could report a match even when the selector value did not match. Updated it to validate only simple equality selectors, pass `key=value` to `kubectl`, use `-o name` for reliable empty-result detection, and warn when selectors are too complex for this lightweight Kubernetes label check.
- The GitHub Actions snippet used `actions/checkout@v3`, which is outdated relative to the current official checkout action. Updated it to `actions/checkout@v6`.
- The CI snippet only ran `yamllint`, which checks YAML formatting but not Calico resource semantics. Added an install step for `calicoctl` using a configurable Calico version and a `calicoctl validate -f "$f"` check.
- The architecture diagram implied all no-match cases are denied. Updated the label to "Deny or Tier Default Drop" to align with Calico's tier evaluation behavior.

## Review Notes
The selector script is intentionally limited to simple pod label equality selectors. Calico supports richer selector expressions and special labels; those are covered syntactically by `calicoctl validate`, but a complete semantic match check would need a Calico-aware query or a purpose-built test harness. In real CI, set `CALICO_VERSION` to match the Calico version running in the target cluster.
