# Validation Summary: How to Configure Git LFS Support in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD repository configuration
- Git Large File Storage (Git LFS)
- Kubernetes Deployments, Secrets, ConfigMaps, and emptyDir volumes
- Kustomize ConfigMapGenerator
- GitHub and GitLab LFS authentication and quota behavior

## Sources Consulted
- Argo CD repository Secret examples, including `enableLfs`: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-repositories-yaml/
- Argo CD `argocd repo add` command reference, including `--enable-lfs` and `--upsert`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd-cm` example for `timeout.reconciliation`: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD Git configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/git_configuration/
- GitHub Git LFS billing and free quota documentation: https://docs.github.com/en/billing/concepts/product-billing/git-lfs
- GitLab Git LFS documentation: https://docs.gitlab.com/topics/git/lfs/
- GitLab personal access token scopes: https://docs.gitlab.com/user/profile/personal_access_tokens/
- Kubernetes `emptyDir` volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- The post claimed Argo CD supports a global `ARGOCD_GIT_LFS_ENABLED` repo-server environment variable. I could not verify this in current official Argo CD documentation, while official docs document per-repository `enableLfs` and CLI `--enable-lfs`. Replaced the global section with the supported `argocd repo add --enable-lfs` workflow.
- The troubleshooting section referenced checking global LFS enablement in the repo-server Deployment. Removed that check and kept the supported repository Secret check.
- The LFS authentication section said SSH repository credentials are reused by LFS. GitLab documents that LFS uses HTTPS by default even when Git uses SSH, with pure SSH support only in newer GitLab versions. Updated the wording to distinguish HTTPS repositories from provider-dependent SSH behavior.
- The cache section implied `timeout.reconciliation` directly avoids repeated LFS downloads. Argo CD documents it as the reconciliation timeout and repo-server cached Git revision expiration. Updated the wording and snippet comment to reflect that behavior.
- The GitHub bandwidth limit was outdated. GitHub Free currently includes 10 GiB of Git LFS bandwidth per billing cycle, not 1 GB per month. Updated the quota statement.

## Review Notes
- The per-repository `enableLfs: "true"` Secret examples match official Argo CD repository Secret examples.
- The Kubernetes Deployment, Secret, ConfigMap, and `emptyDir.sizeLimit` snippets are syntactically valid.
- The Kustomize `configMapGenerator.files` example is valid when `kustomization.yaml` is in the same directory as `model-metadata.json`, as shown in the example tree.
