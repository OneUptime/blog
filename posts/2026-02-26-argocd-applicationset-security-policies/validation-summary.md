# Validation Summary: How to Configure ApplicationSet Security Policies in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Argo CD AppProject
- Argo CD RBAC
- Kubernetes ResourceQuota
- kubectl

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet Resource Modification Policies: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD argocd-cmd-params-cm Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD ApplicationSet Controller Command Reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/server-commands/argocd-applicationset-controller/
- Argo CD RBAC Validate Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Kubernetes ResourceQuota Documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- ApplicationSet RBAC examples used `argocd/frontend-*` as the object. Updated them to `team-frontend/frontend-*` because ApplicationSet RBAC objects use the generated Application project and ApplicationSet name pattern.
- `argocd-cmd-params-cm` used incorrect keys `applicationsetcontroller.allowed-scm-providers` and `applicationsetcontroller.enable-scm-providers`. Updated them to `applicationsetcontroller.allowed.scm.providers` and `applicationsetcontroller.enable.scm.providers`.
- The SCM provider restriction example implied the setting restricts GitHub organizations. Updated wording and example URL because Argo CD's allowed SCM providers setting restricts custom SCM provider API URLs.
- The AppProject privilege escalation example repeated `destinations` and used an unsupported `deny: true` destination entry. Replaced it with an allow-list-only destination that excludes `kube-system`.
- The ResourceQuota example claimed to limit Applications but used `count/applicationsets.argoproj.io`. Updated it to `count/applications.argoproj.io` and added a separate valid quota for ApplicationSet CRs.
- Removed the invalid `applicationsetcontroller.policy` / `maxApplications` example because ApplicationSet controller policy supports `sync`, `create-only`, `create-update`, and `create-delete`, not a maximum generated application count.
- Replaced the wildcard notification annotation in `preservedFields` with an exact annotation key, matching the documented field behavior.
- Replaced `argocd admin settings resource-overrides list` as an audit-log example because that command is for troubleshooting resource overrides, not audit logging.
- Updated `argocd admin settings rbac validate` to include `--namespace argocd`, which is required when validating the live RBAC ConfigMap.

## Review Notes
All YAML snippets were parsed successfully after the corrections. ApplicationSet deletion controls have an important caveat: `applicationsSync: create-update` prevents controller-driven deletion during reconciliation, but it does not by itself preserve generated Applications in every ApplicationSet deletion scenario involving owner references.
