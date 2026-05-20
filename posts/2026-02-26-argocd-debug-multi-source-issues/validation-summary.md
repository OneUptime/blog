# Validation Summary: How to Debug Multi-Source Application Issues in ArgoCD

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Argo CD multi-source Applications
- Argo CD CLI
- Kubernetes and kubectl
- Helm
- Kustomize
- Git
- jq

## Sources Consulted
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_create/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/
- Argo CD `argocd-cmd-params-cm` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Kubernetes `kubectl logs` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Helm command documentation: https://helm.sh/docs/helm/
- Git `git clone` documentation: https://git-scm.com/docs/git-clone.html

## Issues Found
- Corrected the repository-access section to distinguish public repository reachability from private repository credential configuration. Public repositories do not necessarily need preconfigured Argo CD credentials.
- Replaced an HTTPS repository URL combined with `--ssh-private-key-path` with an SSH Git URL, matching Argo CD repo credential examples.
- Replaced the duplicate-resource detection command that used unsupported `argocd app manifests -o json` output with a check for Argo CD's `RepeatedResourceWarning` condition.
- Clarified that when multiple sources produce the same resource, Argo CD uses the last source in the `sources` list and emits a warning.
- Updated the repo-server log command for multiple replicas to use a label selector with `--all-containers`, matching kubectl's documented log selection pattern.
- Reordered the Helm example so the repository is added before rendering `test-repo/my-chart`.
- Replaced `git archive --remote` for checking a GitHub path with a shallow branch clone plus `test -e`, which is more broadly reliable for GitHub-style repositories.
- Replaced the invalid `reposerver.timeout.seconds` config key with the documented `controller.repo.server.timeout.seconds` and `server.repo.server.timeout.seconds` keys.

## Review Notes
The post is technically relevant and useful. The examples remain generic placeholders, so users still need to substitute their own repository URLs, chart names, namespaces, and application names.
