# Validation Summary: How to Handle Security Incidents in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kubernetes NetworkPolicy
- Kubernetes Secrets and ConfigMaps
- Argo CD Notifications
- Argo CD CLI
- Kyverno
- jq
- Git

## Sources Consulted
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/commands/argocd_app_set/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_rollback/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd account delete-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_delete-token/
- Argo CD admin password and admin account FAQ: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD `argocd-secret.yaml` reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-secret-yaml/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/notifications/triggers/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno selecting resources documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings

## Issues Found
- The repository re-add example used an HTTPS Git URL with `--ssh-private-key-path`. Changed the URL to SSH form (`git@github.com:org/config-repo.git`) to match Argo CD's documented SSH private key examples.
- The recent sync investigation command piped pretty-printed JSON objects into shell `sort`, which would sort individual lines and corrupt the intended output. Changed it to sort inside `jq` with `map(...) | sort_by(.syncTime // "")`.
- The API token deletion example used `argocd account delete-token <account> <token-id>`, but the CLI expects the account to be provided with `--account`. Changed it to `argocd account delete-token --account <account> <token-id>`.
- The Kyverno policy used deprecated top-level `spec.validationFailureAction` and direct `match.resources`. Updated the example to put `failureAction: Enforce` under `validate` and use `match.any[].resources`, matching current Kyverno guidance.

## Review Notes
The incident-response flow and remaining Argo CD, Kubernetes, and Git commands are generally accurate. The Kyverno `ClusterPolicy` API is now a legacy policy type in recent Kyverno documentation, but it remains documented and usable; future updates could consider the newer Kyverno policy types where appropriate.
