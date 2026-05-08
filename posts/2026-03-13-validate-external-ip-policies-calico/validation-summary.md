# Validation Summary: How to Validate External IP Policies Before Production in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- `calicoctl`
- `kubectl`
- YAML
- Python / PyYAML
- GitHub Actions

## Sources Consulted
- Calico documentation: Use external IPs or networks rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Calico documentation: calicoctl validate - https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes documentation: Labels and selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The schema validation command used `calicoctl apply -f "$f" --dry-run`, but the official `calicoctl apply` reference does not document a `--dry-run` option. Changed it to `calicoctl validate -f "$f"`, which is the documented offline validation command for Calico resource files.
- The introduction described "External IP Policies" as though it were a distinct Calico resource. Calico Open Source documents external IP/CIDR matching as policy rule fields and reusable `NetworkSet` / `GlobalNetworkSet` resources. Updated the terminology while preserving the post's intent.
- The selector validation script converted a Calico selector such as `label == 'value'` into a Kubernetes selector using only the label key, which would match any value for that key rather than validating the exact selector. Updated the script to translate simple Calico equality and `has(...)` selectors into valid `kubectl -l` selectors, respect `NetworkPolicy` namespaces, and warn when a selector is too complex to translate safely.
- The architecture diagram showed an external IP policy allowing traffic to a destination pod. Updated it to show traffic to an external IP or network, and changed "No Match / Deny" to "Deny Rule or Default Deny" to avoid implying every unmatched packet is automatically denied in all Calico pod-policy contexts.
- Added PyYAML to the prerequisites because the selector validation script imports `yaml`.

## Review Notes
The CI example only runs `yamllint`, which checks YAML syntax/style but does not validate Calico policy semantics. The corrected schema validation step uses `calicoctl validate`; future revisions could also install and run `calicoctl validate` directly in the GitHub Actions workflow.
