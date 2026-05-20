# Validation Summary: How to Handle kubectl vs ArgoCD Applying Same Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- GitOps
- Kubernetes RBAC
- Kyverno
- HorizontalPodAutoscaler
- external-dns

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Diffing Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Resource Tracking: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_tracking/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/rbac/
- Kubernetes RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kyverno Validate Rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Variables: https://kyverno.io/docs/policy-types/cluster-policy/variables/
- Kyverno Policy Settings: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/

## Issues Found
- The `argocd app diff my-app --local ./manifests/` comment described the command as showing detailed full resource contents. The official command reference says `--local` compares the live app to local manifests, so the comment was corrected.
- The Kyverno example used `spec.validationFailureAction`, which Kyverno now marks as deprecated. It was moved to `rules[*].validate.failureAction`.
- The Kyverno example matched `app.kubernetes.io/managed-by=argocd`, which is not Argo CD's default resource-tracking label. It now checks for `argocd.argoproj.io/tracking-id` or the default `app.kubernetes.io/instance` label.
- The Kyverno example uses admission user information, so `background: false` was added. `emitWarning: true` was also added so `Audit` mode can return admission warnings.

## Review Notes
- The Argo CD CLI commands and Application snippets are consistent with current Argo CD documentation.
- `argocd` and `kubectl` were not installed in the local workspace, so CLI verification was performed against official command references rather than local `--help` output.
