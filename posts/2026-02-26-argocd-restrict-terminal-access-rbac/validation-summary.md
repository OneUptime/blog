# Validation Summary: How to Restrict Terminal Access with RBAC in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Argo CD web-based terminal
- Argo CD CLI
- Kubernetes ConfigMaps
- Kubernetes RBAC for pod exec
- kubectl

## Sources Consulted
- Argo CD RBAC Configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/rbac/
- Argo CD Web-based Terminal documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/web_based_terminal/
- Argo CD `argocd proj role add-policy` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_add-policy/
- Argo CD `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_create-token/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_validate/
- Kubernetes `kubectl logs` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl edit` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_edit/

## Issues Found
- The post described the exec RBAC object format as `<project>/<namespace>/<application>`. Argo CD's default application-specific policy object format is `<project>/<application>`. Updated the format and table example to match the documented default.
- The post said no user has exec permissions by default, including the built-in admin role. Argo CD documents `role:admin` as an unrestricted built-in role, so this was too broad. Updated the wording and example to recommend granting exec to a limited role instead of assigning `role:admin`.
- The break-glass example used `argocd account update-password --account emergency-user`, which changes a local account password and does not assign an RBAC role. Replaced it with editing `argocd-rbac-cm` to add a temporary `g, user@example.com, role:emergency-responder` mapping.
- The project role policy command omitted `-r exec`, so the policy would default to the `applications` resource. Added `-r exec` and changed the object to `'*'` so the generated project-role policy grants `exec/create` within the project.
- The `argocd admin settings rbac can` examples used the wrong argument order. Updated them from `role exec create object` to the documented `role create exec object` order.

## Review Notes
The remaining Argo CD RBAC policy snippets, `exec.enabled: "true"` requirement, deny precedence explanation, token expiration flag, and policy validation command align with current Argo CD documentation. The local environment did not have the `argocd` CLI installed, so CLI verification was performed against official command references instead of local `--help` output.
