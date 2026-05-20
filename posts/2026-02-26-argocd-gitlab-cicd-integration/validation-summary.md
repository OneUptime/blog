# Validation Summary: How to Integrate ArgoCD with GitLab CI/CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- GitLab CI/CD
- Kubernetes
- GitOps
- Kustomize
- Docker container builds
- GitLab Container Registry

## Sources Consulted
- Argo CD app create command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_create/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD app wait command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD local user management: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD account generate-token command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD FAQ on repository polling interval: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/
- GitLab environments documentation: https://docs.gitlab.com/ci/environments/
- GitLab pipelines documentation for `[skip ci]`: https://docs.gitlab.com/ci/pipelines/

## Issues Found
- The merge request preview example used `--parameter image.tag=...` while creating a Kustomize-based Argo CD application. Argo CD documents `--kustomize-image` for Kustomize image overrides, so the command was changed to `--kustomize-image $IMAGE_NAME=$IMAGE_NAME:mr-$CI_MERGE_REQUEST_IID`.
- The reusable `.argocd-verify` template used `jq`, but the shared `.argocd-base` setup installed only `curl`. The base package installation now includes `jq` so the verify template can run.
- The GitLab protected variable note said protected variables are only available on protected branches. GitLab documents protected variables as available to protected branches or protected tags, so the wording was corrected.

## Review Notes
The remaining snippets are representative pipeline patterns and assume project-specific setup such as runner Docker support, deployment repository credentials, existing Kustomize paths, and Argo CD project permissions. The Argo CD webhook secret example uses a base64 value under `data`, which is valid Kubernetes Secret syntax; Argo CD documentation also shows `stringData` as a convenient alternative.
