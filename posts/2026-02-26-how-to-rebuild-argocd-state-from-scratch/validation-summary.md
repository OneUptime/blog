# Validation Summary: How to Rebuild ArgoCD State from Scratch

## Status
validated

## Post Type
Tutorial / disaster recovery guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Application and AppProject custom resources
- Argo CD repository and cluster secrets
- Argo CD CLI
- kubectl
- Velero backups
- Bash
- YAML

## Sources Consulted
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Velero Schedule API documentation: https://velero.io/docs/v1.17/api-types/schedule/
- OneUptime linked article page: https://oneuptime.com/blog/post/2026-02-26-how-to-export-and-import-argocd-application-state/view

## Issues Found
- The `argocd-cm` and `argocd-rbac-cm` examples did not include the `app.kubernetes.io/part-of: argocd` label. Argo CD's declarative setup documentation warns that ConfigMaps must use this label for Argo CD to consume them, so both ConfigMap examples were updated with the required label.
- The Velero backup schedule used a namespace-wide resource list together with `labelSelector: app.kubernetes.io/part-of=argocd`. Velero applies the label selector to included objects, which can exclude Argo CD Applications, AppProjects, repository secrets, and cluster secrets that do not carry that label. The selector was removed so the listed Argo CD resource types in the `argocd` namespace are backed up.

## Review Notes
- The commands and manifests were reviewed against current upstream documentation. The Argo CD CLI and kubectl binaries were not installed in the local environment, so CLI verification was performed against official command references rather than local `--help` output.
- The example `argocd cluster add staging-cluster` and `production-cluster` commands assume those names are kubeconfig context names, which matches the Argo CD CLI contract.
- The OIDC `clientSecret: $oidc.okta.clientSecret` pattern is valid when the referenced secret key exists in `argocd-secret`; the post presents it as a representative rebuild example rather than a complete SSO setup.
