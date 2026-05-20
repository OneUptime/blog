# Validation Summary: How to Debug 'Authentication Required' Errors for Repos in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Secrets
- GitHub personal access tokens and GitHub App credentials
- GitLab personal access tokens
- SSH Git repository authentication

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Declarative Setup documentation for repository and repo-creds secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_repo_get/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repocreds` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repocreds/
- GitHub REST API authentication documentation: https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api
- GitLab REST API authentication documentation: https://docs.gitlab.com/api/rest/authentication/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post used `argocd repo get <url> --refresh`, but current Argo CD command documentation requires a string value and lists `hard` as the supported value. Updated both examples to `argocd repo get <url> --refresh hard`.
- The SSH debugging commands implied that Argo CD SSH repository private keys are mounted under `/app/config/ssh/` and could be tested with a plain `ssh` command inside the repo-server pod. Argo CD stores repository credentials in repository or repo-creds secrets, while `/app/config/ssh` is used for SSH known-host configuration. Replaced those checks with `argocd repo get ... --refresh hard`, a repository secret `sshPrivateKey` check, and repo-server SSH log filtering.
- The GitHub API token examples used `Authorization: token ...`. GitHub still documents that this can work in most cases, but the current primary documentation uses `Authorization: Bearer ...`. Updated the examples to the current documented form.

## Review Notes
The remaining Argo CD repository secret labels, `stringData` usage, repo credential template prefix matching, GitHub App minimum `Contents: Read-only` permission, GitLab `PRIVATE-TOKEN` API header, and Kubernetes Secret encoding guidance are consistent with the consulted documentation. The local environment did not have the `argocd` CLI installed, so command validation was performed against official Argo CD command reference pages rather than local `--help` output.
