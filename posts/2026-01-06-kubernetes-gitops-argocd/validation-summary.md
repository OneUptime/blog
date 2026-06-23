# Validation Summary: How to Implement GitOps with ArgoCD in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (Argo CD)
- Kubernetes
- GitOps
- Kustomize
- Helm
- ApplicationSets (list, git, cluster generators)
- ArgoCD AppProject / RBAC
- Sync waves and hooks
- Sealed Secrets
- External Secrets Operator
- argocd-vault-plugin (sidecar CMP)
- ArgoCD Notifications (Slack)

## Sources Consulted
- Argo CD official docs — Declarative Setup / Applications: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD official docs — Config Management Plugins (sidecar CMP): https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD issue — drop support for argocd-cm Config Management Plugins in favor of sidecars: https://github.com/argoproj/argo-cd/issues/8117
- Argo CD ApplicationSet generators docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD Sync Waves & Hooks docs: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Notifications docs: https://argocd-notifications.readthedocs.io/
- argocd-vault-plugin installation docs: https://argocd-vault-plugin.readthedocs.io/en/stable/installation/
- External Secrets Operator API spec (v1 GA / v1.0.0): https://external-secrets.io/latest/api/externalsecret/
- Kustomize documentation: https://kubectl.docs.kubernetes.io/references/kustomize/

## Issues Found
- **External Secrets Operator API version outdated.** The `ExternalSecret` example used `apiVersion: external-secrets.io/v1beta1`. External Secrets Operator reached GA with v1.0.0 and `external-secrets.io/v1` is now the current/recommended API version (v1beta1 is still served for backward compatibility but is superseded). The spec fields (`refreshInterval`, `secretStoreRef`, `target`, `data` with `secretKey`/`remoteRef`) are identical between versions, so the apiVersion was updated to `external-secrets.io/v1` to reflect the current GA API. No other changes were needed.

## Review Notes
- The installation commands (`kubectl apply` of the stable manifest, Helm chart `argo/argo-cd` with `configs.params."server\.insecure"=true`, `argocd-initial-admin-secret` retrieval, port-forward to `:443`) are all current and correct.
- `argocd app create` flags (`--sync-policy automated`, `--auto-prune`, `--self-heal`, `--dest-server`, `--dest-namespace`) are valid and current.
- The `Application` / `AppProject` / `ApplicationSet` manifests use the correct `argoproj.io/v1alpha1` API group/version and valid field structure. The fasttemplate placeholders (`{{env}}`, `{{path.basename}}`, `{{name}}`, `{{server}}`) are correct for the default (non-Go-template) ApplicationSet rendering.
- Sync wave annotations (`argocd.argoproj.io/sync-wave`), hook annotations (`argocd.argoproj.io/hook`, `hook-delete-policy`), and hook phases (PreSync/Sync/PostSync/SyncFail) are accurate.
- The Vault Plugin section correctly reflects that the legacy `spec.source.plugin.name` / argocd-cm Config Management Plugin approach was removed in favor of sidecar-based CMPs (deprecated v2.5, legacy support subsequently removed), and that sidecar CMPs must NOT be referenced by name (auto-discovery). Verified against the official Argo CD config-management-plugins docs and issue #8117.
- Sync option examples (`CreateNamespace=true`, `Validate=true`, `PruneLast=true`, `ServerSideApply=true`) and the `ignoreDifferences` with `jsonPointers` syntax are all valid.
- Cluster secret format (`argocd.argoproj.io/secret-type: cluster` label with `name`/`server`/`config` JSON) and `argocd cluster add CONTEXT --name NAME` are correct.
- Notifications ConfigMap/Secret names (`argocd-notifications-cm`, `argocd-notifications-secret`) and trigger/template/subscription syntax are accurate.
