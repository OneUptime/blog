# Validation Summary: How to Configure RBAC per Namespace on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, kube-apiserver extraArgs)
- Kubernetes RBAC (Role, ClusterRole, RoleBinding, ClusterRoleBinding)
- Kubernetes API resources (pods, deployments, services, secrets, configmaps, etc.)
- ServiceAccounts
- kubectl CLI (auth can-i, create rolebinding, get rolebindings)
- OIDC (OpenID Connect) authentication for kube-apiserver
- Bash scripting

## Sources Consulted
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Authorization Overview: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- kubectl auth can-i: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-can-i-em-
- kubectl create rolebinding: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-rolebinding-em-
- kube-apiserver OIDC flags: https://kubernetes.io/docs/reference/access-authn-authz/authentication/#openid-connect-tokens
- Talos Linux config reference (cluster.apiServer.extraArgs): https://www.talos.dev/latest/reference/configuration/
- Default RBAC roles & bindings (view, edit, admin): https://kubernetes.io/docs/reference/access-authn-authz/rbac/#user-facing-roles

## Issues Found

1. **Reader role did not actually exclude secrets (significant correctness bug).**
   The original Read-Only Role had two rules:
   ```yaml
   - apiGroups: ["", "apps", "batch", "networking.k8s.io"]
     resources: ["*"]
     verbs: ["get", "list", "watch"]
   - apiGroups: [""]
     resources: ["secrets"]
     verbs: []
   ```
   The comment claimed this "explicitly excluded secrets from read access." This is incorrect — Kubernetes RBAC is purely additive and has no deny rules. The first rule grants `get`, `list`, `watch` on all resources in the core API group (including `secrets`), and the second rule with `verbs: []` is a no-op. As written, readers WOULD have been able to read secrets.

   **Fix:** Replaced the wildcard rule with explicit per-API-group resource enumerations that omit `secrets` (mirroring how Kubernetes' built-in `view` ClusterRole excludes secrets). Added a short note that RBAC is additive and you must enumerate to exclude.

2. **Misleading comment on the pods rule in the Developer Role.**
   The comment read: `# Manage pods (but not delete, to prevent accidental deletions)`, but the rule only granted `get`, `list`, `watch` — i.e., read-only. The verbs didn't allow create/update/patch either, so the parenthetical about "no delete" was misleading (the rule had no write verbs at all).

   **Fix:** Updated the comment to accurately describe the rule: `# Read pod state (developers create pods via Deployments, not directly)`. This matches the actual verbs and reflects the standard practice that developers shouldn't manipulate pods directly when Deployments manage them.

## Review Notes
- The `namespace-admin` Role grants RBAC management within the namespace (`roles`, `rolebindings`). This is technically correct but worth noting operationally: a namespace-admin can grant themselves any permission within that namespace by editing bindings. The post doesn't claim otherwise, and this is the standard tradeoff for delegated namespace administration.
- The `api-service-role` correctly uses `resourceNames` with the `get` verb for secrets. Note that `resourceNames` does not work with `list` or `watch` verbs — the post does not attempt that, so it's fine.
- The Talos OIDC `extraArgs` are correctly specified without the `--` prefix (Talos strips the prefix before passing them to kube-apiserver). The four flags (`oidc-issuer-url`, `oidc-client-id`, `oidc-username-claim`, `oidc-groups-claim`) are valid kube-apiserver options.
- The `kubectl auth can-i --list` syntax is correct (available since Kubernetes 1.17).
- The `setup-namespace-rbac.sh` script references `namespace-admin` as a ClusterRole, but earlier in the post `namespace-admin` is defined only as a namespaced Role. To use `--clusterrole=namespace-admin` in `kubectl create rolebinding`, the reader would need to first define a ClusterRole of that name (similar to the `namespace-developer` ClusterRole shown earlier). This isn't strictly wrong — the script section is illustrative — but readers following along may need to create the corresponding ClusterRole first.
- The post doesn't mention RBAC privilege escalation prevention (the `escalate` and `bind` verbs on roles/rolebindings). Namespace admins who can create RoleBindings are subject to Kubernetes' built-in escalation prevention, which only allows them to grant permissions they themselves hold. This is worth being aware of operationally but isn't a correctness issue.
