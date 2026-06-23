# Validation Summary: How to Use Namespaces and RBAC to Keep Dev, Stage, and Prod Isolated

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Namespaces
- Kubernetes RBAC (Role, RoleBinding, ClusterRole)
- `kubectl` CLI (create, label, annotate, apply, auth can-i, config set-context)
- NetworkPolicies, ResourceQuotas, LimitRanges (mentioned)
- OIDC/SSO groups, ServiceAccounts as RBAC subjects

## Sources Consulted
- Kubernetes RBAC Authorization docs — https://kubernetes.io/docs/reference/access-authn-authz/rbac/ (Role/RoleBinding/ClusterRole schema and subject `apiGroup` requirements)
- Kubernetes Namespaces docs — https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- `kubectl` reference — https://kubernetes.io/docs/reference/kubectl/ (auth can-i, config set-context, label, annotate)
- Kubernetes RBAC subject validation behavior: User/Group subjects require `apiGroup: rbac.authorization.k8s.io`; ServiceAccount subjects require an empty apiGroup.

## Issues Found
- **Missing `apiGroup` on the `Group` subject in the RoleBinding (Section 4).** The original manifest listed a `kind: Group` subject without the `apiGroup` field. Kubernetes RBAC subject validation requires `apiGroup: rbac.authorization.k8s.io` for `User` and `Group` subject kinds — omitting it causes the API server to reject the manifest (`subjects[0].apiGroup: Unsupported value: "": supported values: "rbac.authorization.k8s.io"`). Added the `apiGroup: rbac.authorization.k8s.io` line to the Group subject so the binding applies cleanly. (Note: `ServiceAccount` subjects, mentioned later in the same section, correctly use an empty/absent apiGroup, so no change was needed for that case.)

## Review Notes
- All other manifests are correct: the `Role` (core `""` and `apps` API groups with valid resources/verbs), the `ClusterRole` (`apiGroups: ["*"]`, `resources: ["*"]`, read-only verbs), and the `roleRef` blocks (which correctly use `apiGroup: rbac.authorization.k8s.io`).
- CLI commands are accurate: `kubectl create namespace`, `kubectl label/annotate namespace --overwrite`, `kubectl auth can-i ... --namespace=`, and `kubectl config set-context --cluster --user --namespace` all match current kubectl syntax.
- Conceptual claims are accurate: Roles/RoleBindings are namespace-scoped while ClusterRoles are cluster-scoped; namespaces provide resource-scope isolation but are not a hard security boundary on their own (the post appropriately layers NetworkPolicies and quotas).
- Minor, non-blocking: granting `secrets` with full CRUD to a broad dev group and a `ClusterRole` with `resources: ["*"]` that includes secrets is intentionally permissive for a debugging-read role — fine as written, but teams with stricter requirements may want to exclude secrets from the cluster-wide read role. This is a design caveat, not an error.
