# Validation Summary: How to Validate Calico Namespace-Based Policies Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes namespaces and labels
- Kubernetes label selectors
- kubectl
- calicoctl
- Bash
- Python 3
- Mermaid

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico namespace policy guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl installation notes: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction said a policy referencing a missing namespace label would "silently fail to apply." Calico accepts syntactically valid policies even when a selector currently matches no namespaces, so this was changed to say the policy still applies but the selector matches no namespaces.
- The namespace selector validation script used a piped `while` loop, so `EXIT_CODE=1` was set in a subshell and the script could still exit successfully. The loop now uses a here-string so failures affect the final exit code.
- The namespace selector validation script parsed Calico selector expressions with `cut -d=`, which was fragile and only accidentally worked for some `==` expressions. It now explicitly accepts simple Calico equality selectors and reports unsupported selector forms instead of producing misleading results.
- The namespace selector validation script passed a Calico selector directly to `kubectl -l`, but `kubectl` uses Kubernetes label-selector syntax. The script now converts simple Calico equality selectors to Kubernetes `key=value` selectors before querying namespaces.
- The schema validation step used `calicoctl apply --dry-run`, which is not the documented Calico validation command. It now uses `calicoctl validate -f`, which validates Calico resource files without applying them.

## Review Notes
- The namespace selector script intentionally validates simple equality selectors such as `environment == 'production'`. More complex Calico selectors using `&&`, `||`, `in`, `has()`, or `global()` would need a fuller selector evaluator or an integration test against a staging cluster.
- `kubectl` and `calicoctl` were not installed in this workspace, so command checks were performed against official documentation rather than local CLI help.
