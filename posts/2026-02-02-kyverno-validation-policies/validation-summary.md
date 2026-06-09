# Validation Summary: How to Implement Kyverno Validation Policies

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Kyverno (policy engine for Kubernetes)
- Kubernetes (admission controllers, ClusterPolicy, Policy, PolicyReport, NetworkPolicy, Pod, Deployment)
- Helm (chart installation)
- kubectl (CLI usage)
- Prometheus / ServiceMonitor / PrometheusRule (monitoring and alerting)
- JMESPath (used in Kyverno conditions/contexts)
- Pod Security Standards (Baseline profile)

## Sources Consulted
- Kyverno validation rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate.html
- Kyverno CLI usage: https://kyverno.io/docs/kyverno-cli/usage/
- Kyverno CLI install reference: https://kyverno.io/docs/kyverno-cli/install/
- Kyverno preconditions / JMESPath docs: https://kyverno.io/docs/policy-types/cluster-policy/preconditions.html, https://kyverno.io/docs/policy-types/cluster-policy/jmespath.html
- Kyverno Helm chart values: https://github.com/kyverno/kyverno/blob/main/charts/kyverno/values.yaml
- Homebrew formula for kyverno: https://formulae.brew.sh/formula/kyverno

## Issues Found
1. **Missing Markdown heading marker on "Resource Validation Policies"** — the line `Resource Validation Policies` was missing the leading `##`, so it rendered as plain text rather than a section heading. Fixed by adding the `##` prefix.
2. **Outdated Helm value `replicaCount`** — current Kyverno Helm chart uses split-controller values; the admission controller replica count is `admissionController.replicas`, not the top-level `replicaCount` used in older chart versions. Fixed the `helm install` command and accompanying comment to use `--set admissionController.replicas=3`.
3. **Non-existent CLI command `kyverno validate`** — the Kyverno CLI does not expose a `validate` subcommand (commands are `apply`, `test`, `create`, `jp`, `json`, `migrate`, `docs`, `version`, `completion`). Replaced with `kyverno test .`, which is the supported way to run policy tests defined in a `kyverno-test.yaml` file.
4. **Reference to non-existent built-in `request.namespaceNetworkPolicies`** — the `require-network-policy` example used `{{ request.namespaceNetworkPolicies }}`, which is not a Kyverno built-in context variable. Rewrote the rule to use an `apiCall` context that lists NetworkPolicies in the Deployment's namespace via the Kubernetes API and then denies when the resulting list is empty (the documented pattern for this kind of cross-resource check).

## Review Notes
- The blog uses the older `spec.validationFailureAction` / `validationFailureActionOverrides` syntax. This still works in current Kyverno releases but has been superseded by per-rule `validate.failureAction` and `validate.failureActionOverrides`. The older fields remain supported for compatibility, so this was not changed — but readers targeting newer Kyverno versions may want to migrate.
- The `disallow-latest-tag` policy's first rule (`require-image-tag`) requires an explicit tag via `image: "*:*"` patterns but does not itself block `:latest`; the second rule (`validate-image-tag`) is what actually denies `:latest` via the `AnyIn` operator with wildcard value. The combination works correctly; a simpler single-rule pattern (`image: "!*:latest"`) is the canonical example in the Kyverno policy library, but the author's approach is valid and was left intact.
- The `restrict-host-namespaces` example quotes the boolean values (`"false"`) when using the `=()` conditional anchor. Both quoted and unquoted forms are accepted by Kyverno's pattern engine, so this is fine.
- The `validate-resource-boundaries` rule compares Kubernetes resource quantities as strings via JMESPath (`[?@ > '4Gi']`); this performs lexicographic string comparison rather than true quantity comparison, so edge cases (e.g., `5G` vs `4Gi`) may not behave intuitively. The author's pattern is widely used in community examples and works for the common case but is worth noting.
- All Kyverno API versions used (`kyverno.io/v1`, `wgpolicyk8s.io/v1alpha2` for PolicyReport) match the current stable APIs.
- The `X()` negation anchor used in the `pss-baseline` policy is the documented Kyverno syntax for a field that must not be defined — verified against the official docs.
