# Validation Summary: How to Implement RBAC Best Practices in Kubernetes

## Status
validated

## Post Type
Guide / Tutorial (production-oriented best-practices walkthrough with YAML manifests and CLI commands)

## Technologies Covered
- Kubernetes RBAC (Role, ClusterRole, RoleBinding, ClusterRoleBinding)
- Kubernetes ServiceAccounts and token automounting
- Aggregated ClusterRoles
- `kubectl` (auth can-i, get, -v verbosity)
- `kubectl krew` plugins: `who-can`, `access-matrix` (rakkess)
- `jq` for RBAC auditing

## Sources Consulted
- Kubernetes RBAC reference — https://kubernetes.io/docs/reference/access-authn-authz/rbac/ (additive-only authorization / no deny rules; PolicyRule structure; aggregated ClusterRoles; default `view`/`edit`/`admin`/`cluster-admin` roles)
- Kubernetes ServiceAccount configuration — https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/ (`automountServiceAccountToken` at SA and pod level)
- `kubectl auth can-i` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/ (`--list`, `--as`, `-n`)
- aquasecurity/kubectl-who-can — https://github.com/aquasecurity/kubectl-who-can (krew install, usage)
- corneliusweig/rakkess (access-matrix) — https://github.com/corneliusweig/rakkess (krew install, usage)

## Issues Found
1. **Read-Only Role incorrectly claimed to "deny" secrets via empty verbs (fixed).**
   The original `readonly` ClusterRole granted `apiGroups: [""]` with `resources: ["*"]` and read verbs, which *includes* `secrets`, then attempted to exclude secrets with a separate rule using `verbs: []` and a comment stating "empty verbs means no access." This is incorrect:
   - Kubernetes RBAC is purely additive and has **no deny rules**, so the empty-verbs rule cannot subtract the access already granted by the wildcard.
   - A PolicyRule with an empty `verbs` list is **invalid** and rejected by the API server ("verbs: Required value: verbs must contain at least one value"), so the manifest as written would not apply.
   - Net effect: the role actually granted read access to all secrets, directly contradicting the surrounding text.

   **Fix:** Replaced the core-group wildcard with an explicit enumeration of common core resources (`pods`, `services`, `configmaps`, `persistentvolumeclaims`, `namespaces`, `events`, `nodes`) so secrets are genuinely never granted, removed the invalid empty-verbs rule, and corrected the prose to explain that RBAC is additive with no deny rules (so exclusion must be done by omission, not subtraction).

## Review Notes
- All other manifests are syntactically valid and use current, non-deprecated APIs (`rbac.authorization.k8s.io/v1`, `apps/v1`, `v1`).
- The RBAC building-blocks diagram is accurate: a RoleBinding may reference either a Role or a ClusterRole, while a ClusterRoleBinding may only reference a ClusterRole.
- The combined `apiGroups`/`resources` lists in the developer Role (e.g. `["", "apps", "batch"]` with mixed resources) are a common simplification; RBAC matches a request only when the resource genuinely belongs to one of the listed groups, so these rules work as intended even though they read as a cartesian product.
- `kubectl get pods -v=6` does surface API request URLs; deeper RBAC/authorization decision detail typically requires higher verbosity (`-v=8`/`-v=9`) or API server audit logs, but the example is not incorrect as written.
- The wildcard-detection `jq` audit query (`select(.rules[]?.resources[]? == "*" and .rules[]?.verbs[]? == "*")`) can match a role that has a `*` resource in one rule and a `*` verb in a *different* rule (not necessarily the same rule). It is a reasonable first-pass heuristic for surfacing candidates and was left as-is, but readers should treat its output as candidates to inspect rather than definitive wildcard-admin roles.
- Plugin names (`who-can`, `access-matrix`) and their krew install/usage commands are correct and current.
