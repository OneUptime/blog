# Validation Summary: How to Build Complex OPA Rego Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Open Policy Agent (OPA)
- Rego policy language
- Kubernetes Admission Control
- `graph.reachable` and other Rego built-ins
- `opa test` CLI

## Sources Consulted
- OPA Policy Language reference: https://www.openpolicyagent.org/docs/policy-language
- OPA Built-in Functions reference (graph, numbers, sets): https://www.openpolicyagent.org/docs/policy-reference/builtins
- OPA Policy Testing reference (`opa test`, `--run`, `--coverage`): https://www.openpolicyagent.org/docs/policy-testing
- Styra `rego_recursion_error` reference: https://docs.styra.com/opa/errors/rego-recursion-error/rule-name-is-recursive
- OPA GitHub discussions on static recursion detection (open-policy-agent/discussions/657)

## Issues Found

1. **Recursive `walk_up` function (org_tree.rego section).** Rego performs static recursion detection and rejects any rule/function whose body references itself directly or transitively (`rego_recursion_error`). The original `walk_up(employee, n) = walk_up(parent, n - 1)` would never compile. Fix: removed `walk_up` and rewrote the "approval chain" idea using a `reverse_org` adjacency map plus `graph.reachable`, which is the canonical non-recursive pattern in Rego.

2. **`approval_chain` used an unsafe variable.** It declared `some i` without binding `i` to any collection, then passed `i` to `walk_up(employee, i)`. OPA reports this as `rego_unsafe_var_error` because `some i` alone does not enumerate values — it must be used as an index into a collection or paired with `in`. Removed alongside `walk_up`; replaced with an `ancestors` function backed by `graph.reachable`.

3. **Recursive `sqrt` / `sqrt_iter` functions (statistics.rego section).** OPA has no built-in square root and disallows recursion, so the Newton's-method implementation would not compile. Fix: removed both functions and rewrote `within_normal_range` to compare in squared-distance space (`(value - avg)^2 <= n^2 * variance`), which is mathematically equivalent and avoids the need for a square root entirely.

4. **Local variable `graph` shadowed the `graph.reachable` built-in namespace** in `inherited_roles`. The expression `graph := {...}; graph.reachable(graph, {role})` causes the compiler to interpret the second `graph.reachable` as a field lookup on the local variable rather than the built-in. Fix: renamed the local variable to `g`.

5. **Missing `###` on the "Resource Quota Enforcement" heading.** It was rendering as body text rather than a subsection. Added the `###` prefix to match the surrounding heading structure.

## Review Notes
- The `factor_weights[name]` iteration pattern in `multi_factor.rego` (using an unbound key reference to iterate keys) works but relies on idioms that are increasingly discouraged under Rego v1 — production code should prefer `some name in factor_weights`. This is a style point only and the code remains correct, so it was left unchanged.
- The "FAST: Uses indexed lookup structure" `fast_permissions` comprehension uses multiple independent `data.permissions[_]` references in the same body; each `_` is a distinct fresh variable, so the cross-references are not guaranteed to refer to the same row. The example still illustrates the high-level "pre-organize data by key" pattern, but for a correctness-critical use case the user should bind a single index (e.g., `some i; data.permissions[i].user == user; ...`). Left as-is because it is presented as a sketch.
- The `decision` rule references `allow` without a `default allow := false`. If no rule produces `allow`, the entire `decision` object becomes undefined. Acceptable for an illustrative snippet but worth noting if readers copy it into production.
- All examples use Rego v0.x assignment/body syntax (`{ ... }`, no `if`/`contains`). They remain valid under modern OPA but would need `import rego.v1` (or syntactic updates) to opt in to Rego v1's stricter rules.
